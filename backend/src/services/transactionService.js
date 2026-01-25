const { db } = require('../config/firebase');
const walletService = require('./walletService');
const cashbackService = require('./cashbackService');
const referralService = require('./referralService');
const notificationService = require('./notificationService');

const TRANSACTION_COLLECTION = 'transactions';

class TransactionService {
  
  async initiateTransaction(userId, type, amount, details, requestId) {
    const providerName = 'IACafe';
    const idempotencyKey = requestId || `REQ-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    // 1. Idempotency Check
    if (requestId) {
      const existing = await db.collection(TRANSACTION_COLLECTION)
        .where('requestId', '==', requestId)
        .limit(1)
        .get();
      
      if (!existing.empty) {
        return existing.docs[0].data();
      }
    }

    // 2. Ensure wallet exists & has sufficient balance (do not debit yet)
    await walletService.createWallet(userId);
    const bal = await walletService.getBalance(userId);
    if ((bal.mainBalance || 0) < amount) {
      throw new Error('Insufficient funds');
    }

    // 3. Create Transaction Record (Pending)
    const transactionRef = db.collection(TRANSACTION_COLLECTION).doc();
    let userPrice = Number(amount || 0);
    let providerCost = Number(amount || 0);
    let smsCost = 0;
    try {
      if (type === 'data' && details && details.planId) {
        const planSnap = await db.collection('service_plans').where('metadata.variation_id', '==', String(details.planId)).limit(1).get();
        if (!planSnap.empty) {
          const p = planSnap.docs[0].data();
          userPrice = Number(p.priceUser || userPrice);
          providerCost = Number(p.priceApi || providerCost);
        }
      } else if (type === 'airtime' && details && (details.network || details.networkId)) {
        try {
          const settingsDoc = await db.collection('admin_settings').doc('settings').get();
          const st = settingsDoc.exists ? settingsDoc.data() || {} : {};
          const airtimeNetworks = st.airtimeNetworks || {};
          const netKey = String(details.network || details.networkId || '').toString().toUpperCase();
          const discount = Number((airtimeNetworks[netKey] && airtimeNetworks[netKey].discount) || 0);
          const rate = (100 - discount) / 100;
          providerCost = Math.round(Number(amount || 0) * rate);
        } catch {}
      } else if (type === 'electricity' && details && (details.serviceId || details.provider)) {
        try {
          const sid = String(details.serviceId || details.provider || '').toLowerCase();
          const variation = String(details.variationId || details.variation || '').toLowerCase();
          const q = db.collection('service_plans')
            .where('type', '==', 'electricity')
            .where('metadata.service_id', '==', sid)
            .where('metadata.variation_id', '==', variation)
            .limit(1);
          const snap = await q.get();
          if (!snap.empty) {
            const p = snap.docs[0].data();
            userPrice = Number(p.priceUser || userPrice);
            providerCost = Number(p.priceApi || providerCost);
          }
        } catch {}
      } else if (type === 'cable' && details && (details.serviceId || details.provider) && details.variationId) {
        try {
          const sid = String(details.serviceId || details.provider || '').toLowerCase();
          const varId = String(details.variationId).toLowerCase();
          const q = db.collection('service_plans')
            .where('type', '==', 'cable')
            .where('metadata.service_id', '==', sid)
            .where('metadata.variation_id', '==', varId)
            .limit(1);
          const snap = await q.get();
          if (!snap.empty) {
            const p = snap.docs[0].data();
            userPrice = Number(p.priceUser || userPrice);
            providerCost = Number(p.priceApi || providerCost);
          }
        } catch {}
      }
    } catch {}
    const transactionData = {
      id: transactionRef.id,
      userId,
      type,
      amount,
      details,
      requestId: idempotencyKey,
      status: 'pending',
      createdAt: new Date(),
      provider: providerName,
      userPrice,
      providerCost,
      smsCost,
      serviceType: type
    };
    await transactionRef.set(transactionData);

    // 4. Debit Wallet
    try {
      const descriptor = details.phone || details.meterNumber || details.smartcardNumber || details.customerId || '';
      await walletService.debitWallet(userId, amount, 'main', `${type} Purchase: ${descriptor}`);
    } catch (error) {
      await transactionRef.update({ status: 'failed', failureReason: 'Debit failed' });
      throw error;
    }

    // 5. Call Provider
    try {
      const providerService = require('./providerService');
      let result;
      
      if (type === 'airtime') {
        result = await providerService.purchaseAirtime(idempotencyKey, details.phone, amount, details.network || details.networkId);
      } else if (type === 'data') {
        if (!details.planId) {
          throw new Error('Data plan ID (variation_id) is required for data purchase');
        }
        result = await providerService.purchaseData(idempotencyKey, details.phone, details.planId, details.network || details.networkId);
      } else if (type === 'electricity') {
        const customerId = details.customerId || details.meterNumber;
        const serviceId = details.serviceId || details.provider || details.network;
        const variationId = details.variationId || details.variation || 'prepaid';
        if (!customerId || !serviceId || !variationId) {
          throw new Error('Electricity requires customerId, serviceId, and variationId');
        }
        result = await providerService.purchaseElectricity(idempotencyKey, customerId, serviceId, variationId, amount);
      } else if (type === 'cable') {
        const customerId = details.customerId || details.smartcardNumber;
        const serviceId = details.serviceId || details.provider || details.network;
        const variationId = details.variationId || details.planId;
        if (!customerId || !serviceId || !variationId) {
          throw new Error('Cable TV requires customerId, serviceId, and variationId (plan id)');
        }
        result = await providerService.purchaseCableTV(idempotencyKey, customerId, serviceId, variationId, Number.isFinite(Number(amount)) ? Number(amount) : null);
      } else {
        // Fallback for other types
        result = { success: false, message: 'Service not implemented yet' };
      }

      if (result.success) {
        await transactionRef.update({
          status: 'success',
          providerTransactionId: result.transactionId,
          providerResponse: result.apiResponse,
          updatedAt: new Date()
        });
        try {
          const maskedPhone = String(details.phone || details.customerId || details.meterNumber || details.smartcardNumber || '').replace(/^(\d{0,7})/, '*******');
          const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Purchase Successful`;
          const body = `You purchased ${type} for ${maskedPhone}. Amount: ₦${amount}. Ref: ${result.transactionId}.`;
          await notificationService.sendNotification(userId, title, body);
          await notificationService.sendSms(details.phone, body);
          const unit = Number(process.env.SMS_UNIT_COST || 0);
          if (unit > 0) {
            smsCost = unit;
            await transactionRef.update({ smsCost });
          }
        } catch (notifyErr) {}
        return { ...transactionData, status: 'success', smsCost }
      } else {
        // Refund if provider fails
        await walletService.creditWallet(userId, amount, 'main', `Refund: ${type} failed`);
        await transactionRef.update({
          status: 'failed',
          failureReason: result.message,
          providerResponse: result.apiResponse,
          updatedAt: new Date()
        });
        
        // Return the actual provider error message for better debugging
        const providerOrderId = result.apiResponse && result.apiResponse.order_id 
          ? ` (Order ID: ${result.apiResponse.order_id})` 
          : '';
        
        const finalMessage = `${result.message || 'Provider transaction failed'}${providerOrderId}`;

        const err = new Error(finalMessage);
        err.statusCode = 400; // Explicitly set status code for controller
        if (result.message && result.message.toLowerCase().includes('token')) {
            // Keep the providerError flag for controller if needed, but allow message to pass through
            err.providerError = true;
        }
        throw err;
      }
    } catch (error) {
      // If the error was thrown above, it has the correct message.
      // If it's an unexpected error, we log it and rethrow.
      console.error('Transaction Processing Error:', error);
      throw error;
    }

  }

  async getTransactions(userId) {
    const snapshot = await db.collection(TRANSACTION_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  }
}

module.exports = new TransactionService();
