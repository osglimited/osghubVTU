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
router.post('/users/delete', async (req, res) => {
  try {
    const { uid, email } = req.body || {};
    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(String(uid));
    } else if (email) {
      userRecord = await auth.getUserByEmail(String(email));
    } else {
      return res.status(400).json({ success: false, message: 'uid or email required' });
    }
    const targetUid = userRecord.uid;
    await auth.deleteUser(targetUid);
    return res.json({ success: true, uid: targetUid, email: userRecord.email || '' });
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
          return { id: d.id, user: x.user || x.user_email || x.userEmail || x.email || x.userId || '', amount: Number(x.amount || 0), status: x.status || 'success', type: x.type || 'transaction', createdAt: x.createdAt || x.timestamp || Date.now() };
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
          return { id: d.id, user: x.user || x.user_email || x.userEmail || x.email || x.userId || '', type: x.type || '', amount: Number(x.amount || 0), description: x.description || '', createdAt: x.createdAt || Date.now() };
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
      return { id: d.id, user: x.user || x.user_email || x.userEmail || x.email || x.userId || '', amount: Number(x.amount || 0), method: x.method || '', status: x.status || '', createdAt: x.createdAt || Date.now() };
    });
    return res.json(rows);
  } catch {
    return res.json([]);
  }
});

// Unified Financial Intelligence: system or user scope
router.get('/finance/analytics', async (req, res) => {
  const email = String(req.query.email || '').toLowerCase();
  const uid = String(req.query.uid || '').toLowerCase();
  const scope = (email || uid) ? 'user' : 'system';
  const startRaw = req.query.start;
  const endRaw = req.query.end;
  const parseTs = (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const s = String(val);
    if (/^\d+$/.test(s)) return Number(s);
    const t = Date.parse(s);
    return isNaN(t) ? undefined : t;
  };
  const startTs = parseTs(startRaw);
  const endTs = parseTs(endRaw);
  const makePeriod = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.getTime();
  };
  const getCreatedMs = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    if (v._seconds) return Number(v._seconds) * 1000;
    if (v.seconds) return Number(v.seconds) * 1000;
    return 0;
  };
  try {
    // Deposits
    const depSnap = await db.collection('wallet_deposits').orderBy('createdAt', 'desc').limit(5000).get();
    const depositsAll = depSnap.docs.map(d => {
      const x = d.data() || {};
      return { ...x, createdAt: getCreatedMs(x.createdAt) };
    });
    const deposits = scope === 'user'
      ? depositsAll.filter(d => {
          const u = String((d.user || d.user_email || d.userId || '')).toLowerCase();
          return (email && u === email) || (uid && u === uid);
        })
      : depositsAll;
    const depositsFiltered = deposits.filter(d => {
      const t = Number(d.createdAt || 0);
      if (startTs !== undefined && t < startTs) return false;
      if (endTs !== undefined && t > endTs) return false;
      return true;
    });

    // Transactions
    const txNames = ['transactions', 'admin_transactions', 'wallet_transactions'];
    let transactions = [];
    for (const n of txNames) {
      const snap = await db.collection(n).orderBy('createdAt', 'desc').limit(5000).get();
      if (!snap.empty) {
        const rows = snap.docs.map(d => {
          const x = d.data() || {};
          const status = String(x.status || '');
          const sms = status === 'success' ? 5 : 0; // ₦5 per successful transaction
          return {
            id: d.id,
            userId: x.userId || '',
            user: x.user || x.user_email || x.userEmail || x.email || x.userId || '',
            userPrice: Number(x.userPrice || x.amount || 0),
            providerCost: Number(x.providerCost || 0),
            smsCost: sms,
            serviceType: String(x.serviceType || x.type || ''),
            status,
            createdAt: getCreatedMs(x.createdAt),
          };
        });
        const filtered = scope === 'user'
          ? rows.filter(r => {
              const uId = String(r.userId || '').toLowerCase();
              const uEmail = String(r.user || '').toLowerCase();
              return (email && (uEmail === email)) || (uid && (uId === uid));
            })
          : rows;
        const timeFiltered = filtered.filter(t => {
          const tt = Number(t.createdAt || 0);
          if (startTs !== undefined && tt < startTs) return false;
          if (endTs !== undefined && tt > endTs) return false;
          return true;
        });
        transactions = transactions.concat(timeFiltered);
      }
    }
    transactions.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    // Provider balance required
    let providerBalanceRequired = 0;
    let walletBalance = 0;
    if (scope === 'user') {
      for (const n of ['wallets', 'user_wallets']) {
        const doc = await db.collection(n).doc(uid || email).get();
        if (doc.exists) {
          const x = doc.data() || {};
          walletBalance = Number(x.mainBalance || x.main_balance || x.balance || 0);
          break;
        }
      }
      providerBalanceRequired = walletBalance;
    } else {
      const allWallets = [];
      for (const n of ['wallets', 'user_wallets']) {
        const snap = await db.collection(n).limit(5000).get();
        if (!snap.empty) {
          allWallets.push(
            ...snap.docs.map(d => {
              const x = d.data() || {};
              return { main: Number(x.mainBalance || x.main_balance || x.balance || 0) };
            })
          );
        }
      }
      providerBalanceRequired = allWallets.reduce((s, w) => s + Number(w.main || 0), 0);
    }

    const computeBucket = (bucketStart) => {
      const dep = depositsFiltered
        .filter(d => Number(d.createdAt || 0) >= bucketStart)
        .reduce((s, d) => s + Number(d.amount || 0), 0);
      const tx = transactions.filter(t => Number(t.createdAt || 0) >= bucketStart);
      const provider = tx.reduce((s, t) => s + Number(t.providerCost || 0), 0);
      const sms = tx.reduce((s, t) => s + Number(t.smsCost || 0), 0);
      const revenue = tx
        .filter(t => String(t.status || '') === 'success')
        .reduce((s, t) => s + Number(t.userPrice || 0), 0);
      const net = revenue - provider - sms;
      return { deposits: dep, providerCost: provider, smsCost: sms, netProfit: net };
    };

    const daily = computeBucket(makePeriod(1));
    const weekly = computeBucket(makePeriod(7));
    const monthly = computeBucket(makePeriod(30));

    const depositsTotal = depositsFiltered.reduce((s, d) => s + Number(d.amount || 0), 0);
    const providerCostTotal = transactions.reduce((s, t) => s + Number(t.providerCost || 0), 0);
    const smsCostTotal = transactions.reduce((s, t) => s + Number(t.smsCost || 0), 0);
    const revenueTotal = transactions.filter(t => String(t.status || '') === 'success').reduce((s, t) => s + Number(t.userPrice || 0), 0);
    const netProfitTotal = revenueTotal - providerCostTotal - smsCostTotal;

    // Audit log (non-blocking)
    try {
      const logDoc = {
        id: `al_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: 'finance_analytics',
        scope,
        uid,
        email,
        start: startTs || null,
        end: endTs || null,
        providerBalanceRequired,
        walletBalance,
        totals: { depositsTotal, providerCostTotal, smsCostTotal, netProfitTotal },
        txCount: transactions.length,
        createdAt: Date.now(),
      };
      await db.collection('admin_logs').doc(logDoc.id).set(logDoc, { merge: true });
    } catch {}
    return res.json({ scope, providerBalanceRequired, walletBalance, daily, weekly, monthly, totals: { depositsTotal, providerCostTotal, smsCostTotal, netProfitTotal }, transactions });
  } catch (e) {
    return res.json({ scope: (email || uid) ? 'user' : 'system', providerBalanceRequired: 0, walletBalance: 0, daily: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, weekly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, monthly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, totals: { depositsTotal: 0, providerCostTotal: 0, smsCostTotal: 0, netProfitTotal: 0 }, transactions: [] });
  }
});

router.get('/users/transactions', async (req, res) => {
  const email = String(req.query.email || '').toLowerCase();
  const uid = String(req.query.uid || '').toLowerCase();
  if (!email && !uid) return res.json([]);
  try {
    const names = ['admin_transactions', 'transactions', 'wallet_transactions'];
    let rows = [];
    for (const n of names) {
      const col = db.collection(n);
      try {
        if (email) {
          const queries = [
            col.where('user_email', '==', email).limit(500).get(),
            col.where('user', '==', email).limit(500).get(),
            col.where('userEmail', '==', email).limit(500).get(),
            col.where('email', '==', email).limit(500).get(),
          ];
          const snaps = await Promise.allSettled(queries);
          for (const s of snaps) {
            if (s.status === 'fulfilled') {
              const snap = s.value;
              if (!snap.empty) {
                rows = rows.concat(
                  snap.docs.map(d => {
                    const x = d.data() || {};
                    return {
                      id: d.id,
                      user: x.user || x.user_email || x.userEmail || x.email || x.userId || '',
                      amount: Number(x.amount || 0),
                      status: x.status || 'success',
                      type: x.type || 'transaction',
                      providerStatus: x.providerStatus || x.provider_status || '',
                      providerErrorCode: x.providerErrorCode || x.provider_error_code || '',
                      providerErrorMessage: x.providerErrorMessage || x.provider_error_message || '',
                      providerRaw: x.providerRaw || x.provider_raw || null,
                      createdAt: x.createdAt || x.timestamp || Date.now(),
                    };
                  })
                );
              }
            }
          }
        }
        if (uid) {
          const queries = [
            col.where('userId', '==', uid).limit(500).get(),
            col.where('uid', '==', uid).limit(500).get(),
          ];
          const snaps = await Promise.allSettled(queries);
          for (const s of snaps) {
            if (s.status === 'fulfilled') {
              const snap = s.value;
              if (!snap.empty) {
                rows = rows.concat(
                  snap.docs.map(d => {
                    const x = d.data() || {};
                    return {
                      id: d.id,
                      user: x.user || x.user_email || x.userEmail || x.email || x.userId || '',
                      amount: Number(x.amount || 0),
                      status: x.status || 'success',
                      type: x.type || 'transaction',
                      providerStatus: x.providerStatus || x.provider_status || '',
                      providerErrorCode: x.providerErrorCode || x.provider_error_code || '',
                      providerErrorMessage: x.providerErrorMessage || x.provider_error_message || '',
                      providerRaw: x.providerRaw || x.provider_raw || null,
                      createdAt: x.createdAt || x.timestamp || Date.now(),
                    };
                  })
                );
              }
            }
          }
        }
      } catch {}
    }
    rows.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    return res.json(rows);
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
