const { prisma } = require('../config/db');

const validateScoreInput = (data) => {
    const { user_id, game_id, points, duration_seconds, total_moves, correct_answer } = data;
    
    if (
        !user_id || !game_id || typeof points === 'undefined' || typeof duration_seconds === 'undefined' || 
        typeof total_moves === 'undefined' || typeof correct_answer === 'undefined' ||
        isNaN(user_id) || isNaN(game_id) || isNaN(points) || isNaN(duration_seconds) || 
        isNaN(total_moves) || isNaN(correct_answer)
    ) {
        return { valid: false, message: 'Data skor tidak lengkap atau tipe data tidak valid (harus angka).' };
    }
    
    return { valid: true };
};


const getAllScores = async (req, res) => {
    try {
        const allScores = await prisma.scores.findMany();
        res.status(200).json({ success: true, count: allScores.length, data: allScores });
    } catch (error) {
        console.error("Error fetching all scores:", error.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil semua skor.', error: error.message });
    }
};

const submitScore = async (req, res) => {
    const { 
        user_id, game_id, points, duration_seconds, total_moves, correct_answer, wrong_answer, 
        feedback
    } = req.body;

    const validation = validateScoreInput(req.body);
    if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
    }

    try {
        const scoreRecord = await prisma.$transaction(async (tx) => {
            
          
            const score = await tx.scores.create({
                data: {
                    user_id: user_id,
                    game_id: game_id,
                    points: points,
                    duration_seconds: duration_seconds,
                    total_moves: total_moves,
                    correct_answer: correct_answer,
                    wrong_answer: wrong_answer,
                }
            });
            
            let feedbackRecord = null;
            
          
            if (feedback) {
                feedbackRecord = await tx.game_Feedback.create({
                    data: {
                        score_id: score.id,
                        error_details: feedback.error_details || {},
                        generated_tags: feedback.generated_tags || [],
                    }
                });
            }

            return { ...score, feedback: feedbackRecord };
        });

        res.status(201).json({ 
            success: true, 
            message: 'Skor dan Feedback berhasil disimpan.', 
            data: scoreRecord 
        });

    } catch (error) {
        
        if (error.code === 'P2003') {
             return res.status(400).json({ success: false, message: 'Game ID tidak ditemukan.', error: error.message });
        }
        console.error("Error submitting score:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menyimpan skor.',
            error: error.message
        });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        // PERHATIAN: Query ini mengasumsikan secara manual bahwa:
        // 1. Kolom Scores.user_id memiliki nilai ID yang valid di tabel Users.
        // 2. Nama kolom points di database fisik adalah 'score' (@map("score")).
        
        const leaderboard = await prisma.$queryRaw`
            SELECT
                t1.user_id AS "userId",
                t2.name AS "userName", 
                -- Menggunakan t1.score untuk mengakomodasi @map("score")
                CAST(SUM(t1.score) AS INTEGER) AS "totalPoints" 
            FROM 
                "Scores" t1
            INNER JOIN 
                "Users" t2 ON t1.user_id = t2.id
            GROUP BY 
                t1.user_id, t2.name
            ORDER BY 
                "totalPoints" DESC
            LIMIT 10;
        `;

        // Output dari $queryRaw sudah berupa array hasil, siap dikembalikan
        res.status(200).json({ 
            success: true, 
            count: leaderboard.length, 
            data: leaderboard 
        });

    } catch (error) {
        console.error("Error fetching global accumulated leaderboard:", error);
        
        // Peringatan yang lebih spesifik untuk membantu debugging user
        let message = 'Gagal mengambil data Leaderboard. Cek log server.';
        if (error.code === '42P01') {
            message = 'Tabel tidak ditemukan. Pastikan nama tabel (Scores/Users) sudah benar.';
        } else if (error.code === '42703') {
             // Meskipun sudah diperbaiki ke t1.score, jaga-jaga jika ada kolom lain yang salah
            message = `Kolom tidak ditemukan di database. Cek penamaan kolom SQL.`;
        }
        
        res.status(500).json({ 
            success: false, 
            message: message, 
            error: error.message 
        });
    }
};

              


const getMyScores = async (req, res) => {
    const userId = parseInt(req.query.user_id || req.params.userId); 
    
    if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'User ID tidak valid.' });
    }

    try {
        const myScores = await prisma.scores.findMany({
            where: { user_id: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                Game_Feedback: true,
                Mini_Game: { select: { title: true, type: true } }
            }
        });

        res.status(200).json({ success: true, count: myScores.length, data: myScores });

    } catch (error) {
        console.error(`Error fetching scores for user ${userId}:`, error.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat skor.', error: error.message });
    }
};



const deleteScore = async (req, res) => {
    const scoreId = parseInt(req.params.scoreId);


    if (isNaN(scoreId)) {
        return res.status(400).json({ success: false, message: 'ID skor tidak valid.' });
    }

    try {
        await prisma.scores.delete({
            where: { id: scoreId },
        });
        
        res.status(204).send(); 

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Skor tidak ditemukan.' });
        }
        console.error("Error deleting score:", error.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus skor.', error: error.message });
    }
};

const deleteAllScores = async (req, res) => {
    try {
        await prisma.scores.deleteMany({});
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting all scores:", error.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus semua skor.', error: error.message });
    }
};


module.exports = {
    submitScore,
    getLeaderboard,
    getMyScores,
    deleteScore,
    getAllScores,
    deleteAllScores
};