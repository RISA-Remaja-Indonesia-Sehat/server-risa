const express = require('express');
const { auth } = require('../middleware/auth');
const { listCycles, createCycle, updateCycle, deleteCycle, deleteAllCycles, getPredictions } = require('../controllers/cycles.controller');
const { listDailyNotes, upsertDailyNote, deleteDailyNote, deleteAllDailyNotes } = require('../controllers/dailyNotes.controller');
const { getInsights, recomputeInsights } = require('../controllers/insights.controller');

const router = express.Router();

router.get('/cycles', listCycles);
router.post('/cycles', auth, createCycle);
router.patch('/cycles/:id', auth, updateCycle);
router.delete('/cycles', auth, deleteAllCycles);
router.delete('/cycles/:id', auth, deleteCycle);
router.get('/cycles/predictions', getPredictions);

router.get('/daily-notes', listDailyNotes);
router.put('/daily-notes/:date', auth,  upsertDailyNote);
router.delete('/daily-notes', auth, deleteAllDailyNotes);
router.delete('/daily-notes/:date', auth, deleteDailyNote);

router.get('/insights', getInsights);
router.post('/insights/recompute', auth, recomputeInsights);

module.exports = router;
