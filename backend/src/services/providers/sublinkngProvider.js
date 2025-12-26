const axios = require('axios');

class SublinkngProvider {
  constructor() {
    this.name = 'SublinkNG';
    this.baseUrl = process.env.VTU_PROVIDER_URL || '';
    this.apiKey = process.env.VTU_PROVIDER_API_KEY || '';
    this.airtimePath = process.env.VTU_PROVIDER_AIRTIME_PATH || '/airtime';
    this.dataPath = process.env.VTU_PROVIDER_DATA_PATH || '/data';
  }

  _headers() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
      headers['api-key'] = this.apiKey;
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  _assertConfigured() {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('VTU provider not configured');
    }
  }

  async _post(paths, payload) {
    const basePrimary = this.baseUrl.replace(/\/+$/, '');
    const baseCandidates = [
      basePrimary,
      'https://app.sublinkng.com/api',
      'https://app.sublinkng.com',
      'https://api.sublinkng.com',
      'https://sublinkng.com/api'
    ].filter(Boolean);
    const body = { ...payload };
    const headers = this._headers();
    let lastErr;
    for (const base of baseCandidates) {
      for (const p of paths) {
        let url = `${base.replace(/\/+$/, '')}${p}?api_key=${encodeURIComponent(this.apiKey)}`;
        url = url.replace(/[`'"\s]+/g, ''); // sanitize accidental quotes/backticks/spaces
        try {
          const res = await axios.post(url, body, { headers, timeout: 15000 });
          return res.data || {};
        } catch (e) {
          lastErr = e;
          continue;
        }
      }
    }
    throw lastErr || new Error('Provider request failed');
  }

  _normalizeNetwork(network) {
    const n = String(network || '').toLowerCase();
    const map = {
      mtn: 'MTN',
      'mtn nigeria': 'MTN',
      glo: 'GLO',
      'glo nigeria': 'GLO',
      airtel: 'AIRTEL',
      'airtel nigeria': 'AIRTEL',
      '9mobile': '9MOBILE',
      etisalat: '9MOBILE'
    };
    return map[n] || (n ? n.toUpperCase() : 'MTN');
  }

  _normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('234')) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return `234${digits.slice(1)}`;
    if (digits.length === 10) return `234${digits}`;
    return digits;
  }

  async purchaseAirtime(phone, amount, network, requestId) {
    this._assertConfigured();
    const payload = {
      phone: this._normalizePhone(phone),
      mobile_number: this._normalizePhone(phone),
      msisdn: this._normalizePhone(phone),
      amount,
      value: amount,
      network: this._normalizeNetwork(network),
      operator: this._normalizeNetwork(network),
      requestId,
      api_key: this.apiKey
    };
    const data = await this._post(
      [
        this.airtimePath,
        '/airtime',
        '/v1/airtime',
        '/buy-airtime',
        '/airtime/purchase',
        '/developer/airtime',
        '/developer/airtime/purchase',
        '/vtu/airtime',
        '/api/v1/airtime',
        '/api/v1/airtime/purchase'
      ],
      payload
    );
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
      phone: this._normalizePhone(phone),
      mobile_number: this._normalizePhone(phone),
      msisdn: this._normalizePhone(phone),
      planId,
      product_code: planId,
      network: this._normalizeNetwork(network),
      operator: this._normalizeNetwork(network),
      requestId,
      api_key: this.apiKey
    };
    const data = await this._post(
      [
        this.dataPath,
        '/data',
        '/v1/data',
        '/buy-data',
        '/data/purchase',
        '/developer/data',
        '/developer/data/purchase',
        '/vtu/data',
        '/api/v1/data',
        '/api/v1/data/purchase'
      ],
      payload
    );
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
