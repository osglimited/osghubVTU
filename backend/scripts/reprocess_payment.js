const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the backend/.env file
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const { db } = require('../src/config/firebase');
const flutterwaveService = require('../src/services/flutterwaveService');
const walletService = require('../src/services/walletService');

async function reprocessPayment(tx_ref_or_id) {
  if (!tx_ref_or_id) {
    console.error('Please provide a transaction reference or ID as an argument.');
    process.exit(1);
  }

  console.log(`Starting reprocessing for: ${tx_ref_or_id}`);

  try {
    // 1. Try to find the payment in the DB to get the User ID
    // Note: The new flutterwaveService.creditIfValid logic handles verification,
    // but we might need the userId if it wasn't saved in the payment doc yet (though it should be).
    
    let userId;
    let paymentDoc = await db.collection('payments').doc(tx_ref_or_id).get();
    
    if (!paymentDoc.exists) {
      // Try searching by field if ID doesn't match
      const querySnapshot = await db.collection('payments').where('tx_ref', '==', tx_ref_or_id).limit(1).get();
      if (!querySnapshot.empty) {
        paymentDoc = querySnapshot.docs[0];
      }
    }

    if (paymentDoc.exists) {
      const data = paymentDoc.data();
      userId = data.userId;
      console.log(`Found existing payment record. User ID: ${userId}, Status: ${data.status}`);
      
      if (data.status === 'success') {
        console.log('Payment is already marked as success in the database.');
        // Ask if we should force credit? For now, let's just warn.
        // return; 
      }
    } else {
      console.log('Payment record not found in local DB. Will attempt to verify with Flutterwave directly.');
      // If we don't have the user ID, we can't credit the wallet. 
      // But maybe we can find it from the Flutterwave transaction metadata if available.
    }

    // 2. Call the service to verify and credit
    // We pass userId if we found it. If null, the service might fail if it can't find the user.
    // However, creditIfValid takes (referenceOrId, expectedAmount, userId).
    // If we don't know the amount or userId, we might need to fetch from FLW first.
    
    let amount;
    
    if (!userId || !amount) {
        // Fetch details from Flutterwave to fill in the gaps
        console.log('Fetching details from Flutterwave...');
        let verifyData;
        try {
            if (String(tx_ref_or_id).match(/^\d+$/)) {
                verifyData = await flutterwaveService.verifyById(tx_ref_or_id);
            } else {
                verifyData = await flutterwaveService.verifyByReference(tx_ref_or_id);
            }
        } catch (e) {
            console.error('Failed to verify with Flutterwave:', e.message);
            process.exit(1);
        }

        if (verifyData.status !== 'success') {
            console.error('Flutterwave says transaction is not successful:', verifyData);
            process.exit(1);
        }

        const data = verifyData.data;
        amount = data.amount;
        // Try to get userId from meta
        if (!userId && data.meta && data.meta.userId) {
            userId = data.meta.userId;
            console.log(`Retrieved User ID from Flutterwave meta: ${userId}`);
        }
    }

    if (!userId) {
        console.error('CRITICAL: Could not determine User ID for this transaction. Cannot credit wallet.');
        process.exit(1);
    }

    console.log(`Verifying and Crediting... User: ${userId}, Amount: ${amount}`);
    
    const result = await flutterwaveService.creditIfValid(tx_ref_or_id, amount, userId);
    
    if (result.success) {
        console.log('SUCCESS! User wallet has been credited.');
        console.log('Result:', result);
    } else {
        console.error('FAILED. The transaction could not be credited.');
        console.error('Result:', result);
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    process.exit(0);
  }
}

const args = process.argv.slice(2);
reprocessPayment(args[0]);
