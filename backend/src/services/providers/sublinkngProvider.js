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
    const base = this.baseUrl.replace(/\/+$/, '');
    const body = { ...payload };
    const headers = this._headers();
    let lastErr;
    for (const p of paths) {
      const url = `${base}${p}?api_key=${encodeURIComponent(this.apiKey)}`;
      try {
        const res = await axios.post(url, body, { headers, timeout: 12000 });
        return res.data || {};
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    throw lastErr || new Error('Provider request failed');
  }

  _normalizeNetwork(network) {
    const n = String(network || '').toLowerCase();
    const map = {
      mtn: 'mtn',
      'mtn nigeria': 'mtn',
      glo: 'glo',
      'glo nigeria': 'glo',
      airtel: 'airtel',
      'airtel nigeria': 'airtel',
      '9mobile': '9mobile',
      etisalat: '9mobile'
    };
    return map[n] || n || 'mtn';
  }

  _normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('234') && digits.length >= 13) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return digits;
    return digits;
  }

  async purchaseAirtime(phone, amount, network, requestId) {
    this._assertConfigured();
    const payload = {
      phone: this._normalizePhone(phone),
      amount,
      network: this._normalizeNetwork(network),
      requestId,
      api_key: this.apiKey
    };
    const data = await this._post(
      [this.airtimePath, '/v1/airtime', '/buy-airtime', '/airtime/purchase'],
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
      planId,
      network: this._normalizeNetwork(network),
      requestId,
      api_key: this.apiKey
    };
    const data = await this._post(
      [this.dataPath, '/v1/data', '/buy-data', '/data/purchase'],
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
