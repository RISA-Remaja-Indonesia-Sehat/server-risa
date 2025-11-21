const { prisma } = require("../config/db");

// Utility: Get current date in WIB (UTC+7)
const getCurrentDateWIB = () => {
  const now = new Date();
  // Add 7 hours offset for WIB
  now.setHours(now.getHours() + 7);
  return now;
};
// Utility: Get start of today in WIB (fix: reset time ke 00:00)
const getTodayWIB = () => {
  const nowWIB = getCurrentDateWIB();
  const today = new Date(
    nowWIB.getFullYear(),
    nowWIB.getMonth(),
    nowWIB.getDate()
  );
  today.setHours(0, 0, 0, 0); // Pastikan reset ke 00:00:00
  return today;
};

// Helper: Update mission progress (modifikasi: cek hari & ownership)
const updateMissionProgress = async (userId, missionId) => {
  try {
    const todayWIB = getTodayWIB();
    const tomorrowWIB = new Date(todayWIB);
    tomorrowWIB.setDate(tomorrowWIB.getDate() + 1);
    // Adjust to UTC for DB query (karena DB UTC, tapi kita filter berdasarkan WIB)
    const todayUTC = new Date(todayWIB);
    todayUTC.setHours(todayUTC.getHours() - 7); // Convert back to UTC for query
    const tomorrowUTC = new Date(tomorrowWIB);
    tomorrowUTC.setHours(tomorrowUTC.getHours() - 7);
    const missionLog = await prisma.mission_Log.findFirst({
      where: {
        user_id: userId,
        mission_id: missionId,
        missionDate: { gte: todayUTC, lt: tomorrowUTC }, // Query in UTC
      },
      include: { mission: true },
    });
    console.log(missionLog);
    if (!missionLog) return;

    // Tambah log
    console.log(
      "Updating progress for missionId:",
      missionId,
      "current progress before:",
      missionLog.progress
    );

    // Tambah log detail
    console.log(
      "Before update: progress =",
      missionLog.progress,
      "target =",
      missionLog.mission.target
    );

    const updatedLog = await prisma.mission_Log.update({
      where: { id: missionLog.id },
      data: {
        progress: { increment: 1 },
        status: "in_progress",
      },
    });

    console.log(
      "After increment: progress =",
      updatedLog.progress,
      "target =",
      missionLog.mission.target
    );

    if (updatedLog.progress >= missionLog.mission.target) {
      console.log("Setting completed to true");
      await prisma.mission_Log.update({
        where: { id: missionLog.id },
        data: {
          completed: true,
          status: "completed",
        },
      });
      // Re-fetch updated log
      const finalLog = await prisma.mission_Log.findFirst({
        where: { id: missionLog.id },
        include: { mission: true },
      });
      return finalLog; // Return yang benar
    } else {
      console.log("Not setting completed");
      return updatedLog;
    }
  } catch (error) {
    console.error("Error updating mission progress:", error);
  }
};

module.exports = {
  // createMissionLog
  createMissionLog: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { mission_id } = req.body;

      if (!mission_id) {
        return res.status(400).json({ message: "Mission ID is required" });
      }

      const missionLog = await prisma.mission_Log.create({
        data: {
          user_id: userId,
          mission_id: parseInt(mission_id),
          status: "in_progress",
        },
        include: {
          mission: true,
          user: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({
        message: "Mission log created successfully",
        data: missionLog,
      });
    } catch (error) {
      console.error("Error creating mission log:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  updateMissionLog: async (req, res) => {
    try {
      const { logId } = req.params;
      const userId = req.user.userId;

      if (!logId) {
        return res.status(400).json({ message: "Mission log ID is required" });
      }

      // Verify mission log belongs to user
      const existingLog = await prisma.mission_Log.findFirst({
        where: { id: logId, user_id: userId },
      });

      if (!existingLog) {
        return res.status(404).json({ message: "Mission log not found" });
      }

      const missionLog = await prisma.mission_Log.update({
        where: { id: logId },
        data: {
          completed: true,
          status: "completed",
          claimedAt: new Date(),
        },
        include: {
          mission: true,
          user: { select: { id: true, name: true } },
        },
      });

      res.status(200).json({
        message: "Mission completed successfully",
        data: missionLog,
      });
    } catch (error) {
      console.error("Error updating mission log:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  getMissionLog: async (req, res) => {
    try {
      const { logId } = req.params;
      const userId = req.user.userId;

      if (!logId) {
        return res.status(400).json({ message: "Mission log ID is required" });
      }

      const missionLog = await prisma.mission_Log.findFirst({
        where: {
          id: logId,
          user_id: userId,
        },
        include: {
          mission: true,
          user: { select: { id: true, name: true } },
        },
      });

      if (!missionLog) {
        return res.status(404).json({ message: "Mission log not found" });
      }

      res.status(200).json({
        message: "Mission log retrieved successfully",
        data: missionLog,
      });
    } catch (error) {
      console.error("Error fetching mission log:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  getAllMission: async (req, res) => {
    try {
      const missions = await prisma.mission.findMany();
      res.status(200).json({
        message: "Missions retrieved successfully",
        data: missions,
      });
    } catch (error) {
      console.error("Error fetching missions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  // New: Get all mission logs for user (filter hari ini)
  getAllMissionLogs: async (req, res) => {
    try {
      const userId = req.user.userId;
      const todayWIB = getTodayWIB();
      const todayUTC = new Date(todayWIB);
      todayUTC.setHours(todayUTC.getHours() - 7);
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setDate(tomorrowUTC.getDate() + 1);

      const logs = await prisma.mission_Log.findMany({
        where: {
          user_id: userId,
          missionDate: { gte: todayUTC, lt: tomorrowUTC },
        },
        include: { mission: true },
      });
      console.log("Today WIB:", getTodayWIB());
      console.log("Today UTC:", todayUTC);
      console.log("Tomorrow UTC:", tomorrowUTC);
      console.log("Logs found:", logs.length);
      res.status(200).json({ message: "Mission logs retrieved", data: logs });
    } catch (error) {
      console.error("Error fetching mission logs:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  // Auto-create 2 random daily missions
  createDailyMissions: async (req, res) => {
    try {
      const userId = req.user.userId;
      const todayWIB = getTodayWIB();
      const todayUTC = new Date(todayWIB);
      todayUTC.setHours(todayUTC.getHours() - 7);
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setDate(tomorrowUTC.getDate() + 1);

      // Cek existing logs hari ini
      const existingLogs = await prisma.mission_Log.count({
        where: {
          user_id: userId,
          missionDate: { gte: todayUTC, lt: tomorrowUTC },
        },
      });
      if (existingLogs >= 2) {
        return res
          .status(200)
          .json({ message: "Daily missions already exist for today" });
      }
      // Get all missions, select 2 random
      const allMissions = await prisma.mission.findMany();
      const randomMissions = allMissions
        .sort(() => 0.4 - Math.random())
        .slice(0, 2);
      // Create logs
      const logs = await Promise.all(
        randomMissions.map((mission) =>
          prisma.mission_Log.create({
            data: {
              user_id: userId,
              mission_id: mission.id,
              missionDate: todayWIB,
              status: "idle",
              completed: false,
            },
            include: { mission: true },
          })
        )
      );
      res.status(201).json({ message: "Daily missions created", data: logs });
    } catch (error) {
      console.error("Error creating daily missions:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  // Endpoint for progress update (dipanggil dari frontend tracking)
  updateProgress: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { mission_id } = req.body;
      if (!mission_id) {
        return res.status(400).json({ message: "Mission ID required" });
      }
      await updateMissionProgress(userId, parseInt(mission_id));
      // Return updated log
      const today = getTodayWIB();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const updatedLog = await prisma.mission_Log.findFirst({
        where: {
          user_id: userId,
          mission_id: parseInt(mission_id),
          missionDate: { gte: today, lt: tomorrow },
        },
        include: { mission: true },
      });
      res.status(200).json({ message: "Progress updated", data: updatedLog });
    } catch (error) {
      console.error("Error updating progress:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  updateMissionStatus: async (req, res) => {
  try {
    const { logId } = req.params;
    const userId = req.user.userId;
    const { status } = req.body; // Expect { status: "in_progress" }

    if (!logId || !status) {
      return res.status(400).json({ message: 'Log ID and status required' });
    }

    const existingLog = await prisma.mission_Log.findFirst({
      where: { id: logId, user_id: userId }
    });

    if (!existingLog) {
      return res.status(404).json({ message: 'Mission log not found' });
    }

    const missionLog = await prisma.mission_Log.update({
      where: { id: logId },
      data: { status }, // Only update status
      include: { mission: true }
    });

    res.status(200).json({
      message: 'Mission status updated successfully',
      data: missionLog,
    });
  } catch (error) {
    console.error('Error updating mission status:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
},
  // Export helper
  updateMissionProgress,
};
