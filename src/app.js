import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import urlRoutes from './routes/url.js';
import redisClient from './config/redis.js';
import './config/passport.js'; // Initialize Google OAuth


const result = dotenv.config({ path: './.env' });


const app = express();

// Middleware
app.use(express.json());
app.use(passport.initialize());


// Rate Limiting
const urlCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each user to 10 requests per window
    message: 'Too many requests, please try again later.',
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shorten', urlCreationLimiter, urlRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Base Route
app.get('/', (req, res) => {
    res.send('URL Shortener API is running!');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
