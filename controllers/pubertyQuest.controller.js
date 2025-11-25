const { prisma } = require("../config/db");

// Get user progress for all chapters
const getUserProgress = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const progress = await prisma.puberty_Quest_Progress.findMany({
      where: { userId },
      orderBy: { chapter: "asc" },
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get progress for specific chapter
const getChapterProgress = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { chapter } = req.params;

    const progress = await prisma.puberty_Quest_Progress.findUnique({
      where: {
        userId_chapter: {
          userId,
          chapter: parseInt(chapter),
        },
      },
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save chapter progress
const saveProgress = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { chapter, score, completed } = req.body;

    if (!chapter || score === undefined || completed === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: chapter, score, completed",
      });
    }

    if (
      typeof chapter !== "number" ||
      typeof score !== "number" ||
      typeof completed !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid field types",
      });
    }

    const progress = await prisma.puberty_Quest_Progress.upsert({
      where: {
        userId_chapter: {
          userId,
          chapter: parseInt(chapter),
        },
      },
      update: {
        score,
        completed,
        lastPlayedAt: new Date(),
      },
      create: {
        userId,
        chapter: parseInt(chapter),
        score,
        completed,
      },
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserProgress,
  getChapterProgress,
  saveProgress,
};
