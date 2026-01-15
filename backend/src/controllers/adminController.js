const { db, auth } = require('../config/firebase');

const SETTINGS_DOC = 'settings/global';

const updateSettings = async (req, res) => {
  try {
    const { dailyReferralBudget, cashbackEnabled, pricing } = req.body;
    
    await db.doc(SETTINGS_DOC).set({
      dailyReferralBudget,
      cashbackEnabled,
      pricing,
      updatedAt: new Date()
    }, { merge: true });

    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const doc = await db.doc(SETTINGS_DOC).get();
    res.json(doc.exists ? doc.data() : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const transactions = snapshot.docs.map(doc => doc.data());
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const walletService = require('../services/walletService');

const creditWallet = async (req, res) => {
  try {
    const { userId, amount, walletType, description } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Valid amount is required' });
    const wtype = ['main', 'cashback', 'referral'].includes(walletType) ? walletType : 'main';
    await walletService.createWallet(userId);
    const newBalance = await walletService.creditWallet(userId, amt, wtype, description || 'Admin Credit');
    res.json({ success: true, userId, newBalance, walletType: wtype });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  updateSettings,
  getSettings,
  getAllTransactions,
  creditWallet
};

const listUsers = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    let baseUsers = [];
    try {
      const authList = await auth.listUsers(limit);
      baseUsers = authList.users.map(u => ({
        id: u.uid,
        uid: u.uid,
        displayName: u.displayName || '',
        email: u.email || '',
        phone: u.phoneNumber || '',
        joinedAt: u.metadata?.creationTime || '',
        status: u.disabled ? 'inactive' : 'active',
      }));
    } catch {
      const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(limit).get();
      baseUsers = snap.docs.map((d) => {
        const x = d.data() || {};
        return {
          id: d.id,
          uid: d.id,
          displayName: x.displayName || x.name || '',
          email: x.email || '',
          phone: x.phone || x.phoneNumber || '',
          joinedAt: x.createdAt || '',
          status: x.disabled ? 'inactive' : 'active',
        };
      });
    }
    const balances = {};
    try {
      const names = ['wallets', 'user_wallets'];
      for (const n of names) {
        const snap = await db.collection(n).limit(1000).get();
        for (const d of snap.docs) {
          const x = d.data() || {};
          const email = String(d.id || x.user_email || x.userEmail || '').toLowerCase();
          const mb = Number(x.mainBalance || x.main_balance || x.balance || 0);
          const cb = Number(x.cashbackBalance || x.cashback_balance || 0);
          const rb = Number(x.referralBalance || x.referral_balance || 0);
          balances[email] = { main_balance: mb, cashback_balance: cb, referral_balance: rb };
        }
      }
    } catch {}
    const users = baseUsers.map(u => {
      const emailKey = String(u.email || '').toLowerCase();
      const bal = balances[emailKey];
      return {
        ...u,
        walletBalance: bal ? Number(bal.main_balance || 0) : 0,
        cashbackBalance: bal ? Number(bal.cashback_balance || 0) : 0,
        referralBalance: bal ? Number(bal.referral_balance || 0) : 0,
      };
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const promoteToAdmin = async (req, res) => {
  try {
    const { uid, email } = req.body || {};
    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(uid);
    } else if (email) {
      userRecord = await auth.getUserByEmail(email);
    } else {
      return res.status(400).json({ error: 'uid or email is required' });
    }

    const targetUid = userRecord.uid;

    const existingClaims = userRecord.customClaims || {};
    const newClaims = { ...existingClaims, admin: true };
    await auth.setCustomUserClaims(targetUid, newClaims);

    const userRef = db.collection('users').doc(targetUid);
    await userRef.set(
      {
        role: 'admin',
        updatedAt: new Date(),
      },
      { merge: true }
    );

    res.json({ success: true, uid: targetUid, email: userRecord.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.listUsers = listUsers;
module.exports.promoteToAdmin = promoteToAdmin;
