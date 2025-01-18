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

// Use ES Module export
export default router;
