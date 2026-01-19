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
  const rawEmail = String(req.query.email || '').trim();
  const rawUid = String(req.query.uid || '').trim();
  const email = rawEmail.toLowerCase();
  const uid = rawUid.toLowerCase();
  const scope = (rawEmail || rawUid) ? 'user' : 'system';
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
  const pickNumber = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && v !== '') return Number(v);
    }
    return 0;
  };
  const readMainBalanceBest = async (uidRaw, emailRaw) => {
    const targets = [String(uidRaw || '').toLowerCase(), String(emailRaw || '').toLowerCase()].filter(Boolean);
    if (targets.length === 0) return 0;
    let best = 0;
    const pickMain = (x) => pickNumber(x, ['mainBalance', 'main_balance', 'balance']);
    const sources = ['wallets', 'user_wallets'];
    for (const src of sources) {
      try {
        const snap = await db.collection(src).limit(5000).get();
        if (snap.empty) continue;
        for (const d of snap.docs) {
          const x = d.data() || {};
          const candidates = [
            String(x.uid || '').toLowerCase(),
            String(x.userId || '').toLowerCase(),
            String(x.email || '').toLowerCase(),
            String(x.user_email || '').toLowerCase(),
            String(d.id || '').toLowerCase(),
          ].filter(Boolean);
          const match = candidates.some(k => targets.includes(k));
          if (match) {
            best = Math.max(best, pickMain(x));
          }
        }
      } catch {}
    }
    return best;
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
    // 1. Fetch All Relevant Transactions (Service & Wallet)
    // We fetch a large batch to ensure we have enough history for Ratio calculation and Reporting
    const txNames = ['transactions', 'admin_transactions', 'wallet_transactions'];
    let allTransactions = [];
    
    // Helper to fetch and normalize
    for (const n of txNames) {
      const snap = await db.collection(n).orderBy('createdAt', 'desc').limit(5000).get();
      if (!snap.empty) {
        const rows = snap.docs.map(d => {
          const x = d.data() || {};
          const status = String(x.status || 'success').toLowerCase(); // Default to success if missing? No, safer to assume status field exists.
          const type = String(x.type || '').toLowerCase();
          const serviceType = String(x.serviceType || x.type || '');
          const walletType = String(x.walletType || '').toLowerCase();
          const description = String(x.description || '').toLowerCase();
          
          // Identify Service Transactions
          // Must NOT be funding/wallet/credit/debit types
          // OR must have explicit provider cost
          const isService = (
            (!!serviceType && !['credit', 'debit', 'transfer', 'wallet', 'funding'].includes(type))
            || (pickNumber(x, ['providerCost','priceApi','price_api']) > 0)
          );

          const userPrice = pickNumber(x, ['userPrice','priceUser','price_user','amount','user_amount','paid','userPaid']);
          let providerCost = pickNumber(x, ['providerCost','priceApi','price_api','apiPrice','provider_price','providerPrice','cost','serviceCost']);
          
          // Fallback: if isService but no providerCost, we KEEP it as 0 for now.
          // We will calculate the Ratio based only on valid transactions, 
          // and then impute the missing costs using that global ratio.
          // This prevents "0 cost" data from skewing the ratio to 1.0 (0% margin) or 0.0 (100% margin).
          if (isService && providerCost <= 0) {
             // Do not overwrite with userPrice yet. Leave as 0.
             // providerCost = 0; 
          }

          const smsCost = Number(x.sms_cost ?? x.smsCost ?? 0);

          return {
            id: d.id,
            userId: String(x.userId || x.uid || '').toLowerCase(),
            user: String(x.user || x.user_email || x.userEmail || x.email || '').toLowerCase(),
            userPrice,
            providerCost,
            smsCost,
            serviceType,
            status,
            type,
            walletType,
            description,
            createdAt: getCreatedMs(x.createdAt),
            isService,
            raw: x,
          };
        });
        allTransactions = allTransactions.concat(rows);
      }
    }

    // Deduplicate by ID (in case of overlaps between collections)
    const seenIds = new Set();
    const uniqueTransactions = [];
    for (const t of allTransactions) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        uniqueTransactions.push(t);
      }
    }
    // Sort by Date Descending
    uniqueTransactions.sort((a, b) => b.createdAt - a.createdAt);

    // 2. Filter by Scope (User vs System)
    const scopedTransactions = scope === 'user'
      ? uniqueTransactions.filter(r => {
          return (email && (r.user === email)) || (uid && (r.userId === uid));
        })
      : uniqueTransactions;

    // 3. Calculate Wallet Balance (Current)
    let walletBalance = 0;
    if (scope === 'user') {
      walletBalance = await readMainBalanceBest(rawUid, rawEmail);
    } else {
      const sources = ['wallets', 'user_wallets'];
      const seen = new Map();
      for (const src of sources) {
        const snap = await db.collection(src).limit(5000).get(); // Limit might be an issue for system-wide
        if (!snap.empty) {
          for (const d of snap.docs) {
            const x = d.data() || {};
            const key = String(x.uid || x.userId || x.email || d.id || '').toLowerCase();
            const main = pickNumber(x, ['mainBalance','main_balance','balance']);
            if (!seen.has(key)) seen.set(key, main);
            else seen.set(key, Math.max(seen.get(key), main));
          }
        }
      }
      walletBalance = Array.from(seen.values()).reduce((s, v) => s + Number(v || 0), 0);
    }

    // 4. Calculate Provider Balance Required & Ratio
    // Formula: WalletBalance * (TotalProviderCost / TotalUserPrice)
    // Based on RECENT SUCCESSFUL SERVICE transactions
    const successfulServiceTxs = scopedTransactions.filter(t => t.isService && t.status === 'success');
    
    // Filter for Ratio Calculation: Only use transactions with VALID cost > 0
    // This avoids skewing the ratio with "0 cost" data (which implies 100% margin if raw, or 0% if forced to price)
    // ADDITIONALLY: We exclude transactions where providerCost == userPrice (approx).
    // This is because the system defaults providerCost = userPrice when cost is unknown.
    // Including these would skew the ratio towards 1.0 (0% margin), hiding the actual margin.
    const validCostTxs = successfulServiceTxs.filter(t => {
       if (t.providerCost <= 0) return false;
       // Check if Cost is suspiciously close to Price (within 0.1%)
       // This filters out the "Default Cost = Price" records
       const isDefaultCost = Math.abs(t.providerCost - t.userPrice) < 0.01; 
       return !isDefaultCost;
    });

    // Fallback: If filtering leaves us with NOTHING, it means ALL data is either 0 cost or Cost=Price.
    // In that case, we can't estimate a margin from data.
    // However, if we have *any* data with margin, we prefer using that to estimate the global ratio.
    let calculationTxs = validCostTxs;
    if (validCostTxs.length === 0) {
       // No "good" data found. We must fall back to using the Cost=Price data (Ratio 1.0)
       // Or we could check if there are ANY valid costs > 0 at all.
       const anyCostTxs = successfulServiceTxs.filter(t => t.providerCost > 0);
       if (anyCostTxs.length > 0) {
          calculationTxs = anyCostTxs;
       }
    }
    
    let costRatio = 1.0; // Default conservative (100% of balance needed)
    if (calculationTxs.length > 0) {
      const totalValidCost = calculationTxs.reduce((s, t) => s + t.providerCost, 0);
      const totalValidPrice = calculationTxs.reduce((s, t) => s + t.userPrice, 0);
      if (totalValidPrice > 0) {
        costRatio = totalValidCost / totalValidPrice;
      }
    }

    // Now, IMPUTE missing provider costs in the dataset using this ratio
    // This ensures Net Profit calculations are reasonable even for missing data
    // We update the objects in place (references in scopedTransactions/allTransactions)
    for (const t of successfulServiceTxs) {
      if (t.providerCost <= 0) {
        t.providerCost = t.userPrice * costRatio;
        t.imputed = true;
      }
    }
    
    // "Provider Balance Required ... Must be LOWER than total user balances."
    // "Exclude profit margins." -> Handled by Ratio < 1.0
    const providerBalanceRequired = walletBalance * costRatio;

    // 5. Compute Financials (Deposits, Cost, Profit) for Date Ranges
    // Helper to filter by date
    const filterByDate = (txs, start, end) => {
      return txs.filter(t => {
        if (start !== undefined && t.createdAt < start) return false;
        if (end !== undefined && t.createdAt > end) return false;
        return true;
      });
    };

    // Identify Deposits
    // Criteria: Type=credit, Wallet=main, Not internal (transfer/refund/etc)
    const isDeposit = (t) => {
      if (t.type !== 'credit') return false;
      // If walletType is present, must be main. If missing, assume main?
      if (t.walletType && t.walletType !== 'main') return false; 
      
      const d = t.description;
      if (d.includes('transfer') || d.includes('cashback') || d.includes('referral') || d.includes('refund') || d.includes('bonus') || d.includes('reversal')) {
        return false;
      }
      return true;
    };

    const computeBucket = (txs) => {
      const deposits = txs.filter(isDeposit).reduce((s, t) => s + pickNumber(t.raw, ['amount']), 0);
      
      const services = txs.filter(t => t.isService && t.status === 'success');
      const providerCost = services.reduce((s, t) => s + t.providerCost, 0);
      const smsCost = services.reduce((s, t) => s + t.smsCost, 0);
      const revenue = services.reduce((s, t) => s + t.userPrice, 0);
      
      const netProfit = revenue - providerCost - smsCost;
      
      return { deposits, providerCost, smsCost, netProfit };
    };

    const daily = computeBucket(filterByDate(scopedTransactions, makePeriod(1)));
    const weekly = computeBucket(filterByDate(scopedTransactions, makePeriod(7)));
    const monthly = computeBucket(filterByDate(scopedTransactions, makePeriod(30)));

    // Totals (Filtered by User Selected Range)
    const rangeFilteredTxs = filterByDate(scopedTransactions, startTs, endTs);
    const totalsBucket = computeBucket(rangeFilteredTxs);

    const totals = {
      depositsTotal: totalsBucket.deposits,
      providerCostTotal: totalsBucket.providerCost,
      smsCostTotal: totalsBucket.smsCost,
      netProfitTotal: totalsBucket.netProfit
    };

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
        costRatio,
        validCostTxCount: validCostTxs ? validCostTxs.length : 0,
        calculationTxCount: calculationTxs ? calculationTxs.length : 0,
        totals,
        txCount: rangeFilteredTxs.length,
        createdAt: Date.now(),
      };
      await db.collection('admin_logs').doc(logDoc.id).set(logDoc, { merge: true });
    } catch {}

    return res.json({ 
      scope, 
      providerBalanceRequired, 
      walletBalance, 
      daily, 
      weekly, 
      monthly, 
      totals, 
      transactions: rangeFilteredTxs 
    });

  } catch (e) {
    console.error('Finance Error:', e);
    return res.json({ scope: (rawEmail || rawUid) ? 'user' : 'system', providerBalanceRequired: 0, walletBalance: 0, daily: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, weekly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, monthly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, totals: { depositsTotal: 0, providerCostTotal: 0, smsCostTotal: 0, netProfitTotal: 0 }, transactions: [] });
  }
});

router.get('/users/transactions', async (req, res) => {
  const email = String(req.query.email || '').trim();
  const uid = String(req.query.uid || '').trim();
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
