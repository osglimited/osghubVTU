const axios = require('axios');

class ProviderService {
  constructor() {
    this.baseUrl = process.env.VTU_PROVIDER_URL || 'https://iacafe.com.ng/devapi/v1';
    this.apiKey = process.env.VTU_PROVIDER_API_KEY ? process.env.VTU_PROVIDER_API_KEY.trim() : '';
  }

  _getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'OSGHUB-VTU/1.0'
    };
  }

  // Helper to map our internal network IDs/Names to Provider Service IDs
  _mapNetworkToServiceId(network) {
    // Handle if network is an object (e.g. from frontend select component)
    let netInput = network;
    if (typeof network === 'object' && network !== null) {
      netInput = network.value || network.id || network.name || network.label || JSON.stringify(network);
    }

    // OSGHUB might send "MTN", "mtn", "01", etc.
    // IA Café expects: "mtn", "airtel", "glo", "9mobile"
    const net = String(netInput).toLowerCase();
    
    if (net.includes('mtn') || net === '1' || net === '01') return 'mtn';
    if (net.includes('glo') || net === '2' || net === '02') return 'glo';
    if (net.includes('airtel') || net === '3' || net === '03') return 'airtel';
    if (net.includes('9mobile') || net.includes('etisalat') || net === '4' || net === '04') return '9mobile';
    
    return net; // fallback
  }

  // Helper to map network to ID for Budget Data (MTN=1, Glo=2, 9mobile=3, Airtel=4)
  _mapNetworkToId(network) {
    let netInput = network;
    if (typeof network === 'object' && network !== null) {
      netInput = network.value || network.id || network.name || network.label || JSON.stringify(network);
    }
    const net = String(netInput).toLowerCase();
    
    if (net.includes('mtn') || net === '1' || net === '01') return 1;
    if (net.includes('glo') || net === '2' || net === '02') return 2;
    if (net.includes('airtel') || net === '3' || net === '03') return 4;
    if (net.includes('9mobile') || net.includes('etisalat') || net === '4' || net === '04') return 3;
    
    return 1; // Default to MTN
  }

  /**
   * Purchase Airtime
   * Endpoint: POST /airtime
   */
  async purchaseAirtime(requestId, phone, amount, network) {
    if (!this.apiKey) {
      return { success: false, message: 'Provider API Key missing', apiResponse: null };
    }

    const serviceId = this._mapNetworkToServiceId(network);

    try {
      const payload = new URLSearchParams({
        request_id: requestId,
        phone: phone,
        service_id: serviceId,
        amount: String(amount)
      });

      console.log(`[Provider] Buying Airtime: ${serviceId} ${amount} for ${phone} (ReqID: ${requestId})`);

      const response = await axios.post(`${this.baseUrl}/airtime`, payload, {
        headers: this._getHeaders(),
        timeout: 30000 // 30s timeout
      });

      // IA Café Success Response:
      // { "code": "success", "message": "...", "data": { "status": "completed-api"|"processing-api", ... } }
      const data = response.data;
      
      if (data.code === 'success' || data.success === true) {
        const txData = data.data || {};
        const isSuccessful = txData.status === 'completed-api' || txData.status === 'processing-api';
        
        return {
          success: isSuccessful,
          transactionId: txData.order_id || requestId,
          message: data.message || 'Transaction Successful',
          apiResponse: data,
          status: txData.status // Return specific status for further handling if needed
        };
      } else {
        console.error('[Provider] Airtime API Returned Failure:', data);
        return {
          success: false,
          message: data.message || data.error?.message || 'Transaction Failed',
          apiResponse: data
        };
      }

    } catch (error) {
      const errData = error.response?.data || {};
      console.error('[Provider] Airtime Error:', errData);
      
      return {
        success: false,
        message: errData.error?.message || errData.message || error.message || 'Provider request failed',
        apiResponse: errData
      };
    }
  }

  /**
   * Purchase Data
   * Endpoint: POST /budget-data
   * Note: Requires `data_plan` (Plan ID) and `network_id`
   */
  async purchaseData(requestId, phone, planId, network) {
    if (!this.apiKey) {
      return { success: false, message: 'Provider API Key missing', apiResponse: null };
    }

    // Use integer ID for budget-data
    const networkId = this._mapNetworkToId(network);

    try {
      const payload = new URLSearchParams({
        request_id: requestId,
        phone: phone,
        network_id: String(networkId),
        data_plan: String(planId) // variation_id maps to data_plan
      });

      console.log(`[Provider] Buying Data (Budget): Net:${networkId} Plan:${planId} for ${phone} (ReqID: ${requestId})`);

      const response = await axios.post(`${this.baseUrl}/budget-data`, payload, {
        headers: this._getHeaders(),
        timeout: 30000
      });

      const data = response.data;

      if (data.code === 'success' || data.success === true) {
        const txData = data.data || {};
        const isSuccessful = txData.status === 'completed-api' || txData.status === 'processing-api';

        return {
          success: isSuccessful,
          transactionId: txData.order_id || requestId,
          message: data.message || 'Transaction Successful',
          apiResponse: data,
          status: txData.status
        };
      } else {
        console.error('[Provider] Data API Returned Failure:', data);
        return {
          success: false,
          message: data.message || data.error?.message || 'Transaction Failed',
          apiResponse: data
        };
      }

    } catch (error) {
      const errData = error.response?.data || {};
      console.error('[Provider] Data Error:', errData);
      return {
        success: false,
        message: errData.error?.message || errData.message || error.message || 'Provider request failed',
        apiResponse: errData
      };
    }
  }

  /**
   * Verify Customer (Electricity/TV)
   * Endpoint: POST /verify-customer
   */
  async verifyCustomer(customerId, serviceId, variationId = null) {
    try {
      const payloadObj = {
        customer_id: customerId,
        service_id: serviceId
      };
      // Electricity requires variation_id (prepaid/postpaid)
      if (variationId) {
        payloadObj.variation_id = variationId;
      }
      
      const payload = new URLSearchParams(payloadObj);

      const response = await axios.post(`${this.baseUrl}/verify-customer`, payload, {
        headers: this._getHeaders()
      });

      const data = response.data;
      if (data.code === 'success' || data.success === true) {
        return {
          success: true,
          data: data.data // { customer_name, customer_address, ... }
        };
      } else {
        return { success: false, message: data.message || data.error?.message };
      }
    } catch (error) {
      const errData = error.response?.data || {};
      return { success: false, message: errData.error?.message || error.message };
    }
  }

  /**
   * Purchase Electricity
   * Endpoint: POST /electricity
   */
  async purchaseElectricity(requestId, customerId, serviceId, variationId, amount) {
     try {
      const payload = new URLSearchParams({
        request_id: requestId,
        customer_id: customerId,
        service_id: serviceId, // e.g. "ikeja-electric"
        variation_id: variationId, // "prepaid" or "postpaid"
        amount: String(amount)
      });

      const response = await axios.post(`${this.baseUrl}/electricity`, payload, {
        headers: this._getHeaders()
      });

      const data = response.data;
      if (data.code === 'success' || data.success === true) {
         const txData = data.data || {};
         return {
            success: true,
            transactionId: txData.order_id,
            token: txData.token, // For prepaid
            message: data.message,
            apiResponse: data
         };
      } else {
        return { success: false, message: data.message || data.error?.message, apiResponse: data };
      }
    } catch (error) {
       const errData = error.response?.data || {};
       return { 
         success: false, 
         message: errData.error?.message || error.message, 
         apiResponse: errData 
       };
    }
  }

  /**
   * Purchase Cable TV
   * Endpoint: POST /cable
   */
  async purchaseCableTV(requestId, customerId, serviceId, variationId, amount = null) {
    try {
      const payloadObj = {
        request_id: requestId,
        customer_id: customerId,
        service_id: serviceId, // e.g. "dstv"
        variation_id: variationId // Plan ID e.g. "2701"
      };
      if (amount) payloadObj.amount = String(amount); // Optional, auto-fetched if null

      const payload = new URLSearchParams(payloadObj);

      const response = await axios.post(`${this.baseUrl}/cable`, payload, {
        headers: this._getHeaders()
      });

      const data = response.data;
      if (data.code === 'success' || data.success === true) {
         const txData = data.data || {};
         return {
            success: true,
            transactionId: txData.order_id,
            message: data.message,
            apiResponse: data
         };
      } else {
        return { success: false, message: data.message || data.error?.message, apiResponse: data };
      }
    } catch (error) {
       const errData = error.response?.data || {};
       return { 
         success: false, 
         message: errData.error?.message || error.message, 
         apiResponse: errData 
       };
    }
  }

}

module.exports = new ProviderService();
