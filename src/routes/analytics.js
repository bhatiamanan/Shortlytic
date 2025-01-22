import express from 'express';
import Url from '../models/Url.js';
import { aggregateClicksByDate, aggregateByField } from '../utils/analytics.js';

const router = express.Router();

// GET /api/analytics/overall - Retrieve overall analytics for all URLs
router.get('/overall', async (req, res) => {
    try {
        const urls = await Url.find({});
        if (urls.length === 0) {
            return res.status(404).json({ error: 'No URLs found' });
        }

        let totalClicks = 0;
        const uniqueUserSet = new Set();
        let allClicks = [];

        urls.forEach(url => {
            totalClicks += url.analytics.length;
            url.analytics.forEach(entry => {
                uniqueUserSet.add(entry.ip);
                allClicks.push(entry);
            });
        });

        res.status(200).json({
            totalUrls: urls.length,
            totalClicks,
            uniqueUsers: uniqueUserSet.size,
            clicksByDate: aggregateClicksByDate(allClicks),
            osType: aggregateByField(allClicks, 'os'),
            deviceType: aggregateByField(allClicks, 'device')
        });

    } catch (err) {
        console.error('Error fetching overall analytics:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/analytics/:alias - Retrieve analytics for a short URL
router.get('/:alias', async (req, res) => {
    const { alias } = req.params;

    try {
        const urlEntry = await Url.findOne({ customAlias: alias });

        if (!urlEntry) {
            return res.status(404).json({ error: 'Short URL not found' });
        }

        const analytics = urlEntry.analytics || [];

        res.status(200).json({
            totalClicks: analytics.length,
            uniqueUsers: new Set(analytics.map((click) => click.ip)).size,
            clicksByDate: aggregateClicksByDate(analytics),
            osType: aggregateByField(analytics, 'os'),
            deviceType: aggregateByField(analytics, 'device')
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/analytics/topic/:topic - Retrieve analytics for all URLs under a topic
router.get('/topic/:topic', async (req, res) => {
    const { topic } = req.params;

    try {
        const urls = await Url.find({ topic });

        if (urls.length === 0) {
            return res.status(404).json({ error: 'No URLs found for this topic' });
        }

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

        res.status(200).json({
            totalClicks,
            uniqueUsers: uniqueUserSet.size,
            clicksByDate: aggregateClicksByDate(allClicks),
            urls: urlsData
        });

    } catch (err) {
        console.error('Error fetching topic analytics:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
