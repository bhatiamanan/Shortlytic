import Redis from 'redis';

const redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

// Avoid duplicate connections
(async () => {
    if (!redisClient.isOpen) {
        try {
            await redisClient.connect();
            console.log('Connected to Redis');
        } catch (err) {
            console.error('Redis connection error:', err);
        }
    }
})();

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

export default redisClient;
