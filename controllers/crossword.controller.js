const { prisma } = require('../config/db');

const GRID_SIZE = 10;

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function canPlaceWord(grid, word, row, col, direction) {
  const word_upper = word.toUpperCase();
  
  if (direction === 'across') {
    if (col + word_upper.length > GRID_SIZE) return false;
    
    for (let i = 0; i < word_upper.length; i++) {
      const cell = grid[row][col + i];
      if (cell !== null && cell !== word_upper[i]) return false;
    }
    return true;
  } else {
    if (row + word_upper.length > GRID_SIZE) return false;
    
    for (let i = 0; i < word_upper.length; i++) {
      const cell = grid[row + i][col];
      if (cell !== null && cell !== word_upper[i]) return false;
    }
    return true;
  }
}

function placeWord(grid, word, row, col, direction) {
  const word_upper = word.toUpperCase();
  
  if (direction === 'across') {
    for (let i = 0; i < word_upper.length; i++) {
      grid[row][col + i] = word_upper[i];
    }
  } else {
    for (let i = 0; i < word_upper.length; i++) {
      grid[row + i][col] = word_upper[i];
    }
  }
}

function findPlacementPositions(grid, word) {
  const word_upper = word.toUpperCase();
  const positions = [];
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (canPlaceWord(grid, word, row, col, 'across')) {
        positions.push({ row, col, direction: 'across' });
      }
      if (canPlaceWord(grid, word, row, col, 'down')) {
        positions.push({ row, col, direction: 'down' });
      }
    }
  }
  
  return positions;
}

function generateCrosswordGrid(clues) {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  const placedWords = [];
  
  const sortedClues = [...clues].sort((a, b) => b.answer.length - a.answer.length);
  
  for (let i = 0; i < sortedClues.length; i++) {
    const clue = sortedClues[i];
    const word = clue.answer;
    let placed = false;
    
    if (placedWords.length === 0) {
      const startCol = Math.floor((GRID_SIZE - word.length) / 2);
      const startRow = Math.floor(GRID_SIZE / 2);
      
      if (canPlaceWord(grid, word, startRow, startCol, 'across')) {
        placeWord(grid, word, startRow, startCol, 'across');
        placedWords.push({
          ...clue,
          row: startRow,
          col: startCol,
          direction: 'across',
          length: word.length
        });
        placed = true;
      }
    } else {
      const positions = findPlacementPositions(grid, word);
      
      if (positions.length > 0) {
        const acrossCount = placedWords.filter(w => w.direction === 'across').length;
        const downCount = placedWords.filter(w => w.direction === 'down').length;
        
        let filteredPositions = positions;
        if (acrossCount > downCount) {
          filteredPositions = positions.filter(p => p.direction === 'down');
        } else if (downCount > acrossCount) {
          filteredPositions = positions.filter(p => p.direction === 'across');
        }
        
        if (filteredPositions.length === 0) {
          filteredPositions = positions;
        }
        
        const pos = filteredPositions[Math.floor(Math.random() * filteredPositions.length)];
        
        if (canPlaceWord(grid, word, pos.row, pos.col, pos.direction)) {
          placeWord(grid, word, pos.row, pos.col, pos.direction);
          placedWords.push({
            ...clue,
            row: pos.row,
            col: pos.col,
            direction: pos.direction,
            length: word.length
          });
          placed = true;
        }
      }
    }
  }
  
  return { grid, clues: placedWords };
}

const generateCrossword = async (req, res) => {
  try {
    const totalClues = await prisma.crossword_Clue.count();
    if (totalClues < 10) {
      return res.status(400).json({
        success: false,
        message: 'Tidak cukup soal di database (minimal 10)'
      });
    }
    
    const clues = await prisma.crossword_Clue.findMany({
      orderBy: { id: 'asc' },
      take: 10,
      skip: Math.floor(Math.random() * (totalClues - 10))
    });
    
    const { grid, clues: placedClues } = generateCrosswordGrid(clues);
    
    const formattedClues = placedClues.map(clue => ({
      id: clue.id,
      question: clue.question,
      answer: clue.answer,
      direction: clue.direction,
      row: clue.row,
      col: clue.col,
      length: clue.length
    }));
    
    res.status(200).json({
      success: true,
      data: {
        grid,
        clues: formattedClues
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
      where: {
        id: { in: Object.keys(answers).map(Number) }
      }
    });
    
    let correctCount = 0;
    clues.forEach(clue => {
      if (answers[clue.id]?.toUpperCase() === clue.answer.toUpperCase()) {
        correctCount++;
      }
    });
    
    const score = correctCount * 10;
    
    if (user_id) {
      await prisma.scores.create({
        data: {
          user_id: parseInt(user_id),
          game_id: 3,
          points: score,
          duration_seconds: duration_seconds || 0,
          total_moves: 10,
          correct_answer: correctCount,
          wrong_answer: 10 - correctCount
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        score,
        correct: correctCount,
        total: 10,
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
