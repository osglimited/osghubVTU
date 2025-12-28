const axios = require('axios');

class SublinkngProvider {
  constructor() {
    this.name = 'SublinkNG';
    const sanitize = (v) => String(v || '').replace(/^[`'"\s]+|[`'"\s]+$/g, '').trim();
    this.baseUrl = sanitize(process.env.VTU_PROVIDER_URL) || 'https://app.sublinkng.com/api';
    this.apiKey = sanitize(process.env.VTU_PROVIDER_API_KEY) || '';
    this.airtimePath = this._normalizePath(sanitize(process.env.VTU_PROVIDER_AIRTIME_PATH) || '/airtime', 'airtime');
    this.dataPath = this._normalizePath(sanitize(process.env.VTU_PROVIDER_DATA_PATH) || '/data', 'data');
    this.authMethod = (process.env.VTU_PROVIDER_AUTH_METHOD || 'header:authorization').toLowerCase();
    this.includeAliases = String(process.env.VTU_PROVIDER_INCLUDE_ALIASES || 'false').toLowerCase() === 'true';
    this.networkMode = (process.env.VTU_PROVIDER_NETWORK_MODE || 'numeric').toLowerCase();
  }

  _normalizePath(p, type) {
    let s = String(p || '').trim();
    const absMatch = s.match(/^https?:\/\/[^/]+(\/.*)$/i);
    if (absMatch) s = absMatch[1];
    if (type === 'airtime') {
      if (/\/v1\/airtime/i.test(s) || /\/airtime\/purchase/i.test(s)) s = '/airtime';
    } else if (type === 'data') {
      if (/\/v1\/data/i.test(s) || /\/data\/purchase/i.test(s)) s = '/data';
    }
    s = s.startsWith('/') ? s : `/${s}`;
    return s.replace(/[`'"\s]+/g, '');
  }

  _headers() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      if (this.authMethod === 'header:authorization') headers['Authorization'] = `Bearer ${this.apiKey}`;
      else if (this.authMethod === 'header:x-api-key') headers['x-api-key'] = this.apiKey;
      else if (this.authMethod === 'header:api-key') headers['api-key'] = this.apiKey;
    }
    return headers;
  }

  _assertConfigured() {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('VTU provider not configured');
    }
  }

  _buildUrl(base, path) {
    const rawBase = String(base || '');
    const rawPath = String(path || '');
    const b = rawBase.replace(/^[`'"\s]+|[`'"\s]+$/g, '').replace(/\/+$/, '');
    let p = rawPath.replace(/^[`'"\s]+|[`'"\s]+$/g, '');
    const isAbsolute = /^https?:\/\//i.test(p);
    if (!isAbsolute) {
      p = p.startsWith('/') ? p : `/${p}`;
      if (b.endsWith('/api') && p.startsWith('/api')) {
        p = p.replace(/^\/api(\/|$)/, '/');
      }
    }
    let url = isAbsolute ? p : `${b}${p}`;
    if (this.authMethod === 'query') {
      url += (url.includes('?') ? '&' : '?') + `api_key=${encodeURIComponent(this.apiKey)}`;
    }
    url = url.replace(/\s+/g, '');
    return url;
  }

  async _post(paths, payload) {
    const base = this.baseUrl.replace(/\/+$/, '');
    const body = { ...payload };
    const headers = this._headers();
    const url = this._buildUrl(base, paths[0]);
    if (String(process.env.LOG_VTU_PROVIDER || '').toLowerCase() === 'true') {
      try {
        const safeBody = { ...body };
        if (safeBody.api_key) safeBody.api_key = '***';
        console.log('VTU Provider Request:', { url, body: safeBody, headers: { ...headers, Authorization: 'Bearer ***' } });
      } catch {}
    }
    const res = await axios.post(url, body, { headers, timeout: 15000 });
    return res.data || {};
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
    const alpha = map[n] || (n ? n.toUpperCase() : 'MTN');
    if (this.networkMode === 'numeric') {
      const numMap = { MTN: 1, GLO: 2, AIRTEL: 3, '9MOBILE': 4 };
      return numMap[alpha] || alpha;
    }
    return alpha;
  }

  _normalizeNetworkId(network) {
    const raw = String(network ?? '').trim();
    if (/^\d+$/.test(raw)) return Number(raw);
    const asAlpha = this._normalizeNetwork(raw);
    const numMap = { MTN: 1, GLO: 2, AIRTEL: 3, '9MOBILE': 4 };
    return numMap[asAlpha] || asAlpha;
  }

  _normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('234') && digits.length >= 13) return `0${digits.slice(3)}`;
    return digits;
  }

  async purchaseAirtime(phone, amount, network, requestId) {
    this._assertConfigured();
    const payload = {
      networkId: this._normalizeNetworkId(network),
      phone: this._normalizePhone(phone),
      amount
    };
    const data = await this._post([this.airtimePath], payload);
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
      networkId: this._normalizeNetworkId(network),
      planId,
      phone: this._normalizePhone(phone)
    };
    const data = await this._post([this.dataPath], payload);
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
