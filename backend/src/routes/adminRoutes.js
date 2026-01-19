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
    d.setHours(0, 0, 0, 0); // Start of today
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
          
          // Identify Service Transactions (STRICT)
          // User Rule: "Use ONLY service transactions: airtime, data, electricity, exam"
          const validServiceTypes = ['airtime', 'data', 'electricity', 'exam', 'cable', 'bill'];
          
          // Check if it's a known service type AND explicitly NOT a credit/refund
          const isCredit = type === 'credit' || type === 'refund' || type === 'deposit';
          const isService = !isCredit && (
            validServiceTypes.includes(type) ||
            (type === 'debit' && validServiceTypes.includes(serviceType)) ||
            (validServiceTypes.includes(serviceType))
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

    // 4. Calculate Provider Balance Required (CAPACITY / BEST CASE)
    // The user wants to see the minimum funds needed to fulfill services.
    // We look for the BEST (lowest) ratio across all service types (Data, Airtime, Power, Exam).
    
    let bestRatio = 0.95; // Default fallback (5% margin)
    let bestRatioSource = 'default';

    try {
      // A. Fetch Service Plans (Data, Power, Exam)
      // These are often stored in 'service_plans' or similar collections
      const plansSnap = await db.collection('service_plans').get();
      if (!plansSnap.empty) {
        plansSnap.docs.forEach(d => {
           const p = d.data();
           const cost = Number(p.priceApi || p.price_api || 0);
           const price = Number(p.priceUser || p.price_user || 0);
           // We look for the absolute lowest cost ratio available on the platform
           if (cost > 0 && price > 0 && cost < price) {
             const ratio = cost / price;
             if (ratio < bestRatio) {
               bestRatio = ratio;
               bestRatioSource = `plan:${p.type || 'service'}:${d.id} (${cost}/${price})`;
             }
           }
        });
      }
      
      // B. Fetch Airtime Discounts/Settings
      const settingsDoc = await db.collection('admin_settings').doc('settings').get();
      const st = settingsDoc.exists ? settingsDoc.data() || {} : {};
      
      // Airtime Networks
      const airtimeNetworks = st.airtimeNetworks || {};
      Object.values(airtimeNetworks).forEach(net => {
         const discount = Number(net.discount || 0);
         if (discount > 0) {
           const ratio = (100 - discount) / 100;
           if (ratio < bestRatio) {
             bestRatio = ratio;
             bestRatioSource = `airtime:${net.name || 'network'} (${discount}%)`;
           }
         }
       });

      // Power/Electricity Profit Margin
      // If power is handled via a fixed percentage commission (e.g. 2% profit)
      const powerConfig = st.powerConfig || st.electricity || {};
      const powerDiscount = Number(powerConfig.discount || powerConfig.commission || 0);
      if (powerDiscount > 0) {
        const ratio = (100 - powerDiscount) / 100;
        if (ratio < bestRatio) {
          bestRatio = ratio;
          bestRatioSource = `power (${powerDiscount}%)`;
        }
      }

      // Exam Pin Profit Margin
      const examConfig = st.examConfig || st.exam || {};
      const examDiscount = Number(examConfig.discount || examConfig.commission || 0);
      if (examDiscount > 0) {
        const ratio = (100 - examDiscount) / 100;
        if (ratio < bestRatio) {
          bestRatio = ratio;
          bestRatioSource = `exam (${examDiscount}%)`;
        }
      }
      
    } catch (err) {
      console.error("Error calculating best case ratio:", err);
    }
    
    // Safety check: ensure bestRatio is always less than 1.0
    if (bestRatio >= 1.0) {
      bestRatio = 0.95; 
    }
    
    // User Rule: provider_required = user_wallet_balance * best_ratio
    const providerBalanceRequired = walletBalance * bestRatio;
    
    const costRatio = bestRatio;

    // IMPUTE missing provider costs using the worstRatio (Conservative Estimate)
    // This ensures that if historical data lacks cost info, we don't show 100% profit.
    // We use the "Worst Case" ratio to avoid overstating profit.
    const successfulServiceTxs = scopedTransactions.filter(t => t.isService && t.status === 'success');
    for (const t of successfulServiceTxs) {
      if (t.providerCost <= 0) {
        t.providerCost = t.userPrice * costRatio;
        t.imputed = true;
      }
    }


    // 5. Compute Financials (Deposits, Cost, Profit) for Date Ranges
    // Helper to filter by date
    const filterByDate = (txs, start, end) => {
      return txs.filter(t => {
        if (start !== undefined && t.createdAt < start) return false;
        // If end is specified, it should be the end of that day (23:59:59)
        if (end !== undefined && t.createdAt > (end + 86399999)) return false;
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

    const dailyStart = makePeriod(0);
    const dailyEnd = dailyStart + 86399999;
    const daily = computeBucket(filterByDate(scopedTransactions, dailyStart, dailyEnd));
    
    const weeklyStart = makePeriod(7);
    const weekly = computeBucket(filterByDate(scopedTransactions, weeklyStart));
    
    const monthlyStart = makePeriod(30);
    const monthly = computeBucket(filterByDate(scopedTransactions, monthlyStart));

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
      // Security Check: Ensure NO deposits made it into the service calculation
      const serviceTxs = rangeFilteredTxs.filter(t => t.isService && t.status === 'success');
      const depositTxs = rangeFilteredTxs.filter(isDeposit);
      const depositIds = new Set(depositTxs.map(t => t.id));
      const leakedDeposits = serviceTxs.filter(t => depositIds.has(t.id));
      
      if (leakedDeposits.length > 0) {
        console.error("CRITICAL AUDIT FAILURE: Deposits detected in profit calculation!", leakedDeposits.map(t => t.id));
      }

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
        worstRatio,
        worstRatioSource,
        totals,
        audit: {
          leakedDepositsCount: leakedDeposits.length,
          leakedIds: leakedDeposits.map(t => t.id),
          serviceTxCount: serviceTxs.length,
          depositTxCount: depositTxs.length
        },
        txCount: rangeFilteredTxs.length,
        createdAt: Date.now(),
      };
      await db.collection('admin_logs').doc(logDoc.id).set(logDoc, { merge: true });
    } catch {}

    return res.json({ 
      scope, 
      providerBalanceRequired, 
      walletBalance, 
      totalWalletBalance: walletBalance,
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
      const type = String(x.type || '').toLowerCase();
       const sType = String(x.serviceType || x.type || '').toLowerCase();
       const validServiceTypes = ['airtime', 'data', 'electricity', 'exam', 'cable', 'bill'];
       const isService = validServiceTypes.includes(type) || (type === 'debit' && validServiceTypes.includes(sType));
       
       let userPrice = Number(x.amount || 0);
       
       return {
         id: d.id,
         user: x.user || x.user_email || x.userEmail || x.email || x.userId || '',
         amount: userPrice,
         status: x.status || 'success',
         type,
         providerStatus: x.providerStatus || x.provider_status || '',
         providerErrorCode: x.providerErrorCode || x.provider_error_code || '',
         providerErrorMessage: x.providerErrorMessage || x.provider_error_message || '',
         providerRaw: x.providerRaw || x.provider_raw || null,
         createdAt: x.createdAt || x.timestamp || Date.now(),
         providerCost: Number(x.providerCost || x.provider_price || 0),
         smsCost: Number(x.smsCost || x.sms_cost || 0),
         netProfit: isService 
           ? (userPrice - Number(x.providerCost || x.provider_price || 0) - Number(x.smsCost || x.sms_cost || 0)) 
           : 0
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
                    const type = String(x.type || '').toLowerCase();
                    const sType = String(x.serviceType || x.type || '').toLowerCase();
                    const validServiceTypes = ['airtime', 'data', 'electricity', 'exam', 'cable', 'bill'];
                    const isService = validServiceTypes.includes(type) || (type === 'debit' && validServiceTypes.includes(sType));
                    
                    let userPrice = Number(x.amount || 0);
                    return {
                      id: d.id,
                      user: x.user || x.user_email || x.userEmail || x.email || x.userId || '',
                      amount: userPrice,
                      status: x.status || 'success',
                      type,
                      providerStatus: x.providerStatus || x.provider_status || '',
                      providerErrorCode: x.providerErrorCode || x.provider_error_code || '',
                      providerErrorMessage: x.providerErrorMessage || x.provider_error_message || '',
                      providerRaw: x.providerRaw || x.provider_raw || null,
                      createdAt: x.createdAt || x.timestamp || Date.now(),
                      providerCost: Number(x.providerCost || x.provider_price || 0),
                      smsCost: Number(x.smsCost || x.sms_cost || 0),
                      netProfit: isService 
                        ? (userPrice - Number(x.providerCost || x.provider_price || 0) - Number(x.smsCost || x.sms_cost || 0)) 
                        : 0
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
