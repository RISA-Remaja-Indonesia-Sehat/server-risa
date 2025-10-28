const Cycle = require("../models/cycle.model");
const DailyNote = require("../models/dailyNote.model");
const Insight = require("../models/insight.model");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const MOODS = ["senang", "sedih", "kesal", "cemas", "normal"];

const startOfJakartaDayUtc = (date) => {
  const timestamp = date.getTime() + JAKARTA_OFFSET_MS;
  const startTimestamp = Math.floor(timestamp / MS_PER_DAY) * MS_PER_DAY;
  return new Date(startTimestamp - JAKARTA_OFFSET_MS);
};

const getStart = (c) => new Date(c.start_date || c.start);
const getEnd = (c) =>
  c.end_date || c.end ? new Date(c.end_date || c.end) : null;

const calculateAverageCycleLength = (cyclesAsc) => {
  if (!cyclesAsc || cyclesAsc.length < 2) return null;
  let total = 0;
  let count = 0;
  for (let i = 1; i < cyclesAsc.length; i += 1) {
    const prev = getStart(cyclesAsc[i - 1]);
    const curr = getStart(cyclesAsc[i]);
    if (prev && curr) {
      const days = Math.round((curr.getTime() - prev.getTime()) / MS_PER_DAY);
      if (days > 0) {
        total += days;
        count += 1;
      }
    }
  }
  return count > 0 ? Math.round(total / count) : null;
};

const calculateAveragePeriodLength = (cyclesAsc) => {
  if (!cyclesAsc || cyclesAsc.length === 0) return null;
  let total = 0;
  let count = 0;
  for (const c of cyclesAsc) {
    const start = getStart(c);
    const end = getEnd(c);
    if (start && end) {
      const diff =
        Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
      if (diff > 0) {
        total += diff;
        count += 1;
      }
    }
  }
  return count > 0 ? Math.round(total / count) : null;
};

const buildCycleHistory = (cyclesDesc) => {
  return cyclesDesc.slice(0, 12).map((c) => ({
    id: c._id,
    start: new Date(c.start_date || c.start),
    end: c.end_date || c.end ? new Date(c.end_date || c.end) : null,
    periodLength: c.period_length ?? c.periodLength ?? null,
    cycleLength: c.cycle_length ?? c.cycleLength ?? null,
  }));
};

const buildMoodDistribution = async ({ userId, user_id }) => {
  const uid = user_id || userId;
  if (!uid) return {};

  const end = startOfJakartaDayUtc(new Date());
  const start = new Date(end.getTime() - (30 - 1) * MS_PER_DAY);
  const windowEnd = new Date(end.getTime() + MS_PER_DAY);

  const notes = await DailyNote.find({
    $or: [{ user_id: uid }, { userId: uid }],
    date: { $gte: start, $lt: windowEnd },
  }).lean();

  const distribution = {};
  for (const mood of MOODS) distribution[mood] = 0;

  for (const note of notes) {
    const mood =
      typeof note.mood === "string" ? note.mood.trim().toLowerCase() : null;
    if (mood && Object.prototype.hasOwnProperty.call(distribution, mood)) {
      distribution[mood] += 1;
    }
  }

  for (const mood of Object.keys(distribution)) {
    if (distribution[mood] === 0) delete distribution[mood];
  }
  return distribution;
};

const getInsightsForUser = async (userIdOrErd) => {
  try {
    const uid = userIdOrErd;
    if (!uid) {
      const e = new Error("UserId is required to get insights");
      e.code = "UNAUTHORIZED";
      throw e;
    }
    console.log("getInsightsForUser: Querying for user:", uid); // Tambah log
    let insights = await Insight.findOne({
      $or: [{ userId: uid }, { user_id: uid }],
    }).lean();
    console.log("getInsightsForUser: Found insights:", !!insights); // Log hasil
    if (!insights) {
      console.log("getInsightsForUser: Recomputing...");
      insights = await recomputeForUser(uid);
    }
    return insights;
  } catch (error) {
    console.error("Error in getInsightsForUser:", error); // Log error
    throw error;
  }
};

const recomputeForUser = async (userIdOrErd) => {
  try {
    const uid = userIdOrErd;
    if (!uid) {
      const e = new Error("UserId is required to recompute insights");
      e.code = "UNAUTHORIZED";
      throw e;
    }
    console.log("recomputeForUser: Starting for user:", uid);

    const cycles = await Cycle.find({
      $or: [{ user_id: uid }, { userId: uid }],
    }).lean();
    const cyclesAsc = [...cycles].sort(
      (a, b) =>
        new Date(a.start_date || a.start) - new Date(b.start_date || b.start)
    );
    const averageCycleLength = calculateAverageCycleLength(cyclesAsc);
    const averagePeriodLength = calculateAveragePeriodLength(cyclesAsc);

    const cyclesDesc = [...cyclesAsc].sort(
      (a, b) =>
        new Date(b.start_date || b.start) - new Date(a.start_date || a.start)
    );
    const moodDistributionLast30d = await buildMoodDistribution({
      user_id: uid,
    });
    const cycleHistory = buildCycleHistory(cyclesDesc);

    const payload = {
      userId: uid, // Pastikan konsisten dengan model
      averageCycleLength,
      averagePeriodLength,
      moodDistributionLast30d,
      cycleHistory,
    };

    // Perbaikan: Gunakan $or di findOneAndUpdate
    const updated = await Insight.findOneAndUpdate(
      { $or: [{ userId: uid }, { user_id: uid }] },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    console.log("recomputeForUser: Updated insights");
    return updated;
  } catch (error) {
    console.error("Error in recomputeForUser:", error);
    throw error;
  }
};

const predictNextPeriods = async (userIdOrErd, count = 3) => {
  try {
    const uid = userIdOrErd;
    if (!uid) {
      const e = new Error("UserId is required to predict next periods");
      e.code = "UNAUTHORIZED";
      throw e;
    }
    console.log("predictNextPeriods: Predicting for user:", uid);

    const cyclesDesc = await Cycle.find({
      $or: [{ user_id: uid }, { userId: uid }],
    }).lean();
    if (!cyclesDesc.length) return { nextStarts: [] };

    const cyclesAsc = [...cyclesDesc].sort(
      (a, b) =>
        new Date(a.start_date || a.start) - new Date(b.start_date || b.start)
    );
    const averageCycleLength = calculateAverageCycleLength(cyclesAsc);
    if (!averageCycleLength || averageCycleLength <= 0)
      return { nextStarts: [] };

    const limit = Math.max(1, Math.min(Number.parseInt(count, 10) || 3, 6));
    const nextStarts = [];
    let reference = new Date(
      cyclesDesc.sort(
        (a, b) =>
          new Date(b.start_date || b.start) - new Date(a.start_date || a.start)
      )[0].start_date || cyclesDesc[0].start
    );

    for (let i = 0; i < limit; i += 1) {
      reference = new Date(
        reference.getTime() + averageCycleLength * MS_PER_DAY
      );
      nextStarts.push({ start: new Date(reference) });
    }

    console.log("predictNextPeriods: Returning predictions");
    return { nextStarts };
  } catch (error) {
    console.error("Error in predictNextPeriods:", error);
    throw error;
  }
};

module.exports = {
  getInsightsForUser,
  recomputeForUser,
  predictNextPeriods,
};
