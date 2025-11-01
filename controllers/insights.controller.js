const { insightService } = require('../services');
const { ensureUser, respondWithError } = require('./utils');

const getInsights = async (req, res) => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(401).json({ message: 'User authentication required for insights' });
    }
    const data = await insightService.getInsightsForUser(user_id);
    res.status(200).json({ message: 'Success', data });
  } catch (error) {
    respondWithError(res, error);
  }
};

const recomputeInsights = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const data = await insightService.recomputeForUser(user_id);
    res.status(200).json({ message: 'Recomputed', data });
  } catch (error) {
    respondWithError(res, error);
  }
};

module.exports = {
  getInsights,
  recomputeInsights,
};
