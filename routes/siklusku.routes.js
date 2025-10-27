const express = require('express');
const { auth } = require('../middleware/auth');
const { listCycles, createCycle, updateCycle, deleteCycle, deleteAllCycles, getPredictions } = require('../controllers/cycles.controller');
const { listDailyNotes, upsertDailyNote, deleteDailyNote, deleteAllDailyNotes } = require('../controllers/dailyNotes.controller');
const { getInsights, recomputeInsights } = require('../controllers/insights.controller');

const router = express.Router();

router.use(auth);

router.get('/cycles', listCycles);
router.post('/cycles', createCycle);
router.patch('/cycles/:id', updateCycle);
router.delete('/cycles', deleteAllCycles);
router.delete('/cycles/:id', deleteCycle);
router.get('/cycles/predictions', getPredictions);

router.get('/daily-notes', listDailyNotes);
router.put('/daily-notes/:date', upsertDailyNote);
router.delete('/daily-notes', deleteAllDailyNotes);
router.delete('/daily-notes/:date', deleteDailyNote);

router.get('/insights', getInsights);
router.post('/insights/recompute', recomputeInsights);

module.exports = router;
