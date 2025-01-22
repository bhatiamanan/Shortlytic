import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import authRoutes from './routes/auth.js';
import urlRoutes from './routes/url.js';
import analyticsRoutes from './routes/analytics.js';
import './config/passport.js';

dotenv.config({ path: './.env' });

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

// Swagger Documentation Setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Advanced URL Shortener API',
            version: '1.0.0',
            description: 'API documentation for the Advanced URL Shortener service.',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
console.log('Swagger docs available at http://localhost:3000/api-docs');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shorten', urlCreationLimiter, urlRoutes);
app.use('/api/analytics', analyticsRoutes);

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
