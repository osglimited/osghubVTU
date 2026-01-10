const axios = require('../backend/node_modules/axios').default || require('../backend/node_modules/axios');
require('../backend/node_modules/dotenv').config({ path: '../backend/.env' });

const BASE_URL = process.env.VTU_PROVIDER_URL || 'https://iacafe.com.ng/devapi/v1';
const API_KEY = process.env.VTU_PROVIDER_API_KEY;

console.log('Testing Provider API...');
console.log('URL:', BASE_URL);
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 5)}...` : 'MISSING');

async function testBalance() {
  try {
    console.log('\n--- Checking Balance ---');
    const response = await axios({
      method: 'get',
      url: `${BASE_URL}/balance`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log('Balance Success:', response.data);
  } catch (error) {
    console.error('Balance Failed:', error.response ? error.response.data : error.message);
  }
}

async function testDataVariations() {
  try {
    console.log('\n--- Checking MTN Data Variations ---');
    // IA Cafe usually uses service_id='mtn' for data variations check
    const response = await axios({
      method: 'get',
      url: `${BASE_URL}/variations?service_id=mtn&product=data`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY
      }
    });
    console.log('Variations Response:', JSON.stringify(response.data, null, 2));
    
    // Check for the specific plan we are trying to buy
    const variations = response.data.data ? (response.data.data.variations || response.data.data) : [];
    const targetPlan = variations.find(v => v.variation_id === '2676');
    if (targetPlan) {
      console.log('Target Plan (2676) FOUND:', targetPlan);
    } else {
      console.log('Target Plan (2676) NOT FOUND!');
    }
  } catch (error) {
    console.error('Variations Failed:', error.response ? error.response.data : error.message);
  }
}

async function testPurchaseAuth() {
  try {
    console.log('\n--- Testing Purchase Auth (Dry Run) ---');
    // We send a request with missing phone number to trigger a validation error
    // If we get "Invalid Token", then auth is broken for POST.
    // If we get "Phone required", then auth is working.
    console.log('API Key Length:', API_KEY.length);
     console.log('API Key Trimmed Length:', API_KEY.trim().length);

     const payload = {
       request_id: `TEST-${Date.now()}`,
       phone: '00000000000', // Invalid phone to avoid purchase but test auth
       service_id: 'mtn',
       variation_id: '2676'
     };
 
     const response = await axios({
       method: 'post',
       url: `${BASE_URL}/data`,
       data: payload,
       headers: {
         'Authorization': `Bearer ${API_KEY.trim()}`,
         'X-API-Key': API_KEY.trim(),
         'Content-Type': 'application/json',
         'User-Agent': 'OSGHUB-VTU/1.0'
       }
     });
    console.log('Purchase Auth Test Success (Unexpected):', response.data);
  } catch (error) {
    console.log('Purchase Auth Test Failed as expected.');
    console.log('Status:', error.response ? error.response.status : 'No Response');
    console.log('Data:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

async function testAirtimeAuth() {
  try {
    console.log('\n--- Testing Airtime Auth (Dry Run) ---');
    const payload = {
      request_id: `TEST-AIR-${Date.now()}`,
      phone: '00000000000',
      service_id: 'mtn',
      amount: 50
    };

    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/airtime`,
      data: payload,
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'X-API-Key': API_KEY.trim(),
        'Content-Type': 'application/json',
        'User-Agent': 'OSGHUB-VTU/1.0'
      }
    });
    console.log('Airtime Auth Test Success (Unexpected):', response.data);
  } catch (error) {
    console.log('Airtime Auth Test Failed as expected.');
    console.log('Status:', error.response ? error.response.status : 'No Response');
    console.log('Data:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

async function testPurchaseAuthOnlyHeader() {
  try {
    console.log('\n--- Testing Purchase Auth (Only X-API-Key) ---');
    const payload = {
      request_id: `TEST-KEY-${Date.now()}`,
      phone: '00000000000',
      service_id: 'mtn',
      variation_id: '2676'
    };

    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/data`,
      data: payload,
      headers: {
        'X-API-Key': API_KEY.trim(),
        'Content-Type': 'application/json',
        'User-Agent': 'OSGHUB-VTU/1.0'
      }
    });
    console.log('Purchase Auth (Key Only) Success:', response.data);
  } catch (error) {
    console.log('Purchase Auth (Key Only) Failed.');
    console.log('Status:', error.response ? error.response.status : 'No Response');
    console.log('Data:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

async function testPurchaseAuthBearerOnly() {
  try {
    console.log('\n--- Testing Purchase Auth (Only Bearer) ---');
    const payload = {
      request_id: `TEST-BEARER-${Date.now()}`,
      phone: '00000000000',
      service_id: 'mtn',
      variation_id: '2676'
    };

    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/data`,
      data: payload,
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OSGHUB-VTU/1.0'
      }
    });
    console.log('Purchase Auth (Bearer Only) Success:', response.data);
  } catch (error) {
    console.log('Purchase Auth (Bearer Only) Failed.');
    console.log('Status:', error.response ? error.response.status : 'No Response');
    console.log('Data:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

async function testPurchaseAuthNoBearer() {
  try {
    console.log('\n--- Testing Purchase Auth (Authorization: API_KEY) ---');
    const payload = {
      request_id: `TEST-NOBEARER-${Date.now()}`,
      phone: '00000000000',
      service_id: 'mtn',
      variation_id: '2676'
    };

    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/data`,
      data: payload,
      headers: {
        'Authorization': API_KEY.trim(),
        'Content-Type': 'application/json',
        'User-Agent': 'OSGHUB-VTU/1.0'
      }
    });
    console.log('Purchase Auth (No Bearer) Success:', response.data);
  } catch (error) {
    console.log('Purchase Auth (No Bearer) Failed.');
    console.log('Status:', error.response ? error.response.status : 'No Response');
    console.log('Data:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

async function testPurchaseAuthProdUrl() {
  try {
    console.log('\n--- Testing Purchase Auth (Prod URL: /api/v1) ---');
    const PROD_URL = 'https://iacafe.com.ng/api/v1';
    const payload = {
      request_id: `TEST-PROD-${Date.now()}`,
      phone: '00000000000',
      service_id: 'mtn',
      variation_id: '2676'
    };

    const response = await axios({
      method: 'post',
      url: `${PROD_URL}/data`,
      data: payload,
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OSGHUB-VTU/1.0'
      }
    });
    console.log('Purchase Auth (Prod URL) Success:', response.data);
  } catch (error) {
    console.log('Purchase Auth (Prod URL) Failed.');
    console.log('Status:', error.response ? error.response.status : 'No Response');
    console.log('Data:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

async function runTests() {
  await testBalance();
  await testPurchaseAuthNoBearer();
  await testPurchaseAuthProdUrl();
}

runTests();
