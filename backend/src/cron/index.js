const cron = require('node-cron');
const reconcilePayments = require('./paymentReconciler');

const initCronJobs = () => {
  console.log('Initializing Cron Jobs...');

  // Run payment reconciliation every minute
  // Schedule: * * * * *
  cron.schedule('* * * * *', () => {
    reconcilePayments();
  });

  console.log('Cron Jobs scheduled: Payment Reconciliation (every 1 min)');
};

module.exports = { initCronJobs };
