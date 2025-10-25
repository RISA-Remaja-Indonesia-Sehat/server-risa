const { cycleService, insightService } = require('../services');
const { parseDate, ensureUser, respondWithError } = require('./utils');

const listCycles = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { limit, before } = req.query;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedBefore = before ? parseDate(before, 'before') : undefined;

    const cycles = await cycleService.listCycles({
      user_id,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      before: parsedBefore,
    });

    res.status(200).json({
      message: 'Success',
      data: cycles,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

const createCycle = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { start_date, end_date, start, end } = req.body || {};

    const startInput = start_date ?? start;
    const endInput = end_date ?? end;

    if (!startInput) {
      return res.status(400).json({ message: 'Start date is required' });
    }

    const startDate = parseDate(startInput, 'start');
    const endDate = endInput ? parseDate(endInput, 'end') : null;

    if (endDate && startDate > endDate) {
      return res.status(400).json({ message: 'Start date must be before or equal to end date' });
    }

    const result = await cycleService.createCycle({
      user_id,
      start_date: startDate,
      end_date: endDate,
    });

    res.status(201).json({
      message: 'Created',
      data: result,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

const updateCycle = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { id } = req.params;
    const patch = req.body || {};

    if (!id) {
      return res.status(400).json({ message: 'Cycle id is required' });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(patch, 'start_date') || Object.prototype.hasOwnProperty.call(patch, 'start')) {
      const startValue = patch.start_date ?? patch.start;
      if (!startValue) {
        return res.status(400).json({ message: 'Start date cannot be empty' });
      }
      payload.start_date = parseDate(startValue, 'start');
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'end_date') || Object.prototype.hasOwnProperty.call(patch, 'end')) {
      const endValue = patch.end_date ?? patch.end;
      payload.end_date = endValue ? parseDate(endValue, 'end') : null;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'predicted_start_date') || Object.prototype.hasOwnProperty.call(patch, 'predictedStart')) {
      const predValue = patch.predicted_start_date ?? patch.predictedStart;
      payload.predicted_start_date = predValue ? parseDate(predValue, 'predicted_start_date') : null;
    }

    if (payload.start_date && payload.end_date && payload.start_date > payload.end_date) {
      return res.status(400).json({ message: 'Start date must be before or equal to end date' });
    }

    const result = await cycleService.updateCycle({
      user_id,
      id,
      patch: payload,
    });

    if (!result) {
      return res.status(404).json({ message: 'Cycle not found' });
    }

    res.status(200).json({
      message: 'Updated',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid cycle id') {
      error.code = 'INVALID_CYCLE_ID';
    }
    respondWithError(res, error);
  }
};

const deleteCycle = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Cycle id is required' });
    }

    const result = await cycleService.deleteCycle({
      user_id,
      id,
    });

    if (!result) {
      return res.status(404).json({ message: 'Cycle not found' });
    }

    res.status(200).json({
      message: 'Deleted',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid cycle id') {
      error.code = 'INVALID_CYCLE_ID';
    }
    respondWithError(res, error);
  }
};

const deleteAllCycles = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Bulk delete is disabled in production' });
    }

    const { confirm } = req.query || {};
    if (confirm !== 'ALL') {
      return res.status(400).json({ message: 'Set query parameter confirm=ALL to delete all cycles' });
    }

    const user_id = ensureUser(req);
    const result = await cycleService.deleteAllForUser({ user_id });

    res.status(200).json({
      message: 'All cycles deleted',
      data: result,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

const getPredictions = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { count } = req.query;
    const parsedCount = count ? Number.parseInt(count, 10) : undefined;

    const predictions = await insightService.predictNextPeriods(user_id, Number.isFinite(parsedCount) ? parsedCount : undefined);

    res.status(200).json({
      message: 'Success',
      data: predictions,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

module.exports = {
  listCycles,
  createCycle,
  updateCycle,
  deleteCycle,
  deleteAllCycles,
  getPredictions,
};
