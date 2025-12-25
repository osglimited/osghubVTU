const transactionService = require('../services/transactionService');
const Joi = require('joi');

const purchaseSchema = Joi.object({
  type: Joi.string().valid('airtime', 'data', 'bill', 'cable', 'electricity').required(),
  amount: Joi.number().positive().required(),
  details: Joi.object().required(), // Validate details based on type if needed
  requestId: Joi.string().optional()
});

const purchase = async (req, res) => {
  try {
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { uid } = req.user;
    const { type, amount, details, requestId } = value;

    const result = await transactionService.initiateTransaction(uid, type, amount, details, requestId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const history = await transactionService.getTransactions(uid);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  purchase,
  getHistory
};
