const { prisma } = require('../config/db');

const getFTUEProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID not found in token' });
    }

    const progress = await prisma.fTUE_Progress.findUnique({
      where: { user_id: userId },
    });

    res.json({
      success: true,
      data: progress || { user_id: userId, completed_dialogs: [] },
    });
  } catch (error) {
    console.error('Error fetching FTUE progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const markDialogComplete = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID not found in token' });
    }
    const { dialogNumber } = req.body;

    let progress = await prisma.fTUE_Progress.findUnique({
      where: { user_id: userId },
    });

    if (!progress) {
      progress = await prisma.fTUE_Progress.create({
        data: {
          user_id: userId,
          completed_dialogs: [dialogNumber],
        },
      });
    } else {
      const completed = progress.completed_dialogs || [];
      if (!completed.includes(dialogNumber)) {
        completed.push(dialogNumber);
      }

      progress = await prisma.fTUE_Progress.update({
        where: { user_id: userId },
        data: { completed_dialogs: completed },
      });
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error marking dialog complete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const isDialogCompleted = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID not found in token' });
    }
    const { dialogNumber } = req.query;

    const progress = await prisma.fTUE_Progress.findUnique({
      where: { user_id: userId },
    });

    const completed = progress?.completed_dialogs?.includes(parseInt(dialogNumber)) || false;

    res.json({ success: true, completed });
  } catch (error) {
    console.error('Error checking dialog completion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getFTUEProgress, markDialogComplete, isDialogCompleted };
