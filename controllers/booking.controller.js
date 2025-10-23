const { prisma } = require('../config/db');

module.exports = {
    getBookingDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const booking = await prisma.booking_Vaccine.findUnique({
                where: {
                    id: id
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
            // 1. Extract user_id dari JWT token
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const userId = req.user.userId;
            
            // 2. Get user data untuk user_name
            const user = await prisma.users.findUnique({
                where: { id: userId },
                select: { name: true }
            });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            const { id, nik, age, gender, phone, lab_name, vaccine_name, date_time } = req.body;
            
            // 3. Resolve lab_name → lab_id
            const lab = await prisma.labs.findFirst({
                where: { name: { contains: lab_name, mode: 'insensitive' } }
            });
            if (!lab) {
                return res.status(404).json({ message: 'Lab not found' });
            }
            
            // 4. Resolve vaccine_name → vaccine_id
            const vaccine = await prisma.vaccine_Types.findFirst({
                where: { name: { contains: vaccine_name, mode: 'insensitive' } }
            });
            if (!vaccine) {
                return res.status(404).json({ message: 'Vaccine not found' });
            }
            
            // 5. Create booking
            const newBooking = await prisma.booking_Vaccine.create({
                data: { 
                    id: id,
                    user_id: userId,
                    user_name: user.name, // Nama saat booking
                    nik,
                    age: parseInt(age),
                    gender,
                    phone,
                    lab_id: lab.id,
                    vaccine_id: vaccine.id,
                    date_time: date_time
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    lab: true,
                    vaccine: true
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