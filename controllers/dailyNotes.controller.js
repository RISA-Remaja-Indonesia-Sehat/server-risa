const { dailyNoteService } = require('../services');
const { parseDate, ensureUser, respondWithError } = require('./utils');

const listDailyNotes = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { from, to, limit } = req.query;

    const fromDate = from ? parseDate(from, 'from') : undefined;
    const toDate = to ? parseDate(to, 'to') : undefined;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({ message: '`from` must be before or equal to `to`' });
    }

    const notes = await dailyNoteService.listDailyNotes({
      user_id,
      from: fromDate,
      to: toDate,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });

    res.status(200).json({
      message: 'Success',
      data: notes,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

const upsertDailyNote = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { date } = req.params;
    const { mood, symptoms, flowLevel, story, menstrual_blood, cycle_id } = req.body || {};

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    if (!mood) {
      return res.status(400).json({ message: 'Mood is required' });
    }

    const noteDate = parseDate(date, 'date');

    const result = await dailyNoteService.upsertDailyNote({
      user_id,
      date: noteDate,
      mood,
      symptoms,
      menstrual_blood: menstrual_blood ?? flowLevel,
      story,
      cycle_id,
    });

    res.status(200).json({
      message: 'Upserted',
      data: result,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

const deleteDailyNote = async (req, res) => {
  try {
    const user_id = ensureUser(req);
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const noteDate = parseDate(date, 'date');

    const result = await dailyNoteService.deleteDailyNote({
      user_id,
      date: noteDate,
    });

    if (!result) {
      return res.status(404).json({ message: 'Daily note not found' });
    }

    res.status(200).json({
      message: 'Deleted',
      data: result,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

const deleteAllDailyNotes = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Bulk delete is disabled in production' });
    }

    const { confirm } = req.query || {};
    if (confirm !== 'ALL') {
      return res.status(400).json({ message: 'Set query parameter confirm=ALL to delete all daily notes' });
    }

    const user_id = ensureUser(req);
    const result = await dailyNoteService.deleteAllForUser({ user_id });

    res.status(200).json({
      message: 'All daily notes deleted',
      data: result,
    });
  } catch (error) {
    respondWithError(res, error);
  }
};

module.exports = {
  listDailyNotes,
  upsertDailyNote,
  deleteDailyNote,
  deleteAllDailyNotes,
};
