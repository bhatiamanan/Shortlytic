import express from 'express';
import { nanoid } from 'nanoid';
import redisClient from '../config/redis.js'; // Ensure the file has a `.js` extension
import Url from '../models/Url.js';

const router = express.Router();

// POST /api/shorten
router.post('/', async (req, res) => {
    const { longUrl, customAlias, topic } = req.body;

    if (!longUrl) {
        return res.status(400).json({ error: 'longUrl is required' });
    }

    try {
        // Check if custom alias is already taken
        if (customAlias) {
            const existingUrl = await Url.findOne({ customAlias });
            if (existingUrl) {
                return res.status(400).json({ error: 'Custom alias is already in use' });
            }
        }

        // Generate unique alias if no custom alias is provided
        const alias = customAlias || nanoid(6);

        // Construct the short URL
        const shortUrl = `${req.protocol}://${req.get('host')}/${alias}`;

        // Save to database
        const newUrl = await Url.create({ longUrl, shortUrl, customAlias: alias, topic });

        // Cache the short URL mapping
        await redisClient.set(alias, longUrl);

        res.status(201).json({
            shortUrl,
            createdAt: newUrl.createdAt,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/shorten/:alias - Redirect to the original long URL
router.get('/:alias', async (req, res) => {
    const { alias } = req.params;

    try {
        // Check Redis cache first
        const cachedUrl = await redisClient.get(alias);
        if (cachedUrl) {
            console.log(`Cache hit for alias: ${alias}`);
            logAnalytics(req, alias);
            return res.redirect(cachedUrl);
        }

        // If not found in cache, query MongoDB
        const urlEntry = await Url.findOne({ customAlias: alias });
        if (!urlEntry) {
            return res.status(404).json({ error: 'Short URL not found' });
        }

        // Cache the URL for future lookups
        await redisClient.set(alias, urlEntry.longUrl);

        // Log analytics before redirecting
        logAnalytics(req, alias);

        res.redirect(urlEntry.longUrl);
    } catch (err) {
        console.error('Error redirecting:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to log analytics
const logAnalytics = (req, alias) => {
    const analyticsData = {
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    };
    console.log(`Analytics for ${alias}:`, analyticsData);
    // Future scope: Save analyticsData to DB or logging system.
};

// Use ES Module export
export default router;
