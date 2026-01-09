const { db } = require('../config/firebase');
const flutterwaveService = require('../services/flutterwaveService');

/**
 * Reconciles pending payments by verifying them with Flutterwave
 * and crediting the user if successful.
 */
const reconcilePayments = async () => {
  console.log('[Cron] Starting payment reconciliation...');
  try {
    // 1. Get pending payments
    // Note: We query strictly by status and provider to avoid needing a complex composite index for now.
    // We will filter by createdAt (age check) in memory.
    const snapshot = await db.collection('payments')
      .where('status', '==', 'pending')
      .where('provider', '==', 'flutterwave')
      .limit(50) // Fetch a batch
      .get();

    if (snapshot.empty) {
      console.log('[Cron] No pending payments found to reconcile.');
      return;
    }

    // Process all pending payments immediately
    const docsToProcess = snapshot.docs;

    if (docsToProcess.length === 0) {
        console.log('[Cron] Found pending payments, but none are old enough to reconcile yet.');
        return;
    }

    console.log(`[Cron] Processing ${docsToProcess.length} pending payments (filtered from ${snapshot.size}).`);

    const results = await Promise.all(docsToProcess.map(async (doc) => {
      const data = doc.data();
      const tx_ref = data.tx_ref || doc.id;
      const userId = data.userId;
      const expectedAmount = data.amount;

      if (!userId) {
        console.warn(`[Cron] Payment ${doc.id} missing userId. Skipping.`);
        return { id: doc.id, status: 'skipped', reason: 'missing_userId' };
      }

      try {
        // Attempt verification
        // Note: creditIfValid handles db updates and wallet crediting
        const result = await flutterwaveService.creditIfValid(tx_ref, expectedAmount, userId);
        
        if (result.success) {
            console.log(`[Cron] Payment ${tx_ref} verified and credited.`);
            return { id: doc.id, status: 'success' };
        } else {
            // If it failed, check if it was actually failed or just pending/unknown
            // creditIfValid marks as 'failed' if status is explicitly failed/cancelled
            // If it's still pending at provider, we might want to leave it alone or eventually timeout
            return { id: doc.id, status: 'failed', data: result.data };
        }
      } catch (error) {
        console.error(`[Cron] Error reconciling payment ${tx_ref}:`, error.message);
        return { id: doc.id, status: 'error', error: error.message };
      }
    }));

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`[Cron] Reconciliation complete. Success: ${successCount}/${snapshot.size}`);

  } catch (error) {
    console.error('[Cron] Payment reconciliation failed:', error);
  }
};

module.exports = reconcilePayments;
