const { prisma } = require('../config/db');

module.exports = {
    getAllLabs: async (req, res) => {
        try {
            const labs = await prisma.labs.findMany();
            res.status(200).json({
                message: 'Success',
                data: labs
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};