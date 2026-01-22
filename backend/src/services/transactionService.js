const { db } = require('../config/firebase');
const walletService = require('./walletService');
const cashbackService = require('./cashbackService');
const referralService = require('./referralService');
const notificationService = require('./notificationService');

const TRANSACTION_COLLECTION = 'transactions';
const SMS_LOGS_COLLECTION = 'sms_logs';
const SETTINGS_DOC = 'settings/global';

// Default USSD Codes (Nigeria) - NCC harmonized (2024+) and current
// Reference: Airtime balance *310#, Data balance *323# across MTN, Airtel, Glo, 9mobile
const DEFAULT_USSD_CODES = {
  AIRTIME: '*310#',
  DATA: '*323#',
  MTN_AIRTIME: '*310#',
  MTN_DATA: '*323#',
  GLO_AIRTIME: '*310#',
  GLO_DATA: '*323#',
  AIRTEL_AIRTIME: '*310#',
  AIRTEL_DATA: '*323#',
  '9MOBILE_AIRTIME': '*310#',
  '9MOBILE_DATA': '*323#'
};

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

    // 2. Calculate Prices First
    let userPrice = Number(amount || 0);
    let providerCost = Number(amount || 0);
    let smsCost = 0;

    try {
      if (type === 'data' && details && details.planId) {
        // Fetch Plan Price from DB
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
          
          // Apply User Discount
          if (discount > 0) {
            const userRate = (100 - discount) / 100;
            userPrice = Number((Number(amount || 0) * userRate).toFixed(2));
          }
          
          // Provider Cost Estimation (e.g., 3% flat discount for us, just an estimate)
          providerCost = Number((Number(amount || 0) * 0.97).toFixed(2));
        } catch {}
      }
    } catch {}

    // 3. Ensure wallet exists & has sufficient balance
    await walletService.createWallet(userId);
    const bal = await walletService.getBalance(userId);
    if ((bal.mainBalance || 0) < userPrice) {
      throw new Error(`Insufficient funds. Required: ₦${userPrice}`);
    }

    // 4. Create Transaction Record (Pending)
    const transactionRef = db.collection(TRANSACTION_COLLECTION).doc();
    const transactionData = {
      id: transactionRef.id,
      userId,
      type,
      amount, // Face Value
      details,
      requestId: idempotencyKey,
      status: 'pending',
      createdAt: new Date(),
      provider: providerName,
      userPrice, // Actual Charge
      providerCost,
      smsCost,
      serviceType: type
    };
    await transactionRef.set(transactionData);

    // 5. Debit Wallet
    try {
      await walletService.debitWallet(userId, userPrice, 'main', `${type} Purchase: ${details.phone}`);
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

        // --- SMS & Notification Logic Start ---
        try {
          // 1. Fetch SMS Configuration
          const settingsDoc = await db.doc(SETTINGS_DOC).get();
          const globalSettings = settingsDoc.exists ? settingsDoc.data() : {};
          const smsConfig = globalSettings.sms || {};
          const perService = (smsConfig.services || {});
          const isSmsEnabled = (smsConfig.enabled !== false) && (perService[type] !== false);
          
          const smsCharge = Number(smsConfig.charge !== undefined ? smsConfig.charge : 5); // Default 5

          // 2. Determine Balance Code
          let balanceCode = '';
          const net = (details.network || details.networkId || '').toString().toUpperCase();
          const svcType = type.toUpperCase(); // AIRTIME, DATA
          
          // Map input network to standard key
          let networkKey = '';
          if (net.includes('MTN') || net === '1') networkKey = 'MTN';
          else if (net.includes('GLO') || net === '2') networkKey = 'GLO';
          else if (net.includes('AIRTEL') || net === '3') networkKey = 'AIRTEL';
          else if (net.includes('9MOBILE') || net.includes('ETISALAT') || net === '4') networkKey = '9MOBILE';
          
          // Prefer admin-configured codes if available
          const codesConfig = (smsConfig.balanceCodes || {});
          const key1 = networkKey ? `${networkKey}_${svcType}` : '';
          const key2 = svcType;
          balanceCode = (key1 && codesConfig[key1]) || codesConfig[key2] || '';
          if (!balanceCode) {
            balanceCode = (key1 && DEFAULT_USSD_CODES[key1]) || DEFAULT_USSD_CODES[key2] || '';
          }

          // 3. Construct Message
          // Content: Service name, Amount, Phone/ID, Ref, Date, Balance Code
          const maskedPhone = String(details.phone || '').replace(/^(\d{0,7})/, '*******');
          const dateStr = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
          
          let body = `${type.toUpperCase()} Successful\nAmt: N${amount}\nTo: ${details.phone}\nRef: ${result.transactionId}\nDate: ${dateStr}`;
          if (balanceCode) body += `\nBal Code: ${balanceCode}`;
          if (details.token) body += `\nToken: ${details.token}`; // Electricity
          if (details.pin) body += `\nPin: ${details.pin}`; // Exam
          
          // Send In-App/Push Notification (Free)
          await notificationService.sendNotification(userId, `${type.toUpperCase()} Successful`, body);

          // 4. Charge & Send SMS
          if (isSmsEnabled) {
             // Charge User
             try {
                // Deduct SMS fee from wallet
                await walletService.debitWallet(userId, smsCharge, 'main', `SMS Charge: ${result.transactionId}`);
                
                // Send SMS
                await notificationService.sendSms(details.phone, body);
                
                // Log SMS
                smsCost = smsCharge; 
                
                await db.collection(SMS_LOGS_COLLECTION).add({
                   userId,
                   transactionId: result.transactionId,
                   serviceType: type,
                   cost: smsCharge,
                   status: 'sent',
                   createdAt: new Date(),
                   phone: details.phone,
                   message: body
                });

                // Update Transaction with SMS Cost
                await transactionRef.update({ smsCost });

             } catch (smsErr) {
                console.error('SMS Charge/Send Failed:', smsErr);
                // Log failure
                 await db.collection(SMS_LOGS_COLLECTION).add({
                   userId,
                   transactionId: result.transactionId,
                   serviceType: type,
                   cost: 0,
                   status: 'failed',
                   failureReason: smsErr.message,
                   createdAt: new Date(),
                   phone: details.phone
                });
             }
          }

        } catch (notifyErr) {
             console.error('Notification Logic Error:', notifyErr);
         }
         // --- SMS & Notification Logic End ---
 
         return { ...transactionData, status: 'success', smsCost, balanceCode, smsStatus: isSmsEnabled ? 'sent' : 'disabled' }
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
