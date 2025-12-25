const { db } = require('../config/firebase');

const WALLET_COLLECTION = 'wallets';
const TRANSACTION_COLLECTION = 'wallet_transactions';

class WalletService {
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
        throw new Error(`Insufficient funds in ${walletType} wallet`);
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
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        createdAt: new Date()
      });

      return newBalance;
    });
  }

  async transferBalance(userId, amount, fromType, toType) {
    const walletRef = db.collection(WALLET_COLLECTION).doc(userId);
    
    return db.runTransaction(async (t) => {
      const doc = await t.get(walletRef);
      if (!doc.exists) {
        throw new Error('Wallet not found');
      }

      const data = doc.data();
      const fromField = `${fromType}Balance`;
      const toField = `${toType}Balance`;

      const currentFromBalance = data[fromField] || 0;
      
      if (currentFromBalance < amount) {
        throw new Error(`Insufficient funds in ${fromType} wallet`);
      }

      const newFromBalance = currentFromBalance - amount;
      const newToBalance = (data[toField] || 0) + amount;

      t.update(walletRef, { 
        [fromField]: newFromBalance,
        [toField]: newToBalance,
        updatedAt: new Date()
      });

      // Ledger for Debit
      const debitRef = db.collection(TRANSACTION_COLLECTION).doc();
      t.set(debitRef, {
        userId,
        type: 'debit',
        amount,
        walletType: fromType,
        description: `Transfer to ${toType}`,
        balanceBefore: currentFromBalance,
        balanceAfter: newFromBalance,
        createdAt: new Date()
      });

      // Ledger for Credit
      const creditRef = db.collection(TRANSACTION_COLLECTION).doc();
      t.set(creditRef, {
        userId,
        type: 'credit',
        amount,
        walletType: toType,
        description: `Transfer from ${fromType}`,
        balanceBefore: data[toField] || 0,
        balanceAfter: newToBalance,
        createdAt: new Date()
      });

      return { [fromType]: newFromBalance, [toType]: newToBalance };
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
        balanceBefore: mainBalance,
        balanceAfter: newMainBalance,
        createdAt: new Date()
      });

      return { newSourceBalance, newMainBalance };
    });
  }

  async getHistory(userId) {
    const snapshot = await db.collection(TRANSACTION_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = new WalletService();
