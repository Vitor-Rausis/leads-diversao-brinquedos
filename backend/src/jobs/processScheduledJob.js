const { processScheduledMessages } = require('./whatsappJobs');
const dripService = require('../services/dripService');

async function run() {
  await Promise.all([
    processScheduledMessages(),
    dripService.processQueue(),
  ]);
}

module.exports = { run };

// Executado diretamente pelo GitHub Actions: node processScheduledJob.js
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
