const axios = require('axios');
const { db } = require('../config/firebase');
const walletService = require('./walletService');

const FLW_API = 'https://api.flutterwave.com/v3';

class FlutterwaveService {
  constructor() {
    if (!process.env.FLW_SECRET_KEY) {
      console.warn('Warning: FLW_SECRET_KEY is not set. Payments will fail.');
    }
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FLW_SECRET_KEY || ''}`,
    };
  }

  _genRef(prefix = 'FLW') {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${ts}-${rnd}`;
  }

  async initiatePayment(userId, amount, customer = {}, redirectUrl) {
    const tx_ref = this._genRef('DEP');
    const body = {
      tx_ref,
      amount,
      currency: 'NGN',
      redirect_url: redirectUrl || process.env.FLW_REDIRECT_URL || 'https://osghub.com/payment-complete',
      customer: {
        email: customer.email || 'user@osghub.com',
        name: customer.name || 'OSGHUB User',
        phonenumber: customer.phone || undefined,
      },
      meta: {
        userId,
        purpose: 'wallet_funding',
      },
      payment_options: 'card,banktransfer,ussd',
    };
    const res = await axios.post(`${FLW_API}/payments`, body, { headers: this._headers(), timeout: 15000 });
    const data = res.data || {};

    await db.collection('payments').doc(tx_ref).set({
      tx_ref,
      userId,
      amount,
      status: 'pending',
      provider: 'flutterwave',
      createdAt: new Date(),
      link: data?.data?.link || null,
    });

    return { tx_ref, link: data?.data?.link, data };
  }

  async verifyById(id) {
    const res = await axios.get(`${FLW_API}/transactions/${id}/verify`, { headers: this._headers(), timeout: 15000 });
    return res.data || {};
  }

  async verifyByReference(tx_ref) {
    const res = await axios.get(`${FLW_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`, { headers: this._headers(), timeout: 15000 });
    return res.data || {};
  }

  async creditIfValid(referenceOrId, expectedAmount, userId) {
    let verify;
    try {
      if (String(referenceOrId).match(/^\d+$/)) {
        verify = await this.verifyById(referenceOrId);
      } else {
        verify = await this.verifyByReference(referenceOrId);
      }
    } catch (error) {
      console.warn(`[Flutterwave Verify Error] Ref: ${referenceOrId} - ${error.message}`);
      if (error.response && (error.response.status === 400 || error.response.status === 404)) {
        // Invalid reference or not found. Mark as failed so we don't retry forever.
         await db.collection('payments').doc(String(referenceOrId)).update({
          status: 'failed',
          verifiedAt: new Date(),
          providerResponse: { error: error.message, status: error.response.status }
        });
        return { success: false, error: 'Payment not found or invalid reference' };
      }
      throw error; // Rethrow other errors (500s, network) to be handled by caller
    }

    const status = verify?.status;
    const vdata = verify?.data || {};
    const successful = status === 'success' && (vdata.status === 'successful' || vdata.processor_response === 'Approved');
    const amountOk = Number(vdata.amount) >= Number(expectedAmount);

    if (successful && amountOk) {
      await walletService.createWallet(userId);
      await walletService.creditWallet(userId, Number(expectedAmount), 'main', 'Flutterwave Wallet Funding');
      await db.collection('payments').doc(vdata.tx_ref || referenceOrId).update({
        status: 'success',
        verifiedAt: new Date(),
        providerResponse: vdata,
      });
      return { success: true, data: vdata };
    } else {
      console.warn(`[Payment Verification Failed] Ref: ${referenceOrId}, User: ${userId}, Status: ${status}, AmountOk: ${amountOk} (Exp: ${expectedAmount}, Act: ${vdata.amount})`);
      await db.collection('payments').doc(vdata.tx_ref || referenceOrId).update({
        status: 'failed',
        verifiedAt: new Date(),
        providerResponse: vdata,
      });
      return { success: false, data: vdata };
    }
  }
}

module.exports = new FlutterwaveService();
