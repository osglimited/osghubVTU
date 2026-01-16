const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { db, auth } = require('../config/firebase');

const router = express.Router();

router.use(verifyToken);
router.use(isAdmin);

router.post('/settings', adminController.updateSettings);
router.get('/settings', adminController.getSettings);
router.get('/transactions', adminController.getAllTransactions);
router.post('/wallet/credit', adminController.creditWallet);
router.post('/wallet/debit', adminController.debitWallet);
router.get('/users', adminController.listUsers);
router.post('/users/promote', adminController.promoteToAdmin);
router.post('/users/create', adminController.createUser);
router.post('/users/suspend', async (req, res) => {
  try {
    const { uid, email, suspend } = req.body || {};
    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(String(uid));
    } else if (email) {
      userRecord = await auth.getUserByEmail(String(email));
    } else {
      return res.status(400).json({ success: false, message: 'uid or email required' });
    }
    const targetUid = userRecord.uid;
    await auth.updateUser(targetUid, { disabled: !!suspend });
    const updated = await auth.getUser(targetUid);
    return res.json({
      success: true,
      uid: targetUid,
      email: updated.email || userRecord.email || '',
      disabled: !!updated.disabled,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error && error.message ? error.message : String(error) });
  }
});
router.post('/admins', adminController.createAdmin);
router.post('/users/verification-link', adminController.generateVerificationLink);

router.get('/stats', async (_req, res) => {
  const result = {
    totalUsers: 0,
    walletBalance: 0,
    totalTransactions: 0,
    todaySales: 0,
    dailyTotals: [],
    recentTransactions: [],
  };
  try {
    let usersCount = 0;
    try {
      const list = await auth.listUsers(1000);
      usersCount = list.users.length;
    } catch {
      const snap = await db.collection('users').limit(1000).get();
      usersCount = snap.size;
    }
    let txs = [];
    const txNames = ['admin_transactions', 'transactions', 'wallet_transactions'];
    for (const n of txNames) {
      const snap = await db.collection(n).orderBy('createdAt', 'desc').limit(500).get();
      if (!snap.empty) {
        txs = snap.docs.map(d => {
          const x = d.data() || {};
          return { id: d.id, user: x.user || x.user_email || x.userId || '', amount: Number(x.amount || 0), status: x.status || 'success', type: x.type || 'transaction', createdAt: x.createdAt || x.timestamp || Date.now() };
        });
        break;
      }
    }
    result.totalTransactions = txs.length;
    if (!usersCount) {
      const distinct = new Set();
      for (const t of txs) {
        const e = String(t.user || '').toLowerCase();
        if (e) distinct.add(e);
      }
      usersCount = distinct.size;
    }
    result.totalUsers = usersCount;
    const now = new Date();
    result.todaySales = txs.filter(t => {
      const d = new Date(t.createdAt);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    let walletSum = 0;
    const walletNames = ['wallets', 'user_wallets'];
    for (const n of walletNames) {
      const snap = await db.collection(n).limit(1000).get();
      if (!snap.empty) {
        walletSum = snap.docs.reduce((sum, d) => {
          const x = d.data() || {};
          const mb = Number(x.mainBalance || x.main_balance || x.balance || 0);
          return sum + mb;
        }, 0);
        break;
      }
    }
    result.walletBalance = walletSum;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { weekday: 'short' });
      const total = txs.filter(t => {
        const td = new Date(t.createdAt);
        return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      }).reduce((sum, t) => sum + Number(t.amount || 0), 0);
      days.push({ day: key, total });
    }
    result.dailyTotals = days;
    result.recentTransactions = txs.slice(0, 5);
    res.json(result);
  } catch {
    res.json(result);
  }
});

router.get('/wallet/logs', async (_req, res) => {
  try {
    const names = ['wallet_logs', 'wallet_transactions'];
    for (const n of names) {
      const snap = await db.collection(n).orderBy('createdAt', 'desc').limit(200).get();
      if (!snap.empty) {
        const rows = snap.docs.map(d => {
          const x = d.data() || {};
          return { id: d.id, user: x.user || x.user_email || x.userId || '', type: x.type || '', amount: Number(x.amount || 0), description: x.description || '', createdAt: x.createdAt || Date.now() };
        });
        return res.json(rows);
      }
    }
    return res.json([]);
  } catch {
    return res.json([]);
  }
});

router.get('/wallet/deposits', async (_req, res) => {
  try {
    const snap = await db.collection('wallet_deposits').orderBy('createdAt', 'desc').limit(200).get();
    const rows = snap.docs.map(d => {
      const x = d.data() || {};
      return { id: d.id, user: x.user || x.user_email || '', amount: Number(x.amount || 0), method: x.method || '', status: x.status || '', createdAt: x.createdAt || Date.now() };
    });
    return res.json(rows);
  } catch {
    return res.json([]);
  }
});

router.get('/users/transactions', async (req, res) => {
  const email = String(req.query.email || '').toLowerCase();
  if (!email) return res.json([]);
  try {
    const names = ['admin_transactions', 'transactions', 'wallet_transactions'];
    for (const n of names) {
      const snap = await db.collection(n).where('user_email', '==', email).orderBy('createdAt', 'desc').limit(200).get();
      if (!snap.empty) {
        const rows = snap.docs.map(d => {
          const x = d.data() || {};
          return { id: d.id, user: x.user || x.user_email || x.userId || '', amount: Number(x.amount || 0), status: x.status || 'success', type: x.type || 'transaction', createdAt: x.createdAt || Date.now() };
        });
        return res.json(rows);
      }
    }
    return res.json([]);
  } catch {
    return res.json([]);
  }
});

router.get('/transactions/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!id) return res.status(400).json({ message: 'id required' });
  try {
    const doc = await db.collection('admin_transactions').doc(id).get();
    if (doc.exists) {
      const x = doc.data() || {};
      return res.json({ id, user: x.user || x.user_email || x.userId || '', amount: Number(x.amount || 0), status: x.status || '', type: x.type || '', createdAt: x.createdAt || Date.now() });
    }
  } catch {}
  return res.json({});
});

router.get('/plans', async (_req, res) => {
  try {
    const snap = await db.collection('service_plans').orderBy('createdAt', 'desc').get();
    const rows = snap.docs.map(d => {
      const x = d.data() || {};
      return { id: d.id, network: x.network || '', name: x.name || '', priceUser: Number(x.priceUser || x.price_user || 0), priceApi: Number(x.priceApi || x.price_api || 0), active: x.active !== false, metadata: x.metadata || null, createdAt: x.createdAt || Date.now() };
    });
    return res.json(rows);
  } catch {
    return res.json([]);
  }
});

router.post('/plans', async (req, res) => {
  const body = req.body || {};
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const network = String(body.network || '');
  const name = String(body.name || '');
  const priceUser = Number(body.priceUser || 0);
  const priceApi = Number(body.priceApi || 0);
  const active = body.active === undefined ? true : Boolean(body.active);
  if (!network || !name || !priceUser || !priceApi) {
    return res.status(400).json({ message: 'network, name, priceUser, priceApi required' });
  }
  try {
    await db.collection('service_plans').doc(id).set({ network, name, priceUser, priceApi, active, metadata: body.metadata || null, createdAt: Date.now() });
  } catch {}
  return res.json({ id, network, name, priceUser, priceApi, active, metadata: body.metadata || null });
});

router.put('/plans/:id', async (req, res) => {
  const id = String(req.params.id || '');
  const body = req.body || {};
  if (!id) return res.status(400).json({ message: 'id and at least one field required' });
  try {
    const patch = {};
    if (body.network !== undefined) patch.network = String(body.network || '');
    if (body.name !== undefined) patch.name = String(body.name || '');
    if (body.priceUser !== undefined) patch.priceUser = Number(body.priceUser || 0);
    if (body.priceApi !== undefined) patch.priceApi = Number(body.priceApi || 0);
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.metadata !== undefined) patch.metadata = body.metadata ? body.metadata : null;
    await db.collection('service_plans').doc(id).set(patch, { merge: true });
  } catch {}
  return res.json({ id, ...body });
});

router.delete('/plans/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!id) return res.status(400).json({ message: 'id required' });
  try {
    await db.collection('service_plans').doc(id).delete();
  } catch {}
  return res.json({ success: true, id });
});

module.exports = router;
