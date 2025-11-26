import express from 'express';
import { getFTUEProgress, markDialogComplete, isDialogCompleted } from '../controllers/ftue.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/progress', verifyToken, getFTUEProgress);
router.post('/mark-complete', verifyToken, markDialogComplete);
router.get('/is-completed', verifyToken, isDialogCompleted);

export default router;
