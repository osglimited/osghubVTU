const app = require('./app');
const { initCronJobs } = require('./cron');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initCronJobs();
});
