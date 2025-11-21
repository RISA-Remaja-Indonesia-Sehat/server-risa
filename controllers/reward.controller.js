const { prisma } = require('../config/db');

module.exports = {
    getAllRewards: async (req, res) => {
        try {
            const vouchers = await prisma.voucher.findMany();
            res.status(200).json({
                message: 'Success',
                data: vouchers
            });
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    createExchangeHistory: async (req, res) => {
        try {
            // Extract user_id dari JWT token
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const userId = req.user.userId;
            
            const { voucher_id, voucherCode } = req.body;
            
            if (!voucher_id) {
                return res.status(400).json({ message: 'Voucher ID is required' });
            }
            
            const exchangeHistory = await prisma.voucher_Claim.create({
                data: {
                    user_id: userId,
                    voucher_id: parseInt(voucher_id),
                    voucherCode: voucherCode
                },
                include: {
                    user: { select: { id: true, name: true } },
                    voucher: true
                }
            });
            
            res.status(201).json({
                message: 'Voucher claimed successfully',
                data: exchangeHistory
            });
        }
        catch (error) {
            console.error('Error creating exchange history:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    },
    getUserExchangeHistory: async (req, res) => {
        try {
            // Extract user_id dari JWT token
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const userId = req.user.userId;
            
            const history = await prisma.voucher_Claim.findMany({
                where: { user_id: userId },
                include: { 
                    voucher: true,
                    user: { select: { id: true, name: true } }
                },
                orderBy: { claimedAt: 'desc' }
            });
            
            res.status(200).json({
                message: 'Success',
                data: history
            });
        } catch (error) {
            console.error('Error fetching exchange history:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }
}