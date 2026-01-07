const axios = require('axios');

class ProviderService {
  constructor() {
    this.baseUrl = process.env.VTU_PROVIDER_URL;
    this.apiKey = process.env.VTU_PROVIDER_API_KEY;
  }

  async purchaseAirtime(requestId, phone, amount, network) {
    if (!this.baseUrl || !this.apiKey) {
      return { success: false, message: 'Provider not configured', apiResponse: null };
    }

    try {
      // Example implementation (Adjust fields according to your provider's docs)
      const response = await axios.post(`${this.baseUrl}/airtime`, {
        request_id: requestId,
        phone: phone,
        amount: amount,
        network_id: network,
        // Add other required fields
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        transactionId: response.data.id,
        message: 'Transaction Successful',
        apiResponse: response.data
      };
    } catch (error) {
      console.error('Provider Error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Provider failed',
        apiResponse: error.response?.data
      };
    }
  }

  async purchaseData(requestId, phone, planId, network) {
    if (!this.baseUrl || !this.apiKey) {
      return { success: false, message: 'Provider not configured', apiResponse: null };
    }

    // Real implementation
    try {
      const response = await axios.post(`${this.baseUrl}/data`, {
        request_id: requestId,
        phone: phone,
        plan_id: planId,
        network_id: network,
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return {
        success: true,
        transactionId: response.data.id,
        message: 'Data Purchase Successful',
        apiResponse: response.data
      };
    } catch (error) {
      return { success: false, message: 'Provider failed', apiResponse: error.response?.data };
    }
  }
}

module.exports = new ProviderService();
