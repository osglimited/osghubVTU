import { getServiceBySlug } from '@/lib/services';
import { verifyTransactionPin } from './auth';
import { db } from '@/lib/firebase';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';

export interface AirtimePayload {
  userId: string;
  network: string;
  phone: string;
  amount: number;
  pin: string;
}

// Helper for atomic transaction with cashback
const processVTUTransaction = async (
  userId: string,
  amount: number,
  type: string,
  details: any
) => {
  return await runTransaction(db, async (transaction) => {
    // 1. Get User Doc
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error('User not found');

    const userData = userDoc.data();
    const currentBalance = userData.walletBalance || 0;

    // 2. Check Balance
    if (currentBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // 3. Calculate Cashback (3%)
    const cashbackAmount = amount * 0.03;

    // 4. Update Balances (Deduct main, Add cashback)
    const newMainBalance = currentBalance - amount;
    const currentCashback = userData.cashbackBalance || 0;
    const newCashbackBalance = currentCashback + cashbackAmount;

    transaction.update(userRef, {
      walletBalance: newMainBalance,
      cashbackBalance: newCashbackBalance,
      updatedAt: new Date().toISOString()
    });

    // 5. Create Transaction Record
    const transactionRef = doc(collection(db, 'transactions'));
    transaction.set(transactionRef, {
      userId,
      type,
      amount,
      status: 'completed',
      cashbackEarned: cashbackAmount,
      details,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });

    return { success: true, cashback: cashbackAmount };
  });
};

export const purchaseAirtime = async (payload: AirtimePayload) => {
  const service = await getServiceBySlug('airtime');
  if (!service || service.enabled === false) {
    throw new Error('Airtime service is not available');
  }
  const ok = await verifyTransactionPin(payload.userId, payload.pin);
  if (!ok) throw new Error('Invalid transaction PIN');

  await processVTUTransaction(payload.userId, payload.amount, 'airtime', {
    network: payload.network,
    phone: payload.phone
  });
};

export interface DataPayload {
  userId: string;
  network: string;
  planId: string;
  phone: string;
  amount: number;
  pin: string;
}

export const purchaseData = async (payload: DataPayload) => {
  const service = await getServiceBySlug('data');
  if (!service || service.enabled === false) {
    throw new Error('Data service is not available');
  }
  const ok = await verifyTransactionPin(payload.userId, payload.pin);
  if (!ok) throw new Error('Invalid transaction PIN');

  await processVTUTransaction(payload.userId, payload.amount, 'data', {
    network: payload.network,
    planId: payload.planId,
    phone: payload.phone
  });
};

export interface CablePayload {
  userId: string;
  provider: string;
  smartcardNumber: string;
  packageId: string;
  amount: number;
  pin: string;
}

export const purchaseCable = async (payload: CablePayload) => {
  const service = await getServiceBySlug('cable');
  if (!service || service.enabled === false) {
    throw new Error('Cable TV service is not available');
  }
  const ok = await verifyTransactionPin(payload.userId, payload.pin);
  if (!ok) throw new Error('Invalid transaction PIN');

  await processVTUTransaction(payload.userId, payload.amount, 'tv', {
    provider: payload.provider,
    smartcardNumber: payload.smartcardNumber,
    packageId: payload.packageId
  });
};

export interface ElectricityPayload {
  userId: string;
  disco: string;
  meterNumber: string;
  amount: number;
  pin: string;
}

export const purchaseElectricity = async (payload: ElectricityPayload) => {
  const service = await getServiceBySlug('electricity');
  if (!service || service.enabled === false) {
    throw new Error('Electricity service is not available');
  }
  const ok = await verifyTransactionPin(payload.userId, payload.pin);
  if (!ok) throw new Error('Invalid transaction PIN');

  await processVTUTransaction(payload.userId, payload.amount, 'electricity', {
    disco: payload.disco,
    meterNumber: payload.meterNumber
  });
};

export interface ExamPinsPayload {
  userId: string;
  examType: string;
  quantity: number;
  amount: number;
  pin: string;
}

export const purchaseExamPins = async (payload: ExamPinsPayload) => {
  const service = await getServiceBySlug('exam-pins');
  if (!service || service.enabled === false) {
    throw new Error('Exam PINs service is not available');
  }
  const ok = await verifyTransactionPin(payload.userId, payload.pin);
  if (!ok) throw new Error('Invalid transaction PIN');

  await processVTUTransaction(payload.userId, payload.amount, 'exam', {
    examType: payload.examType,
    quantity: payload.quantity
  });
};
