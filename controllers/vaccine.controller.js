const { prisma } = require('../config/db');

module.exports = {
    getAllVaccine: async (req, res) => {
        try {
            const vaccine = await prisma.vaccine_Types.findMany();
            res.status(200).json({
                message: 'Success',
                data: vaccine
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};