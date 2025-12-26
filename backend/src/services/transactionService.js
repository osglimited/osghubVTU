const { db } = require('../config/firebase');
const walletService = require('./walletService');
const cashbackService = require('./cashbackService');
const referralService = require('./referralService');
const mockProvider = require('./providers/mockProvider');
const sublinkngProvider = require('./providers/sublinkngProvider');

const TRANSACTION_COLLECTION = 'transactions';

class TransactionService {
  
  async initiateTransaction(userId, type, amount, details, requestId) {
    const useMock = String(process.env.USE_MOCK_PROVIDER || '').toLowerCase() === 'true';
    const provider = !useMock && process.env.VTU_PROVIDER_API_KEY && process.env.VTU_PROVIDER_URL
      ? sublinkngProvider
      : mockProvider;
    const providerName = provider.name;
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

    // 2. Ensure wallet exists, Check Balance & Debit
    // We debit first. If provider fails, we refund.
    try {
      await walletService.createWallet(userId);
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
      requestId: idempotencyKey,
      status: 'pending',
      createdAt: new Date(),
      provider: providerName
    };
    await transactionRef.set(transactionData);

    // 4. Call Provider
    let providerResponse;
    try {
      if (type === 'airtime') {
        providerResponse = await provider.purchaseAirtime(details.phone, amount, details.network, idempotencyKey);
      } else if (type === 'data') {
        const planId = details.planId || details.plan || details.bundleId || details.planCode;
        providerResponse = await provider.purchaseData(details.phone, planId, details.network, idempotencyKey);
      } else {
        throw new Error('Invalid transaction type');
      }

      if (providerResponse.success) {
        // 5. Success
        await transactionRef.update({
          status: 'success',
          providerReference: providerResponse.reference,
          providerResponse: providerResponse,
          updatedAt: new Date()
        });

        // 6. Async Rewards
        // Don't await these to keep response fast
        cashbackService.processCashback(userId, amount, transactionRef.id);
        referralService.processReferral(userId, transactionRef.id);

        return { ...transactionData, status: 'success', providerReference: providerResponse.reference };
      } else {
        throw new Error(providerResponse.message || 'Provider failed');
      }

    } catch (error) {
      console.error('Provider Error:', error);
      const providerData = error?.response?.data;
      
      await walletService.creditWallet(userId, amount, 'main', `Refund: Failed ${type}`);
      
      await transactionRef.update({
        status: 'failed',
        failureReason: providerData ? JSON.stringify(providerData) : error.message,
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
