import express from 'express';
import Url from '../models/Url.js';
import { aggregateClicksByDate, aggregateByField } from '../utils/analytics.js';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/overall:
 *   get:
 *     summary: Retrieve overall analytics for all URLs
 *     description: Fetches total URLs, total clicks, unique users, and breakdown by date, OS, and device type.
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: Successfully retrieved overall analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUrls:
 *                   type: number
 *                   example: 10
 *                 totalClicks:
 *                   type: number
 *                   example: 50
 *                 uniqueUsers:
 *                   type: number
 *                   example: 30
 *                 clicksByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "2025-01-22"
 *                       count:
 *                         type: number
 *                         example: 15
 *                 osType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       osName:
 *                         type: string
 *                         example: "Windows"
 *                       uniqueClicks:
 *                         type: number
 *                         example: 20
 *                       uniqueUsers:
 *                         type: number
 *                         example: 10
 *                 deviceType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceName:
 *                         type: string
 *                         example: "Mobile"
 *                       uniqueClicks:
 *                         type: number
 *                         example: 25
 *                       uniqueUsers:
 *                         type: number
 *                         example: 15
 *       404:
 *         description: No URLs found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/analytics/{alias}:
 *   get:
 *     summary: Retrieve analytics for a specific short URL
 *     description: Get analytics including total clicks, unique users, clicks by date, OS type, and device type for a given alias.
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: path
 *         name: alias
 *         required: true
 *         schema:
 *           type: string
 *         description: Short URL alias to fetch analytics for.
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics for the short URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: number
 *                   example: 20
 *                 uniqueUsers:
 *                   type: number
 *                   example: 10
 *                 clicksByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "2025-01-22"
 *                       count:
 *                         type: number
 *                         example: 5
 *                 osType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       osName:
 *                         type: string
 *                         example: "Windows"
 *                       uniqueClicks:
 *                         type: number
 *                         example: 15
 *                       uniqueUsers:
 *                         type: number
 *                         example: 8
 *                 deviceType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceName:
 *                         type: string
 *                         example: "Desktop"
 *                       uniqueClicks:
 *                         type: number
 *                         example: 12
 *                       uniqueUsers:
 *                         type: number
 *                         example: 6
 *       404:
 *         description: Short URL not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/analytics/topic/{topic}:
 *   get:
 *     summary: Retrieve analytics for all URLs under a specific topic
 *     description: Provides analytics for URLs grouped under the specified topic.
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic to retrieve analytics for.
 *     responses:
 *       200:
 *         description: Successfully retrieved topic-based analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: number
 *                   example: 100
 *                 uniqueUsers:
 *                   type: number
 *                   example: 50
 *                 clicksByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "2025-01-22"
 *                       count:
 *                         type: number
 *                         example: 20
 *                 urls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shortUrl:
 *                         type: string
 *                         example: "http://localhost:3000/examplealias"
 *                       totalClicks:
 *                         type: number
 *                         example: 50
 *                       uniqueUsers:
 *                         type: number
 *                         example: 25
 *       404:
 *         description: No URLs found for the given topic
 *       500:
 *         description: Internal server error
 */
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
