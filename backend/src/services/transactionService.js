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
      await walletService.debitWallet(userId, amount, 'main', `${type} Purchase: ${details.phone}`);
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
          const maskedPhone = String(details.phone || '').replace(/^(\d{0,7})/, '*******');
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
