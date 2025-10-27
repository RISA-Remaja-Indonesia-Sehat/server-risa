const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = {    
    createUser: async (req, res) => {
        try {
            const { name, email, password } = req.body;
            
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Mohon diisi semua' });
            }
            
            const existingUser = await prisma.users.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ message: 'Email sudah digunakan' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await prisma.users.create({
                data: {
                    name,
                    email,
                    password: hashedPassword
                }
            });
            
            res.status(201).json({
                message: 'User created successfully',
                data: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },
    
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }
            
            const user = await prisma.users.findUnique({ where: { email: email } });
            if (!user) {
                return res.status(401).json({ message: 'Kamu belum terdaftar' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Password Salah' });
            }
            
            const payload = { userId: user.id, name: user.name };
            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            
            res.status(200).json({
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        stickers: user.stickers
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },
    updateStickers: async (req, res) => {
        try {
            const { id } = req.params;
            const { stickers } = req.body;

            const user = await prisma.users.update({
                where: { id: parseInt(id) },
                data: { stickers: stickers },
                select: { id: true, name: true, email: true, stickers: true }
            });

            res.status(200).json({
                message: 'Success',
                data: user
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },
    getUserById: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await prisma.users.findUnique({
                where: { id: parseInt(id) },
                select: { id: true, name: true, email: true, stickers: true }
            });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({
                message: 'Success',
                data: user
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};