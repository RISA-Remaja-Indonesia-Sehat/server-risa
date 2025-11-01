const DailyNote = require("../models/dailyNote.model");
const { findCycleForDateByUser } = require("./cycle.service");
const insightService = require("./insight.service");
const { connectMongoDB } = require("../config/db");

const MOODS = ["senang", "sedih", "kesal", "cemas", "normal"];

const sanitizeDailyNote = (noteDoc) => {
  if (!noteDoc) return null;
  const plain =
    typeof noteDoc.toObject === "function"
      ? noteDoc.toObject()
      : { ...noteDoc };
  const symptomsStr = Array.isArray(plain.symptoms)
    ? plain.symptoms
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
        .join(", ")
    : typeof plain.symptoms === "string"
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
  if (!mood || typeof mood !== "string") return null;
  const value = mood.trim().toLowerCase();
  return MOODS.includes(value) ? value : null;
};

const normalizeFlowLevel = (flowLevel) => {
  if (flowLevel === null || flowLevel === undefined || flowLevel === "")
    return null;
  const numeric = Number.parseInt(flowLevel, 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) {
    const error = new Error("Flow level must be between 1 and 5");
    error.code = "INVALID_FLOW_LEVEL";
    throw error;
  }
  return numeric;
};

const normalizeSymptoms = (symptoms) => {
  if (symptoms === null || symptoms === undefined) return null;
  if (Array.isArray(symptoms)) {
    return symptoms
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .join(", ");
  }
  if (typeof symptoms === "string") return symptoms.trim();
  return null;
};

const toDate = (value) => {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error("Invalid date value");
    error.code = "INVALID_DATE";
    throw error;
  }
  return parsed;
};

const upsertDailyNote = async ({
  userId,
  user_id,
  date,
  mood,
  symptoms,
  flowLevel,
  menstrual_blood,
  story,
  cycle_id,
}) => {
  try {
    await connectMongoDB();
    const uid = user_id || userId;
    if (!uid) {
      const e = new Error("UserId is required to upsert daily note");
      e.code = "UNAUTHORIZED";
      throw e;
    }
    console.log("upsertDailyNote: Upserting for user:", uid);

    const normalizedDate = toDate(date);
    const normalizedMood = normalizeMood(mood);
    if (!normalizedMood) {
      const error = new Error("Invalid mood value");
      error.code = "INVALID_MOOD";
      throw error;
    }

    let cycleId = cycle_id ?? null;
    if (!cycleId) {
      const cycle = await findCycleForDateByUser({
        user_id: uid,
        date: normalizedDate,
      }).catch(() => null);
      cycleId = cycle?._id
        ? cycle._id.toString()
        : cycle?.id?.toString() ?? null;
    }

    const update = {
      user_id: uid,
      cycle_id: cycleId,
      mood: normalizedMood,
      story: typeof story === "string" ? story.trim() : null,
      symptoms: normalizeSymptoms(symptoms),
      menstrual_blood: normalizeFlowLevel(menstrual_blood ?? flowLevel),
    };

    const now = new Date();

    let note = await DailyNote.findOne({
      date: normalizedDate,
      user_id: uid,
    });
    if (note) {
      Object.assign(note, update);
      await note.save();
    } else {
      note = await DailyNote.create({
        ...update,
        date: normalizedDate,
        created_at: now,
      });
    }

    const insights = await insightService.recomputeForUser(uid);
    console.log("upsertDailyNote: Upserted note");
    return { note: sanitizeDailyNote(note), insights };
  } catch (error) {
    console.error("Error in upsertDailyNote:", error);
    throw error;
  }
};

const listDailyNotes = async ({ userId, user_id, from, to, limit = 120 }) => {
  try {
    await connectMongoDB();
    const uid = user_id || userId;
    // If a user id is provided, return that user's notes. If not, fall back to "general" data
    // (i.e. do not filter by user). This allows clients that don't specify a user to get global/public notes.
    let query = {};
    if (uid) {
      console.log("listDailyNotes: Querying for user:", uid);
      query = {  user_id: uid };
    } else {
      console.log("listDailyNotes: No user id provided — returning general/public daily notes");
      return [];
    }

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = toDate(from);
      if (to) query.date.$lte = toDate(to);
    }

    const notes = await DailyNote.find(query)
      .sort({ date: -1 })
      .limit(Math.max(1, Math.min(limit, 50)))
      .maxTimeMS(20000)  // Tambah timeout 20 detik untuk query ini
      .lean();
    console.log("listDailyNotes: Found notes count:", notes.length);
    return notes.map(sanitizeDailyNote);
  } catch (error) {
    console.error("Error in listDailyNotes:", error);
    throw error;
  }
};

const deleteDailyNote = async ({ userId, user_id, date }) => {
  try {
    await connectMongoDB();
    const uid = user_id || userId;
    if (!uid || !date) {
      const e = new Error("UserId and date are required to delete daily note");
      e.code = "INVALID_INPUT";
      throw e;
    }
    console.log("upsertDailyNote: Upserting for user:", uid);

    const normalizedDate = toDate(date);

    const note = await DailyNote.findOneAndDelete({
      date: normalizedDate,
      user_id: uid,
    }).lean();

    if (!note) return null;

    const insights = await insightService.recomputeForUser(uid);
    console.log("deleteDailyNote: Deleted note");
    return { note: sanitizeDailyNote(note), insights };
  } catch (error) {
    console.error("Error in deleteDailyNote:", error);
    throw error;
  }
};

const deleteAllForUser = async ({ userId, user_id }) => {
  try {
    await connectMongoDB();
    const uid = user_id || userId;
    if (!uid) {
      const e = new Error("UserId is required to delete daily notes");
      e.code = "UNAUTHORIZED";
      throw e;
    }
    console.log("upsertDailyNote: Upserting for user:", uid);

    const result = await DailyNote.deleteMany({
      user_id: uid ,
    });
    const notesDeleted = result.deletedCount || 0;
    const insights = await insightService.recomputeForUser(uid);
    console.log("upsertDailyNote: Upserted note");
    return { notesDeleted, insights };
  } catch (error) {
    console.error("Error in upsertDailyNote:", error);
    throw error;
  }
};

module.exports = {
  upsertDailyNote,
  listDailyNotes,
  deleteDailyNote,
  deleteAllForUser,
  sanitizeDailyNote,
};
