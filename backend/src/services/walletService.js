const { db } = require('../config/firebase');

const WALLET_COLLECTION = 'wallets';
const TRANSACTION_COLLECTION = 'wallet_transactions';

class WalletService {
  _genRef(prefix = 'WTX') {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${ts}-${rnd}`;
  }
  /**
   * Initialize wallet for a new user
   */
  async createWallet(userId) {
    const walletRef = db.collection(WALLET_COLLECTION).doc(userId);
    const doc = await walletRef.get();
    
    if (!doc.exists) {
      await walletRef.set({
        mainBalance: 0,
        cashbackBalance: 0,
        referralBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return walletRef.get(); // Return the wallet data
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId) {
    const walletRef = db.collection(WALLET_COLLECTION).doc(userId);
    const doc = await walletRef.get();
    
    if (!doc.exists) {
      // Auto-create if not exists (lazy initialization)
      await this.createWallet(userId);
      return { mainBalance: 0, cashbackBalance: 0, referralBalance: 0 };
    }
    return doc.data();
  }

  /**
   * Credit wallet (internal use or funding)
   */
  async creditWallet(userId, amount, walletType = 'main', description = 'Credit') {
    const walletRef = db.collection(WALLET_COLLECTION).doc(userId);
    
    return db.runTransaction(async (t) => {
      const doc = await t.get(walletRef);
      if (!doc.exists) {
        throw new Error('Wallet not found');
      }

      const data = doc.data();
      const field = `${walletType}Balance`;
      const newBalance = (data[field] || 0) + amount;

      t.update(walletRef, { 
        [field]: newBalance,
        updatedAt: new Date()
      });

      // Add to ledger
      const transactionRef = db.collection(TRANSACTION_COLLECTION).doc();
      t.set(transactionRef, {
        userId,
        type: 'credit',
        amount,
        walletType,
        description,
        status: 'success',
        reference: this._genRef('CR'),
        balanceBefore: data[field] || 0,
        balanceAfter: newBalance,
        createdAt: new Date()
      });

      return newBalance;
    });
  }

  /**
   * Debit wallet
   */
  async debitWallet(userId, amount, walletType = 'main', description = 'Debit') {
    const walletRef = db.collection(WALLET_COLLECTION).doc(userId);
    
    return db.runTransaction(async (t) => {
      const doc = await t.get(walletRef);
      if (!doc.exists) {
        throw new Error('Wallet not found');
      }

      const data = doc.data();
      const field = `${walletType}Balance`;
      const currentBalance = data[field] || 0;

      if (currentBalance < amount) {
        throw new Error('Insufficient funds');
      }

      const newBalance = currentBalance - amount;

      t.update(walletRef, { 
        [field]: newBalance,
        updatedAt: new Date()
      });

      // Add to ledger
      const transactionRef = db.collection(TRANSACTION_COLLECTION).doc();
      t.set(transactionRef, {
        userId,
        type: 'debit',
        amount,
        walletType,
        description,
        status: 'success',
        reference: this._genRef('DB'),
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        createdAt: new Date()
      });

      return newBalance;
    });
  }

  /**
   * Transfer from Cashback/Referral to Main
   */
  async transferToMain(userId, amount, fromWalletType) {
    if (!['cashback', 'referral'].includes(fromWalletType)) {
      throw new Error('Invalid source wallet type');
    }

    const walletRef = db.collection(WALLET_COLLECTION).doc(userId);

    return db.runTransaction(async (t) => {
      const doc = await t.get(walletRef);
      if (!doc.exists) {
        throw new Error('Wallet not found');
      }

      const data = doc.data();
      const sourceField = `${fromWalletType}Balance`;
      const mainField = 'mainBalance';

      const sourceBalance = data[sourceField] || 0;
      const mainBalance = data[mainField] || 0;

      if (sourceBalance < amount) {
        throw new Error(`Insufficient ${fromWalletType} funds`);
      }

      const newSourceBalance = sourceBalance - amount;
      const newMainBalance = mainBalance + amount;

      t.update(walletRef, {
        [sourceField]: newSourceBalance,
        [mainField]: newMainBalance,
        updatedAt: new Date()
      });

      // Ledger for Source Debit
      const debitRef = db.collection(TRANSACTION_COLLECTION).doc();
      t.set(debitRef, {
        userId,
        type: 'debit',
        amount,
        walletType: fromWalletType,
        description: `Transfer to Main Wallet`,
        status: 'success',
        reference: this._genRef('TR-D'),
        balanceBefore: sourceBalance,
        balanceAfter: newSourceBalance,
        createdAt: new Date()
      });

      // Ledger for Main Credit
      const creditRef = db.collection(TRANSACTION_COLLECTION).doc();
      t.set(creditRef, {
        userId,
        type: 'credit',
        amount,
        walletType: 'main',
        description: `Transfer from ${fromWalletType}`,
        status: 'success',
        reference: this._genRef('TR-C'),
        balanceBefore: mainBalance,
        balanceAfter: newMainBalance,
        createdAt: new Date()
      });

      return { newSourceBalance, newMainBalance };
    });
  }

  async getHistory(userId) {
    try {
      const snapshot = await db.collection(TRANSACTION_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      // Fallback without composite index: fetch by userId and sort in memory
      const snapshot = await db.collection(TRANSACTION_COLLECTION)
        .where('userId', '==', userId)
        .limit(50)
        .get();
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => {
        const ta = a.createdAt?._seconds ? a.createdAt._seconds : new Date(a.createdAt).getTime() / 1000;
        const tb = b.createdAt?._seconds ? b.createdAt._seconds : new Date(b.createdAt).getTime() / 1000;
        return tb - ta;
      });
      return items.slice(0, 20);
    }
  }
}

module.exports = new WalletService();
