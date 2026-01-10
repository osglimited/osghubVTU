const { db } = require('../config/firebase');
const walletService = require('./walletService');
const cashbackService = require('./cashbackService');
const referralService = require('./referralService');

const TRANSACTION_COLLECTION = 'transactions';

class TransactionService {
  
  async initiateTransaction(userId, type, amount, details, requestId) {
    const providerName = 'IACafe';
    const idempotencyKey = requestId || `REQ-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
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

    // 2. Ensure wallet exists & has sufficient balance (do not debit yet)
    await walletService.createWallet(userId);
    const bal = await walletService.getBalance(userId);
    if ((bal.mainBalance || 0) < amount) {
      throw new Error('Insufficient funds');
    }

    // 3. Create Transaction Record (Pending)
    const transactionRef = db.collection(TRANSACTION_COLLECTION).doc();
    const transactionData = {
      id: transactionRef.id,
      userId,
      type,
      amount,
      details,
      requestId: idempotencyKey,
      status: 'pending',
      createdAt: new Date(),
      provider: providerName
    };
    await transactionRef.set(transactionData);

    // 4. Debit Wallet
    try {
      await walletService.debitWallet(userId, amount, 'main', `${type} Purchase: ${details.phone}`);
    } catch (error) {
      await transactionRef.update({ status: 'failed', failureReason: 'Debit failed' });
      throw error;
    }

    // 5. Call Provider
    try {
      const providerService = require('./providerService');
      let result;
      
      if (type === 'airtime') {
        result = await providerService.purchaseAirtime(idempotencyKey, details.phone, amount, details.network || details.networkId);
      } else if (type === 'data') {
        result = await providerService.purchaseData(idempotencyKey, details.phone, details.planId, details.network || details.networkId);
      } else {
        // Fallback for other types
        result = { success: false, message: 'Service not implemented yet' };
      }

      if (result.success) {
        await transactionRef.update({
          status: 'success',
          providerTransactionId: result.transactionId,
          providerResponse: result.apiResponse,
          updatedAt: new Date()
        });
        return { ...transactionData, status: 'success' };
      } else {
        // Refund if provider fails
        await walletService.creditWallet(userId, amount, 'main', `Refund: ${type} failed`);
        await transactionRef.update({
          status: 'failed',
          failureReason: result.message,
          providerResponse: result.apiResponse,
          updatedAt: new Date()
        });
        throw new Error(result.message || 'Provider transaction failed');
      }
    } catch (error) {
      // If we haven't refunded yet (unexpected crash), we should technically refund here
      // simplified for now:
      console.error('Transaction Processing Error:', error);
      throw error;
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
