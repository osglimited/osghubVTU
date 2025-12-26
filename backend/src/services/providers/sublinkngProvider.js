const axios = require('axios');

class SublinkngProvider {
  constructor() {
    this.name = 'SublinkNG';
    this.baseUrl = process.env.VTU_PROVIDER_URL || '';
    this.apiKey = process.env.VTU_PROVIDER_API_KEY || '';
  }

  _headers() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    return headers;
  }

  _assertConfigured() {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('VTU provider not configured');
    }
  }

  async purchaseAirtime(phone, amount, network, requestId) {
    this._assertConfigured();
    const payload = {
      phone,
      amount,
      network,
      requestId,
    };
    const url = `${this.baseUrl.replace(/\/+$/, '')}/airtime`;
    const res = await axios.post(url, payload, { headers: this._headers(), timeout: 10000 });
    const data = res.data || {};
    const success = data.success === true || String(data.status || '').toLowerCase() === 'success';
    return {
      success,
      reference: data.reference || data.transRef || data.transactionId || data.id || `SUBLINK_AIR_${Date.now()}`,
      message: data.message || (success ? 'Airtime purchase successful' : 'Airtime purchase failed'),
      raw: data,
      provider: this.name,
    };
  }

  async purchaseData(phone, planId, network, requestId) {
    this._assertConfigured();
    const payload = {
      phone,
      planId,
      network,
      requestId,
    };
    const url = `${this.baseUrl.replace(/\/+$/, '')}/data`;
    const res = await axios.post(url, payload, { headers: this._headers(), timeout: 10000 });
    const data = res.data || {};
    const success = data.success === true || String(data.status || '').toLowerCase() === 'success';
    return {
      success,
      reference: data.reference || data.transRef || data.transactionId || data.id || `SUBLINK_DATA_${Date.now()}`,
      message: data.message || (success ? 'Data purchase successful' : 'Data purchase failed'),
      raw: data,
      provider: this.name,
    };
  }
}

module.exports = new SublinkngProvider();
