const DailyNote = require('../models/dailyNote.model');
const { findCycleForDateByUser } = require('./cycle.service');
const insightService = require('./insight.service');

const MOODS = ['senang', 'sedih', 'kesal', 'cemas', 'normal'];

const sanitizeDailyNote = (noteDoc) => {
  if (!noteDoc) return null;
  const plain = typeof noteDoc.toObject === 'function' ? noteDoc.toObject() : { ...noteDoc };
  const symptomsStr = Array.isArray(plain.symptoms)
    ? plain.symptoms
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .join(', ')
    : typeof plain.symptoms === 'string'
    ? plain.symptoms
    : null;
  const erd = {
    id: plain._id ? plain._id.toString() : undefined,
    user_id: plain.user_id ?? plain.userId,
    cycle_id: plain.cycle_id ?? plain.cycleId ?? null,
    date: plain.date,
    mood: plain.mood,
    symptoms: symptomsStr,
    story: plain.story ?? null,
    menstrual_blood: plain.menstrual_blood ?? plain.menstrualBlood ?? null,
    created_at: plain.created_at ?? plain.createdAt ?? null,
  };
  return {
    ...erd,
    userId: erd.user_id,
    cycleId: erd.cycle_id,
    flowLevel: erd.menstrual_blood,
    createdAt: erd.created_at,
  };
};

const normalizeMood = (mood) => {
  if (!mood || typeof mood !== 'string') return null;
  const value = mood.trim().toLowerCase();
  return MOODS.includes(value) ? value : null;
};

const normalizeFlowLevel = (flowLevel) => {
  if (flowLevel === null || flowLevel === undefined || flowLevel === '') return null;
  const numeric = Number.parseInt(flowLevel, 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) {
    const error = new Error('Flow level must be between 1 and 5');
    error.code = 'INVALID_FLOW_LEVEL';
    throw error;
  }
  return numeric;
};

const normalizeSymptoms = (symptoms) => {
  if (symptoms === null || symptoms === undefined) return null;
  if (Array.isArray(symptoms)) {
    return symptoms
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
      .join(', ');
  }
  if (typeof symptoms === 'string') return symptoms.trim();
  return null;
};

const toDate = (value) => {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('Invalid date value');
    error.code = 'INVALID_DATE';
    throw error;
  }
  return parsed;
};

const upsertDailyNote = async ({ userId, user_id, date, mood, symptoms, flowLevel, menstrual_blood, story, cycle_id }) => {
  const uid = user_id || userId;
  if (!uid) {
    const e = new Error('UserId is required to upsert daily note');
    e.code = 'UNAUTHORIZED';
    throw e;
  }

  const normalizedDate = toDate(date);
  const normalizedMood = normalizeMood(mood);
  if (!normalizedMood) {
    const error = new Error('Invalid mood value');
    error.code = 'INVALID_MOOD';
    throw error;
  }

  let cycleId = cycle_id ?? null;
  if (!cycleId) {
    const cycle = await findCycleForDateByUser({ user_id: uid, date: normalizedDate }).catch(() => null);
    cycleId = cycle?._id ? cycle._id.toString() : cycle?.id?.toString() ?? null;
  }

  const update = {
    user_id: uid,
    cycle_id: cycleId,
    mood: normalizedMood,
    story: typeof story === 'string' ? story.trim() : null,
    symptoms: normalizeSymptoms(symptoms),
    menstrual_blood: normalizeFlowLevel(menstrual_blood ?? flowLevel),
  };

  const now = new Date();

  let note = await DailyNote.findOne({ date: normalizedDate, $or: [{ user_id: uid }, { userId: uid }] });
  if (note) {
    Object.assign(note, update);
    await note.save();
  } else {
    note = await DailyNote.create({ ...update, date: normalizedDate, created_at: now });
  }

  const insights = await insightService.recomputeForUser(uid);
  return {
    note: sanitizeDailyNote(note),
    insights,
  };
};

const listDailyNotes = async ({ userId, user_id, from, to, limit = 120 }) => {
  const uid = user_id || userId;
  if (!uid) {
    const e = new Error('UserId is required to list daily notes');
    e.code = 'UNAUTHORIZED';
    throw e;
  }

  const query = { $or: [{ user_id: uid }, { userId: uid }] };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = toDate(from);
    if (to) query.date.$lte = toDate(to);
  }

  const notes = await DailyNote.find(query)
    .sort({ date: -1 })
    .limit(Math.max(1, Math.min(limit, 365)))
    .lean();

  return notes.map(sanitizeDailyNote);
};

const deleteDailyNote = async ({ userId, user_id, date }) => {
  const uid = user_id || userId;
  if (!uid || !date) {
    const e = new Error('UserId and date are required to delete daily note');
    e.code = 'INVALID_INPUT';
    throw e;
  }

  const normalizedDate = toDate(date);

  const note = await DailyNote.findOneAndDelete({
    date: normalizedDate,
    $or: [{ user_id: uid }, { userId: uid }],
  }).lean();

  if (!note) return null;

  const insights = await insightService.recomputeForUser(uid);
  return {
    note: sanitizeDailyNote(note),
    insights,
  };
};

const deleteAllForUser = async ({ userId, user_id }) => {
  const uid = user_id || userId;
  if (!uid) {
    const e = new Error('UserId is required to delete daily notes');
    e.code = 'UNAUTHORIZED';
    throw e;
  }

  const result = await DailyNote.deleteMany({ $or: [{ user_id: uid }, { userId: uid }] });
  const notesDeleted = result.deletedCount || 0;
  const insights = await insightService.recomputeForUser(uid);

  return { notesDeleted, insights };
};

module.exports = {
  upsertDailyNote,
  listDailyNotes,
  deleteDailyNote,
  deleteAllForUser,
  sanitizeDailyNote,
};
