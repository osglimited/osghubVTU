const axios = require('axios');

class GenericVTUProvider {
  constructor() {
    this.name = process.env.VTU_PROVIDER_NAME || 'GenericProvider';
    this.baseUrl = process.env.VTU_PROVIDER_URL || 'https://api.vtuprovider.com';
    this.apiKey = process.env.VTU_PROVIDER_API_KEY || 'mock-key';
  }

  async _makeRequest(method, endpoint, data = {}) {
    if (process.env.USE_MOCK_PROVIDER === 'true') {
        return this._mockResponse(endpoint, data);
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        data
      });
      return response.data;
    } catch (error) {
      console.error(`Provider Error [${endpoint}]:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Provider request failed');
    }
  }

  _mockResponse(endpoint, data) {
    // Fallback mock logic if env var USE_MOCK_PROVIDER is set
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                reference: `MOCK_${Date.now()}`,
                message: 'Transaction Successful',
                provider: this.name
            });
        }, 500);
    });
  }

  async purchaseAirtime(phone, amount, network) {
    // Example payload - adjust based on real provider docs
    return this._makeRequest('POST', '/airtime', {
      phone,
      amount,
      network
    });
  }

  async purchaseData(phone, planId, network) {
    return this._makeRequest('POST', '/data', {
      phone,
      plan_id: planId,
      network
    });
  }

  async purchaseBill(customerId, amount, type, provider) {
    return this._makeRequest('POST', '/bill', {
      customer_id: customerId,
      amount,
      type,
      provider
    });
  }
}

module.exports = new GenericVTUProvider();
