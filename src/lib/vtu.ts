import { getServiceBySlug } from '@/lib/services';
import { deductWallet } from './wallet';
import { addTransaction } from './transactions';
import { verifyTransactionPin } from './auth';

export interface AirtimePayload {
  userId: string;
  network: string;
  phone: string;
  amount: number;
  pin: string;
}

export const purchaseAirtime = async (payload: AirtimePayload) => {
  const service = await getServiceBySlug('airtime');
  if (!service || service.enabled === false) {
    throw new Error('Airtime service is not available');
  }
  const ok = await verifyTransactionPin(payload.userId, payload.pin);
  if (!ok) throw new Error('Invalid transaction PIN');
  await deductWallet(payload.userId, payload.amount);
  await addTransaction({
    userId: payload.userId,
    type: 'airtime',
    amount: payload.amount,
    status: 'completed',
    details: { network: payload.network, phone: payload.phone },
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
  await deductWallet(payload.userId, payload.amount);
  await addTransaction({
    userId: payload.userId,
    type: 'data',
    amount: payload.amount,
    status: 'completed',
    details: { network: payload.network, planId: payload.planId, phone: payload.phone },
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
  await deductWallet(payload.userId, payload.amount);
  await addTransaction({
    userId: payload.userId,
    type: 'tv',
    amount: payload.amount,
    status: 'completed',
    details: { provider: payload.provider, smartcardNumber: payload.smartcardNumber, packageId: payload.packageId },
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
  await deductWallet(payload.userId, payload.amount);
  await addTransaction({
    userId: payload.userId,
    type: 'electricity',
    amount: payload.amount,
    status: 'completed',
    details: { disco: payload.disco, meterNumber: payload.meterNumber },
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
  await deductWallet(payload.userId, payload.amount);
  await addTransaction({
    userId: payload.userId,
    type: 'exam',
    amount: payload.amount,
    status: 'completed',
    details: { examType: payload.examType, quantity: payload.quantity },
  });
};
