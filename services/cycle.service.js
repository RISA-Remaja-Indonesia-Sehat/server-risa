const mongoose = require("mongoose");
const Cycle = require("../models/cycle.model");
const DailyNote = require("../models/dailyNote.model");
const insightService = require("./insight.service");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const calculateInclusiveDays = (start, end) => {
  if (!start || !end) return null;
  if (start > end) {
    const e = new Error("Start date must be before or equal to end date");
    e.code = "INVALID_DATE_RANGE";
    throw e;
  }
  const diff = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return Math.max(1, diff);
};

const pickDate = (plain) => {
  return {
    start: plain.start_date
      ? new Date(plain.start_date)
      : plain.start
      ? new Date(plain.start)
      : null,
    end: plain.end_date
      ? new Date(plain.end_date)
      : plain.end
      ? new Date(plain.end)
      : null,
  };
};

const sanitizeCycle = (cycleDoc) => {
  if (!cycleDoc) return null;
  const plain =
    typeof cycleDoc.toObject === "function"
      ? cycleDoc.toObject()
      : { ...cycleDoc };
  const { start, end } = pickDate(plain);
  const periodLength =
    plain.period_length ??
    plain.periodLength ??
    (start && end ? calculateInclusiveDays(start, end) : null);
  const cycleLength = plain.cycle_length ?? plain.cycleLength ?? null;
  const predictedStart = plain.predicted_start_date
    ? new Date(plain.predicted_start_date)
    : plain.predictedStart
    ? new Date(plain.predictedStart)
    : null;

  const erd = {
    id: plain._id ? plain._id : undefined,
    user_id: plain.user_id ?? plain.userId,
    start_date: start,
    end_date: end ?? null,
    period_length: periodLength,
    cycle_length: cycleLength,
    predicted_start_date: predictedStart ?? null,
    created_at: plain.created_at ?? plain.createdAt ?? null,
    updated_at: plain.updated_at ?? plain.updatedAt ?? null,
  };

  return erd;
};

const findCycleForDate = (cycles, date) => {
  return cycles.find((cycle) => {
    const startRaw = cycle.start_date || cycle.start;
    const endRaw = cycle.end_date || cycle.end || startRaw;
    const start = new Date(startRaw);
    const end = endRaw ? new Date(endRaw) : start;
    return start <= date && date <= end;
  });
};

const recalculateCycleLengths = async (userIdOrErd) => {
  const userId = userIdOrErd;
  const cycles = await Cycle.find({
    $or: [{ user_id: userId }, { userId }],
  }).lean();
  cycles.sort(
    (a, b) =>
      new Date(a.start_date || a.start) - new Date(b.start_date || b.start)
  );
  if (!cycles.length) return;

  const bulkOps = [];
  for (let i = 0; i < cycles.length; i += 1) {
    const current = cycles[i];
    const update = {};

    const cStart = current.start_date
      ? new Date(current.start_date)
      : new Date(current.start);
    const cEnd = current.end_date
      ? new Date(current.end_date)
      : current.end
      ? new Date(current.end)
      : null;
    update.period_length = cEnd ? calculateInclusiveDays(cStart, cEnd) : null;

    if (i === 0) {
      update.cycle_length = null;
    } else {
      const previous = cycles[i - 1];
      const pStart = previous.start_date
        ? new Date(previous.start_date)
        : new Date(previous.start);
      const days = Math.round(
        (cStart.getTime() - pStart.getTime()) / MS_PER_DAY
      );
      update.cycle_length = days > 0 ? days : null;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: current._id },
        update: { $set: update },
      },
    });
  }

  if (bulkOps.length) {
    await Cycle.bulkWrite(bulkOps);
  }
};

const ensureNoOverlap = async ({ userId, start, end, excludeId }) => {
  const targetEnd = end ?? start;

  const base = {
    ...(excludeId
      ? { _id: { $ne: new mongoose.Types.ObjectId(excludeId) } }
      : {}),
  };

  const filterErd = {
    ...base,
    user_id: userId,
    $or: [
      { start_date: { $gte: start, $lte: targetEnd } },
      { end_date: { $gte: start, $lte: targetEnd } },
      { start_date: { $lte: start }, end_date: { $gte: targetEnd } },
      { start_date: { $lte: targetEnd }, end_date: null },
    ],
  };

  const filterLegacy = {
    ...base,
    userId,
    $or: [
      { start: { $gte: start, $lte: targetEnd } },
      { end: { $gte: start, $lte: targetEnd } },
      { start: { $lte: start }, end: { $gte: targetEnd } },
      { start: { $lte: targetEnd }, end: null },
    ],
  };

  const overlapping = await Cycle.findOne({
    $or: [filterErd, filterLegacy],
  }).lean();
  if (overlapping) {
    const error = new Error("Cycle overlaps with existing cycle");
    error.code = "CYCLE_OVERLAP";
    throw error;
  }
};

const createCycle = async ({
  user_id,
  start_date,
  end_date,
}) => {
  const uid = user_id;
  const startVal = start_date;
  const endVal = end_date;

  if (!uid || !startVal) {
    const e = new Error("Missing required fields for cycle creation");
    e.code = "INVALID_INPUT";
    throw e;
  }

  const normalizedStart = new Date(startVal);
  const normalizedEnd = endVal ? new Date(endVal) : null;

  if (normalizedEnd) calculateInclusiveDays(normalizedStart, normalizedEnd);

  // await ensureNoOverlap({
  //   user_id: uid,
  //   start_date: normalizedStart,
  //   end_date: normalizedEnd,
  //   excludeId: null,
  // });

  const cycle = await Cycle.create({
    user_id: uid,
    start_date: normalizedStart,
    end_date: normalizedEnd,
    period_length: normalizedEnd
      ? calculateInclusiveDays(normalizedStart, normalizedEnd)
      : null,
    cycle_length: null,
    predicted_start_date: null,
  });

  await recalculateCycleLengths(uid);
  const insights = await insightService.recomputeForUser(uid);

  return {
    cycle: sanitizeCycle(cycle),
    insights,
  };
};

const listCycles = async ({ user_id, limit = 90, before }) => {
  try {
    const uid = user_id;

    if (uid) {
    console.log("listCycles: Querying for user:", uid); // Tambah log
    } else {
      console.log("listCycles: No user id provided — returning general/public cycles");
      return [];  // Return empty jika tanpa auth
    }

    const query = { user_id: String(uid) };  // Gunakan user_id konsisten
    const raw = await Cycle.find({}).sort({ start_date: -1 })
    .limit(limit)
    .maxTimeMS(30000)  // Pastikan ini ada
    .lean();  // Gunakan .lean() untuk performa
    console.log("listCycles: Raw results count:", raw.length); // Log hasil query

    const items = raw
      .filter((doc) => {
        if (!before) return true;
        const ref = doc.start_date || doc.start;
        if (!ref) return false;
        return new Date(ref) < new Date(before);
      })
      .map(sanitizeCycle) // sanitizeCycle sekarang aman
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    const safeLimit = Math.min(
      Math.max(1, Number.parseInt(limit, 10) || 50),
      100
    );
    console.log(
      "listCycles: Returning items count:",
      items.slice(0, safeLimit).length
    ); // Log akhir
    return items.slice(0, safeLimit);
  } catch (error) {
    console.error("Error in listCycles:", error); // Log error detail
    throw error; // Lempar agar controller tangkap
  }
};

const updateCycle = async ({ userId, user_id, id, patch }) => {
  const uid = user_id || userId;
  if (!uid || !id) {
    const e = new Error("UserId and cycle id are required to update cycle");
    e.code = "INVALID_INPUT";
    throw e;
  }

  if (!patch || typeof patch !== "object") {
    const e = new Error("Patch payload required for cycle update");
    e.code = "INVALID_INPUT";
    throw e;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error("Invalid cycle id");
    e.code = "INVALID_CYCLE_ID";
    throw e;
  }

  const cycle = await Cycle.findOne({
    _id: id,
    $or: [{ user_id: uid }, { userId: uid }],
  });
  if (!cycle) return null;

  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  if (has(patch, "start_date") || has(patch, "start")) {
    const v = patch.start_date ?? patch.start;
    cycle.start_date = v ? new Date(v) : cycle.start_date;
  }
  if (has(patch, "end_date") || has(patch, "end")) {
    const v = patch.end_date ?? patch.end;
    cycle.end_date = v ? new Date(v) : null;
  }
  if (has(patch, "predicted_start_date") || has(patch, "predictedStart")) {
    const v = patch.predicted_start_date ?? patch.predictedStart;
    cycle.predicted_start_date = v ? new Date(v) : null;
  }

  if (cycle.end_date || cycle.end)
    calculateInclusiveDays(
      cycle.start_date || cycle.start,
      cycle.end_date || cycle.end
    );

  await ensureNoOverlap({
    userId: uid,
    start: cycle.start_date || cycle.start,
    end: cycle.end_date || cycle.end,
    excludeId: cycle._id.toString(),
  });

  cycle.period_length =
    cycle.end_date || cycle.end
      ? calculateInclusiveDays(
          cycle.start_date || cycle.start,
          cycle.end_date || cycle.end
        )
      : null;

  await cycle.save();
  await recalculateCycleLengths(uid);
  const fresh = await Cycle.findById(cycle._id).lean();
  const insights = await insightService.recomputeForUser(uid);

  return {
    cycle: sanitizeCycle(fresh),
    insights,
  };
};

const deleteCycle = async ({ userId, user_id, id }) => {
  const uid = user_id || userId;
  if (!uid || !id) {
    const e = new Error("UserId and cycle id are required to delete cycle");
    e.code = "INVALID_INPUT";
    throw e;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error("Invalid cycle id");
    e.code = "INVALID_CYCLE_ID";
    throw e;
  }

  const cycle = await Cycle.findOneAndDelete({
    _id: id,
    $or: [{ user_id: uid }, { userId: uid }],
  }).lean();
  if (!cycle) return null;

  if (cycle._id) {
    const cid = cycle._id.toString();
    await DailyNote.deleteMany({ $or: [{ cycle_id: cid }, { cycleId: cid }] });
  }

  await recalculateCycleLengths(uid);
  const insights = await insightService.recomputeForUser(uid);

  return {
    cycle: sanitizeCycle(cycle),
    insights,
  };
};

const deleteAllForUser = async ({ userId, user_id }) => {
  const uid = user_id || userId;
  if (!uid) {
    const e = new Error("UserId is required to delete cycles");
    e.code = "UNAUTHORIZED";
    throw e;
  }

  const cycles = await Cycle.find(
    { $or: [{ user_id: uid }, { userId: uid }] },
    { _id: 1 }
  ).lean();
  const cycleIds = cycles.map((c) => c._id?.toString()).filter(Boolean);

  let notesDeleted = 0;
  if (cycleIds.length) {
    const noteResult = await DailyNote.deleteMany({
      $or: [
        { user_id: uid, cycle_id: { $in: cycleIds } },
        { userId: uid, cycleId: { $in: cycleIds } },
      ],
    });
    notesDeleted = noteResult.deletedCount || 0;
  }

  const cycleResult = await Cycle.deleteMany({
    $or: [{ user_id: uid }, { userId: uid }],
  });
  const cyclesDeleted = cycleResult.deletedCount || 0;

  await recalculateCycleLengths(uid);
  const insights = await insightService.recomputeForUser(uid);

  return { cyclesDeleted, notesDeleted, insights };
};

const findCycleForDateByUser = async ({ userId, user_id, date }) => {
  const uid = user_id || userId;
  if (!uid || !date) return null;
  const normalized = new Date(date);
  const cycles = await Cycle.find({
    $or: [{ user_id: uid }, { userId: uid }],
  }).lean();
  return findCycleForDate(cycles, normalized);
};

module.exports = {
  createCycle,
  listCycles,
  updateCycle,
  deleteCycle,
  deleteAllForUser,
  findCycleForDateByUser,
  recalculateCycleLengths,
  sanitizeCycle,
};
