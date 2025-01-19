import express from 'express';
import { nanoid } from 'nanoid';
import redisClient from '../config/redis.js';
import Url from '../models/Url.js';
import useragent from 'useragent';


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

// GET /api/shorten/:alias - Redirect to original URL and track analytics
router.get('/:alias', async (req, res) => {
    const { alias } = req.params;

    try {
        // Check Redis cache first
        let longUrl = await redisClient.get(alias);
        if (!longUrl) {
            const urlEntry = await Url.findOne({ customAlias: alias });
            if (!urlEntry) {
                return res.status(404).json({ error: 'Short URL not found' });
            }
            longUrl = urlEntry.longUrl;

            // Store in Redis for future lookups
            await redisClient.set(alias, longUrl);
        }

        // Parse user agent data for analytics
        const agent = useragent.parse(req.headers['user-agent']);
        const analyticsEntry = {
            timestamp: new Date().toISOString(),
            ip: req.ip,
            os: agent.os.toString(),
            device: agent.device.toString(),
            browser: agent.toAgent(),
        };

        // Save analytics data to MongoDB
        await Url.updateOne(
            { customAlias: alias },
            { $push: { analytics: analyticsEntry } }
        );

        console.log(`Redirecting to: ${longUrl}, Analytics saved:`, analyticsEntry);
        
        res.redirect(longUrl);
    } catch (err) {
        console.error('Error redirecting:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Use ES Module export
export default router;
