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

// // GET /api/analytics/:alias - Retrieve analytics for a short URL
router.get('/analytics/:alias', async (req, res) => {
    const { alias } = req.params;

    try {
        // Find the URL in the database
        const urlEntry = await Url.findOne({ customAlias: alias });

        if (!urlEntry) {
            return res.status(404).json({ error: 'Short URL not found' });
        }

        const analytics = urlEntry.analytics || [];

        // Calculate total clicks
        const totalClicks = analytics.length;

        // Calculate unique users based on IPs
        const uniqueUsers = new Set(analytics.map((click) => click.ip)).size;

        // Aggregate clicks by date (last 7 days)
        const clicksByDate = aggregateClicksByDate(analytics);

        // Group clicks by OS type and device type
        const osType = aggregateByField(analytics, 'os');
        const deviceType = aggregateByField(analytics, 'device');

        res.status(200).json({
            totalClicks,
            uniqueUsers,
            clicksByDate,
            osType,
            deviceType
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to aggregate clicks by date (last 7 days)
const aggregateClicksByDate = (clicks) => {
    const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map((date) => ({
        date,
        count: clicks.filter((click) => click.timestamp.startsWith(date)).length
    }));
};

// Helper function to aggregate analytics by field (e.g., os, device)
const aggregateByField = (clicks, field) => {
    const fieldCounts = {};
    clicks.forEach((click) => {
        const value = click[field] || 'Unknown';
        if (!fieldCounts[value]) {
            fieldCounts[value] = { uniqueClicks: 0, uniqueUsers: new Set() };
        }
        fieldCounts[value].uniqueClicks++;
        fieldCounts[value].uniqueUsers.add(click.ip);
    });

    return Object.keys(fieldCounts).map((key) => ({
        [field + 'Name']: key,
        uniqueClicks: fieldCounts[key].uniqueClicks,
        uniqueUsers: fieldCounts[key].uniqueUsers.size,
    }));
};

// GET /api/analytics/topic/:topic - Retrieve analytics for all URLs under a topic
router.get('/analytics/topic/:topic', async (req, res) => {
    const { topic } = req.params;

    try {
        // Find all URLs under the given topic
        const urls = await Url.find({ topic });

        if (urls.length === 0) {
            return res.status(404).json({ error: 'No URLs found for this topic' });
        }

        // Initialize analytics data
        let totalClicks = 0;
        const uniqueUserSet = new Set();
        let allClicks = [];

        const urlsData = urls.map(url => {
            totalClicks += url.analytics.length;
            url.analytics.forEach(entry => {
                uniqueUserSet.add(entry.ip);
                allClicks.push(entry);
            });

            return {
                shortUrl: url.shortUrl,
                totalClicks: url.analytics.length,
                uniqueUsers: new Set(url.analytics.map(click => click.ip)).size
            };
        });

        // Use the existing aggregateClicksByDate function
        const clicksByDate = aggregateClicksByDate(allClicks);

        res.status(200).json({
            totalClicks,
            uniqueUsers: uniqueUserSet.size,
            clicksByDate,
            urls: urlsData
        });

    } catch (err) {
        console.error('Error fetching topic analytics:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Use ES Module export
export default router;
