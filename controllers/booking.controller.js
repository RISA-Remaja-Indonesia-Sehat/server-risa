const { prisma } = require('../config/db');

module.exports = {
    getBookingDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const booking = await prisma.booking_Vaccine.findUnique({
                where: {
                    id: parseInt(id)
                },
                include: {
                    user: true,
                    lab: true,
                    vaccine: true
                }
            });
            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }
            res.status(200).json({
                message: 'Success',
                data: booking
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    createBooking: async (req, res) => {
        try {
            const { userId, nik, age, gender, labId, vaccineId, appointmentDate } = req.body;
            const newBooking = await prisma.booking_Vaccine.create({
                data: { 
                    user_id: userId, 
                    nik,
                    age,
                    gender,
                    lab_id: labId,
                    vaccine_id: vaccineId,
                    date_time: appointmentDate 
                }
            });
            res.status(201).json({
                message: 'Booking created successfully',
                data: newBooking
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};