import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Transaction } from 'firebase-admin/firestore';
import crypto from 'crypto';

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();
const adminAuth = getAuth();

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

async function verifyIdToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ success: false, message: 'unauthenticated' });
    const decoded = await adminAuth.verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch (e: any) {
    return res.status(401).json({ success: false, message: e?.message || 'unauthenticated' });
  }
}

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

app.post('/v1/airtime', verifyIdToken, async (req: express.Request, res: express.Response) => {
  try {
    const uid = (req as any).uid as string;
    const { userId, amount, network, phone, provider, clientRequestId } = req.body as {
      userId: string; amount: number; network: string; phone: string; provider: string; clientRequestId?: string;
    };
    if (!userId || !amount || !network || !phone || !provider) {
      return res.status(400).json({ success: false, message: 'invalid-payload' });
    }
    if (uid !== userId) {
      return res.status(401).json({ success: false, message: 'unauthorized' });
    }

    // Optional idempotency: if a transaction with the same clientRequestId exists and is success, return it
    if (clientRequestId) {
      const existing = await db.collection('transactions')
        .where('userId', '==', userId)
        .where('clientRequestId', '==', clientRequestId)
        .limit(1)
        .get();
      if (!existing.empty) {
        const doc = existing.docs[0];
        const data = doc.data();
        return res.json({ success: data.status === 'success', message: data.status, transactionId: doc.id });
      }
    }

    // Pre-authorize: debit wallet and create provider_pending transaction
    let txId = '';
    await db.runTransaction(async (t: Transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new Error('user-not-found');
      const u = userSnap.data()!;
      const balance = u.walletBalance || 0;
      if (balance < amount) throw new Error('insufficient-balance');
      t.update(userRef, { walletBalance: balance - amount });
      const txRef = db.collection('transactions').doc();
      txId = txRef.id;
      t.set(txRef, {
        userId,
        type: 'airtime',
        amount,
        details: { network, phone, provider },
        status: 'provider_pending',
        clientRequestId: clientRequestId || null,
        createdAt: new Date().toISOString(),
      });
    });

    const providerBase = process.env.PROVIDER_BASE_URL;
    const providerKey = process.env.VTU_PROVIDER_API_KEY;
    if (!providerBase || !providerKey) {
      // Refund if provider not configured
      await db.runTransaction(async (t: Transaction) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await t.get(userRef);
        const u = userSnap.data()!;
        const balance = u.walletBalance || 0;
        t.update(userRef, { walletBalance: balance + amount });
        t.update(db.collection('transactions').doc(txId), { status: 'failed', providerResponse: 'provider-not-configured', updatedAt: new Date().toISOString() });
      });
      return res.status(500).json({ success: false, message: 'provider-not-configured' });
    }

    // Call provider
    const resp = await fetch(`${providerBase}/airtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerKey}`,
      },
      body: JSON.stringify({ network, phone, amount }),
    });
    const text = await resp.text();

    if (!resp.ok) {
      // Refund wallet on failure
      await db.runTransaction(async (t: Transaction) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await t.get(userRef);
        const u = userSnap.data()!;
        const balance = u.walletBalance || 0;
        t.update(userRef, { walletBalance: balance + amount });
        t.update(db.collection('transactions').doc(txId), {
          status: 'failed',
          providerResponse: text,
          updatedAt: new Date().toISOString(),
        });
      });
      return res.status(400).json({ success: false, message: 'provider-failed', transactionId: txId });
    }

    // Success: add cashback and mark transaction success
    const cashback = amount * 0.03;
    await db.runTransaction(async (t: Transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await t.get(userRef);
      const u = userSnap.data()!;
      const currentCashback = u.cashbackBalance || 0;
      t.update(userRef, { cashbackBalance: currentCashback + cashback });
      t.update(db.collection('transactions').doc(txId), {
        status: 'success',
        cashbackEarned: cashback,
        providerResponse: text,
        updatedAt: new Date().toISOString(),
      });
    });

    return res.json({ success: true, message: 'Transaction successful', transactionId: txId });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'error' });
  }
});

app.post('/paystack/init', verifyIdToken, async (req: express.Request, res: express.Response) => {
  try {
    const uid = (req as any).uid as string;
    const { userId, amount, email } = req.body as { userId: string; amount: number; email: string };
    if (!userId || !amount || !email) return res.status(400).json({ success: false, message: 'invalid-payload' });
    if (uid !== userId) return res.status(401).json({ success: false, message: 'unauthorized' });
    const key = process.env.PAYSTACK_SECRET_KEY;
    const base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    if (!key) return res.status(500).json({ success: false, message: 'paystack-not-configured' });
    const amountKobo = Math.round(amount * 100);
    const initResp = await fetch(`${base}/transaction/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ amount: amountKobo, email }),
    });
    const initData = await initResp.json().catch(() => ({}));
    if (!initResp.ok || !initData?.data?.reference) return res.status(400).json({ success: false, message: 'init-failed' });
    const reference = initData.data.reference as string;
    const txRef = db.collection('transactions').doc();
    await txRef.set({
      userId,
      type: 'wallet_topup',
      amount,
      provider: 'paystack',
      providerReference: reference,
      status: 'init_pending',
      createdAt: new Date().toISOString(),
    });
    return res.json({ success: true, message: 'initialized', authorizationUrl: initData.data.authorization_url, reference, transactionId: txRef.id });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'error' });
  }
});

app.post('/paystack/verify', verifyIdToken, async (req: express.Request, res: express.Response) => {
  try {
    const uid = (req as any).uid as string;
    const { userId, reference } = req.body as { userId: string; reference: string };
    if (!userId || !reference) return res.status(400).json({ success: false, message: 'invalid-payload' });
    if (uid !== userId) return res.status(401).json({ success: false, message: 'unauthorized' });
    const key = process.env.PAYSTACK_SECRET_KEY;
    const base = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    if (!key) return res.status(500).json({ success: false, message: 'paystack-not-configured' });
    const vResp = await fetch(`${base}/transaction/verify/${reference}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const vData = await vResp.json().catch(() => ({}));
    if (!vResp.ok || vData?.data?.status !== 'success') return res.status(400).json({ success: false, message: 'verify-failed' });
    const amountKobo = Number(vData.data.amount || 0);
    const amount = Math.round(amountKobo) / 100;
    let txId = '';
    await db.runTransaction(async (t: Transaction) => {
      const existingQ = await db.collection('transactions')
        .where('provider', '==', 'paystack')
        .where('providerReference', '==', reference)
        .limit(1).get();
      if (!existingQ.empty) {
        const doc = existingQ.docs[0];
        const data = doc.data();
        if (data.status === 'success') {
          txId = doc.id;
          return;
        }
        txId = doc.id;
      }
      const userRef = db.collection('users').doc(userId);
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new Error('user-not-found');
      const u = userSnap.data()!;
      const balance = u.walletBalance || 0;
      t.update(userRef, { walletBalance: balance + amount });
      const txRef = txId ? db.collection('transactions').doc(txId) : db.collection('transactions').doc();
      if (!txId) txId = txRef.id;
      t.set(txRef, {
        userId,
        type: 'wallet_topup',
        amount,
        provider: 'paystack',
        providerReference: reference,
        status: 'success',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });
    return res.json({ success: true, message: 'verified', transactionId: txId });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'error' });
  }
});

app.post('/webhooks/paystack', express.raw({ type: 'application/json' }), async (req: express.Request, res: express.Response) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const sig = req.headers['x-paystack-signature'] as string || '';
    const raw = (req.body as Buffer).toString('utf8');
    const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    if (!secret || !sig || sig !== hash) return res.status(401).send('invalid-signature');
    const body = JSON.parse(raw);
    const event = body?.event || body?.event_type || '';
    const data = body?.data || body;
    const reference = String(data?.reference || data?.payment_reference || '');
    const amountKobo = Number(data?.amount || 0);
    const customerId = String(data?.customer?.customer_code || data?.metadata?.userId || '');
    if (!reference || !amountKobo) return res.status(200).send('ok');
    const amount = Math.round(amountKobo) / 100;
    if (event && String(event).toLowerCase().includes('success')) {
      let txId = '';
      await db.runTransaction(async (t: Transaction) => {
        const existingQ = await db.collection('transactions')
          .where('provider', '==', 'paystack')
          .where('providerReference', '==', reference)
          .limit(1).get();
        if (!existingQ.empty) {
          const doc = existingQ.docs[0];
          const data = doc.data();
          if (data.status === 'success') {
            txId = doc.id;
            return;
          }
          txId = doc.id;
        }
        const userId = customerId || (existingQ.empty ? '' : existingQ.docs[0].data().userId || '');
        if (!userId) throw new Error('userId-missing');
        const userRef = db.collection('users').doc(userId);
        const userSnap = await t.get(userRef);
        if (!userSnap.exists) throw new Error('user-not-found');
        const u = userSnap.data()!;
        const balance = u.walletBalance || 0;
        t.update(userRef, { walletBalance: balance + amount });
        const txRef = txId ? db.collection('transactions').doc(txId) : db.collection('transactions').doc();
        if (!txId) txId = txRef.id;
        t.set(txRef, {
          userId,
          type: 'wallet_topup',
          amount,
          provider: 'paystack',
          providerReference: reference,
          status: 'success',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
    }
    return res.status(200).send('ok');
  } catch {
    return res.status(200).send('ok');
  }
});

app.post('/monnify/create-account', verifyIdToken, async (req: express.Request, res: express.Response) => {
  try {
    const uid = (req as any).uid as string;
    const { userId, accountName, customerEmail, bankCode, currency } = req.body as { userId: string; accountName: string; customerEmail: string; bankCode?: string; currency?: string };
    if (!userId || !accountName || !customerEmail) return res.status(400).json({ success: false, message: 'invalid-payload' });
    if (uid !== userId) return res.status(401).json({ success: false, message: 'unauthorized' });
    const apiKey = process.env.MONNIFY_API_KEY;
    const secretKey = process.env.MONNIFY_SECRET_KEY;
    const base = process.env.MONNIFY_BASE_URL || 'https://api.monnify.com';
    if (!apiKey || !secretKey) return res.status(500).json({ success: false, message: 'monnify-not-configured' });
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const payload = {
      accountReference: userId,
      accountName,
      customerEmail,
      bankCode: bankCode || '035',
      currencyCode: currency || 'NGN',
    };
    const resp = await fetch(`${base}/v2/bank-transfer/reserved-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.requestSuccessful) return res.status(400).json({ success: false, message: 'create-failed' });
    const details = data?.responseBody || data;
    await db.collection('users').doc(userId).set({ virtualAccount: details, updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ success: true, message: 'account-created', details });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'error' });
  }
});

app.post('/webhooks/monnify', express.raw({ type: 'application/json' }), async (req: express.Request, res: express.Response) => {
  try {
    const secretKey = process.env.MONNIFY_SECRET_KEY || '';
    const sig = (req.headers['monnify-signature'] as string) || '';
    const raw = (req.body as Buffer).toString('utf8');
    const hash = crypto.createHmac('sha512', secretKey).update(raw).digest('hex');
    if (!secretKey || !sig || sig !== hash) return res.status(401).send('invalid-signature');
    const body = JSON.parse(raw);
    const event = String(body?.eventType || '').toLowerCase();
    if (event.includes('successful') || event.includes('payment')) {
      const data = body?.eventData || body?.data || body;
      const reference = String(data?.transactionReference || data?.paymentReference || '');
      const amount = Number(data?.amountPaid || data?.amount || 0);
      const userId = String(data?.customerEmail || data?.accountReference || '');
      if (reference && amount && userId) {
        let txId = '';
        await db.runTransaction(async (t: Transaction) => {
          const existingQ = await db.collection('transactions')
            .where('provider', '==', 'monnify')
            .where('providerReference', '==', reference)
            .limit(1).get();
          if (!existingQ.empty) {
            const doc = existingQ.docs[0];
            const data = doc.data();
            if (data.status === 'success') {
              txId = doc.id;
              return;
            }
            txId = doc.id;
          }
          const userRef = db.collection('users').doc(userId);
          const userSnap = await t.get(userRef);
          if (!userSnap.exists) throw new Error('user-not-found');
          const u = userSnap.data()!;
          const balance = u.walletBalance || 0;
          t.update(userRef, { walletBalance: balance + amount });
          const txRef = txId ? db.collection('transactions').doc(txId) : db.collection('transactions').doc();
          if (!txId) txId = txRef.id;
          t.set(txRef, {
            userId,
            type: 'wallet_topup',
            amount,
            provider: 'monnify',
            providerReference: reference,
            status: 'success',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        });
      }
    }
    return res.status(200).send('ok');
  } catch {
    return res.status(200).send('ok');
  }
});

app.post('/api/provider', verifyIdToken, async (req: express.Request, res: express.Response) => {
  try {
    const uid = (req as any).uid as string;
    const { userId, resource, payload } = req.body as { userId: string; resource: string; payload: Record<string, any> };
    if (!userId || !resource || !payload) return res.status(400).json({ success: false, message: 'invalid-payload' });
    if (uid !== userId) return res.status(401).json({ success: false, message: 'unauthorized' });
    const providerBase = process.env.PROVIDER_BASE_URL;
    const providerKey = process.env.VTU_PROVIDER_API_KEY;
    if (!providerBase || !providerKey) return res.status(500).json({ success: false, message: 'provider-not-configured' });
    const resp = await fetch(`${providerBase}/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${providerKey}` },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(async () => ({ raw: await resp.text() }));
    if (!resp.ok) return res.status(400).json({ success: false, message: 'provider-failed', data });
    return res.json({ success: true, data });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'error' });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
