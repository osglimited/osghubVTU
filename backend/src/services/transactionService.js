const { db } = require('../config/firebase');
const walletService = require('./walletService');
const cashbackService = require('./cashbackService');
const referralService = require('./referralService');

const TRANSACTION_COLLECTION = 'transactions';

class TransactionService {
  
  async initiateTransaction(userId, type, amount, details, requestId) {
    const providerName = 'DISABLED';
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

    // Provider integration intentionally disabled
    await transactionRef.update({
      status: 'failed',
      failureReason: 'Provider disabled',
      updatedAt: new Date()
    });
    const err = new Error('Service temporarily unavailable: provider disabled');
    err.statusCode = 503;
    err.providerError = null;
    throw err;

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
