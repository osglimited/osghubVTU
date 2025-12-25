const { db } = require('../config/firebase');
const walletService = require('./walletService');
const cashbackService = require('./cashbackService');
const referralService = require('./referralService');
const provider = require('./providers/genericProvider'); // Switched to Generic Provider

const TRANSACTION_COLLECTION = 'transactions';

class TransactionService {
  
  async initiateTransaction(userId, type, amount, details, requestId) {
    // 1. Idempotency Check
    if (requestId) {
      const existing = await db.collection(TRANSACTION_COLLECTION)
        .where('requestId', '==', requestId)
        .limit(1)
        .get();
      
      if (!existing.empty) {
        return existing.docs[0].data();
      }
    }

    // 2. Check Balance & Debit
    // We debit first. If provider fails, we refund.
    try {
      await walletService.debitWallet(userId, amount, 'main', `${type} purchase`);
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }

    // 3. Create Transaction Record (Pending)
    const transactionRef = db.collection(TRANSACTION_COLLECTION).doc();
    const transactionData = {
      id: transactionRef.id,
      userId,
      type,
      amount,
      details,
      requestId,
      status: 'pending',
      createdAt: new Date(),
      provider: provider.name
    };
    await transactionRef.set(transactionData);

    // 4. Call Provider
    let providerResponse;
    try {
      if (type === 'airtime') {
        providerResponse = await provider.purchaseAirtime(details.phone, amount, details.network);
      } else if (type === 'data') {
        providerResponse = await provider.purchaseData(details.phone, details.planId, details.network);
      } else if (type === 'cable') {
        providerResponse = await provider.purchaseBill(details.smartcardNumber, amount, 'cable', details.provider);
      } else if (type === 'electricity') {
        providerResponse = await provider.purchaseBill(details.meterNumber, amount, 'electricity', details.provider);
      } else {
        throw new Error('Invalid transaction type');
      }

      // Check provider success signal (adjust based on provider response structure)
      if (providerResponse.success || providerResponse.status === 'success') {
        // 5. Success
        await transactionRef.update({
          status: 'success',
          providerReference: providerResponse.reference || providerResponse.id,
          providerResponse: providerResponse,
          updatedAt: new Date()
        });

        // 6. Async Rewards
        cashbackService.processCashback(userId, amount, transactionRef.id);
        referralService.processReferral(userId, transactionRef.id);

        return { ...transactionData, status: 'success', providerReference: providerResponse.reference };
      } else {
        throw new Error(providerResponse.message || 'Provider failed');
      }

    } catch (error) {
      // 7. Failure - Refund
      console.error('Provider Error:', error);
      
      await walletService.creditWallet(userId, amount, 'main', `Refund: Failed ${type}`);
      
      await transactionRef.update({
        status: 'failed',
        failureReason: error.message,
        updatedAt: new Date()
      });

      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async getTransactions(userId) {
    const snapshot = await db.collection(TRANSACTION_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  }
}

module.exports = new TransactionService();
