import { createClient } from 'redis';

const redisUrl = process.env.ELASTICACHE_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redisClient = createClient({
    url: redisUrl,
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to AWS Elasticache');
});

if (process.env.NODE_ENV !== 'test') {
    redisClient.connect().catch((err) => console.error('Redis connection error:', err));
}

export { redisClient };