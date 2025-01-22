import express from 'express';
import { nanoid } from 'nanoid';
import redisClient from '../config/redis.js';
import Url from '../models/Url.js';
import useragent from 'useragent';

const router = express.Router();

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Create a short URL
 *     description: Generates a short URL for a given long URL with an optional custom alias and topic.
 *     tags:
 *       - URL Shortener
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - longUrl
 *             properties:
 *               longUrl:
 *                 type: string
 *                 example: "https://example.com"
 *               customAlias:
 *                 type: string
 *                 example: "examplealias"
 *               topic:
 *                 type: string
 *                 example: "test-topic"
 *     responses:
 *       '201':
 *         description: Successfully created short URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shortUrl:
 *                   type: string
 *                   example: "http://localhost:3000/examplealias"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Invalid input or alias already exists
 *         content:
 *           application/json:
 *             example:
 *               error: "Custom alias is already in use"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Server error"
 */
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
        console.error('Error creating short URL:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/shorten/{alias}:
 *   get:
 *     summary: Redirect to original URL
 *     description: Redirects to the original long URL using the provided short URL alias and tracks analytics.
 *     tags: 
 *       - URL Shortener
 *     parameters:
 *       - in: path
 *         name: alias
 *         required: true
 *         schema:
 *           type: string
 *         description: The custom alias of the shortened URL
 *     responses:
 *       '302':
 *         description: Redirects to the original URL
 *       '404':
 *         description: Short URL not found
 *         content:
 *           application/json:
 *             example:
 *               error: "The requested short URL does not exist in our system"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */
// GET /api/shorten/:alias - Redirect to original URL and track analytics
router.get('/:alias', async (req, res) => {
    const { alias } = req.params;

    try {
        // Check Redis cache first
        let longUrl = await redisClient.get(alias);
        if (!longUrl) {
            const urlEntry = await Url.findOne({ customAlias: alias });
            if (!urlEntry) {
                return res.status(404).json({ error: 'The requested short URL does not exist in our system' });
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
