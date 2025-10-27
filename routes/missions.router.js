const express = require('express');
const router = express.Router();
const { createMissionLog, 
  updateMissionLog, 
  getMissionLog, 
  getAllMission, 
  getAllMissionLogs, 
  createDailyMissions, 
  updateProgress,
  updateMissionStatus
 } = require('../controllers/missions.controller');
const { auth } = require('../middleware/auth');

// Public: Get all missions
router.get('/', getAllMission);

// Auth required: Mission logs
router.post('/log', auth, createMissionLog); // Create log (manual, if needed)
router.put('/log/:logId', auth, updateMissionLog); // Update specific log
router.put('/log/:logId/status', auth, updateMissionStatus); // Untuk update status saja
router.get('/log/:logId', auth, getMissionLog); // Get specific log
router.get('/log', auth, getAllMissionLogs); // Get all logs for user (hari ini)

// Auth required: Daily missions & progress
router.post('/daily', auth, createDailyMissions); // Auto-create daily missions
router.post('/progress', auth, updateProgress); // Update progress

module.exports = router;