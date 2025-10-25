const { prisma } = require('../config/db');

// Utility: Get current date in WIB (UTC+7)
const getCurrentDateWIB = () => {
  const now = new Date();
  // Add 7 hours offset for WIB
  now.setHours(now.getHours() + 7);
  return now;
};
// Utility: Get start of today in WIB
const getTodayWIB = () => {
  const nowWIB = getCurrentDateWIB();
  return new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate()); // Start of day in WIB
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
        missionDate: { gte: todayUTC, lt: tomorrowUTC } // Query in UTC
      },
      include: { mission: true }
    });

    if (!missionLog) return;

    // Increment progress
    const updatedLog = await prisma.mission_Log.update({
      where: { id: missionLog.id },
      data: { 
        progress: { increment: 1 },
        status: "in_progress" // Update status jika belum
      }
    });
    // Check completion
    if (updatedLog.progress >= missionLog.mission.target) {
      await prisma.mission_Log.update({
        where: { id: missionLog.id },
        data: { 
          completed: true,
          status: "completed"
        }
      });
    }
  } catch (error) {
    console.error('Error updating mission progress:', error);
  }
};

module.exports = {
  // createMissionLog
  createMissionLog: async (req, res) => {
    try {
        const userId = req.user.userId;
        const { mission_id } = req.body;

        if (!mission_id) {
            return res.status(400).json({ message: 'Mission ID is required' });
        }
        
        const missionLog = await prisma.mission_Log.create({
            data: {
                user_id: userId,
                mission_id: parseInt(mission_id),
                status: "in_progress"
            },
            include: {
                mission: true,
                user: { select: { id: true, name: true } }
            }
        });
        
        res.status(201).json({
            message: 'Mission log created successfully',
            data: missionLog,
        });
    } catch (error) {
        console.error('Error creating mission log:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
},
updateMissionLog: async (req, res) => {
    try {
        const { logId } = req.params;
        const userId = req.user.userId;
        
        if (!logId) {
            return res.status(400).json({ message: 'Mission log ID is required' });
        }
        
        // Verify mission log belongs to user
        const existingLog = await prisma.mission_Log.findFirst({
            where: { id: logId, user_id: userId }
        });
        
        if (!existingLog) {
            return res.status(404).json({ message: 'Mission log not found' });
        }
        
        const missionLog = await prisma.mission_Log.update({
            where: { id: logId },
            data: { 
                completed: true,
                status: "completed",
                claimedAt: new Date()
            },
            include: {
                mission: true,
                user: { select: { id: true, name: true } }
            }
        });
        
        res.status(200).json({
            message: 'Mission completed successfully',
            data: missionLog,
        });
    } catch (error) {
        console.error('Error updating mission log:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
},
getMissionLog: async (req, res) => {
    try {
        const { logId } = req.params;
        const userId = req.user.userId;
        
        if (!logId) {
            return res.status(400).json({ message: 'Mission log ID is required' });
        }
        
        const missionLog = await prisma.mission_Log.findFirst({
            where: { 
                id: logId,
                user_id: userId 
            },
            include: { 
                mission: true,
                user: { select: { id: true, name: true } }
            }
        });
        
        if (!missionLog) {
            return res.status(404).json({ message: 'Mission log not found' });
        }
        
        res.status(200).json({
            message: 'Mission log retrieved successfully',
            data: missionLog,
        });
    } catch (error) {
        console.error('Error fetching mission log:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
},
getAllMission: async (req, res) => {
    try {
        const missions = await prisma.mission.findMany();
        res.status(200).json({
            message: 'Missions retrieved successfully',
            data: missions,
        });
    } catch (error) {
        console.error('Error fetching missions:', error);
        res.status(500).json({ message: 'Internal server error' });
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
          missionDate: { gte: todayUTC, lt: tomorrowUTC }
        },
        include: { mission: true }
      });
      res.status(200).json({ message: 'Mission logs retrieved', data: logs });
    } catch (error) {
      console.error('Error fetching mission logs:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },
// New: Auto-create 2 random daily missions
  createDailyMissions: async (req, res) => {
    try {
      const userId = req.user.userId;
      const todayWIB = getTodayWIB();
      // Check existing logs (adjust query to WIB)
      const todayUTC = new Date(todayWIB);
      todayUTC.setHours(todayUTC.getHours() - 7);
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setDate(tomorrowUTC.getDate() + 1);
      const existingLogs = await prisma.mission_Log.count({
        where: { user_id: userId, missionDate: { gte: todayUTC, lt: tomorrowUTC } }
      });

       if (existingLogs >= 2) {
        return res.status(200).json({ message: 'Daily missions already exist' });
      }
      // Get all missions, select 2 random
      const allMissions = await prisma.mission.findMany();
      const randomMissions = allMissions.sort(() => 0.5 - Math.random()).slice(0, 2);
      // Create logs
      const logs = await Promise.all(randomMissions.map(mission =>
    prisma.mission_Log.create({
      data: { 
        user_id: userId, 
        mission_id: mission.id, 
        missionDate: todayWIB, // Ini akan disimpan sebagai UTC, tapi kita treat as WIB
        status: "idle"
      },
      include: { mission: true }
    })
  ));
      res.status(201).json({ message: 'Daily missions created', data: logs });
    } catch (error) {
      console.error('Error creating daily missions:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },
   // New: Endpoint for progress update (dipanggil dari frontend tracking)
  updateProgress: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { mission_id } = req.body;
      if (!mission_id) {
        return res.status(400).json({ message: 'Mission ID required' });
      }
      await updateMissionProgress(userId, parseInt(mission_id));
      // Return updated log
      const today = getToday();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const updatedLog = await prisma.mission_Log.findFirst({
        where: { user_id: userId, mission_id: parseInt(mission_id), missionDate: { gte: today, lt: tomorrow } },
        include: { mission: true }
      });
      res.status(200).json({ message: 'Progress updated', data: updatedLog });
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },
  // Export helper
  updateMissionProgress
};

