import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
    await db.runTransaction(async (t: FirebaseFirestore.Transaction) => {
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
      await db.runTransaction(async (t: FirebaseFirestore.Transaction) => {
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
      await db.runTransaction(async (t) => {
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
    await db.runTransaction(async (t: FirebaseFirestore.Transaction) => {
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

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
