const { prisma } = require('../config/db');

const GRID_SIZE = 10;
const TOTAL_QUESTIONS = 8;

const generateCrossword = async (req, res) => {
  try {
    const clues = await prisma.crossword_Clue.findMany({
      where: { game_id: 3 },
      orderBy: { id: 'asc' }
    });
    
    if (clues.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada soal crossword di database'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        clues: clues.map(c => ({
          id: c.id,
          question: c.question,
          row: c.row,
          col: c.col,
          direction: c.direction,
          length: c.answer.length
        }))
      }
    });
  } catch (error) {
    console.error('Error generating crossword:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat crossword',
      error: error.message
    });
  }
};

const submitCrossword = async (req, res) => {
  const { user_id, answers, duration_seconds } = req.body;
  
  try {
    const clues = await prisma.crossword_Clue.findMany({
      where: { game_id: 3 }
    });
    
    let correctCount = 0;
    clues.forEach(clue => {
      if (answers[clue.id]?.toUpperCase() === clue.answer.toUpperCase()) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / clues.length) * 100);
    let pointsToAdd = 0;
    
    if (user_id) {
      // Check if user already played crossword
      const existingScore = await prisma.scores.findFirst({
        where: {
          user_id: parseInt(user_id),
          game_id: 3
        }
      });
      
      // Only add points if first time
      pointsToAdd = existingScore ? 0 : score;
      
      await prisma.scores.create({
        data: {
          user_id: parseInt(user_id),
          game_id: 3,
          points: pointsToAdd,
          duration_seconds: parseInt(duration_seconds) || 0,
          total_moves: clues.length,
          correct_answer: correctCount,
          wrong_answer: clues.length - correctCount
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        score,
        correct: correctCount,
        total: clues.length,
        pointsAwarded: pointsToAdd,
        answers: clues.map(clue => ({
          id: clue.id,
          question: clue.question,
          userAnswer: answers[clue.id] || '',
          correctAnswer: clue.answer,
          isCorrect: answers[clue.id]?.toUpperCase() === clue.answer.toUpperCase()
        }))
      }
    });
  } catch (error) {
    console.error('Error submitting crossword:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan jawaban',
      error: error.message
    });
  }
};

module.exports = {
  generateCrossword,
  submitCrossword
};
