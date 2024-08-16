import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

export const reconnectStrategy = (retries, error) => {
  if (error && error.code === 'ECONNREFUSED') {
    // End reconnecting on a specific error and flush all commands with an individual error
    return new Error('The server refused the connection');
  }
  if (retries > 3) {
    // End reconnecting with built-in error
    return false;
  }
  // reconnect after
  return 1000;
};

const connectDB = async () => {
  return await createClient({
    // url: `redis://:${process.env.REDIS_DB_PASSWORD}@${process.env.REDIS_DB_HOST}:${process.env.REDIS_DB_PORT}`,
    password: process.env.REDIS_DB_PASSWORD,
    socket: {
      host: process.env.REDIS_DB_HOST,
      port: process.env.REDIS_DB_PORT,
      reconnectStrategy
    }
  })
    .on('error', (err) => console.log('Redis Client Error', err))
    .on('connect', () => console.log('Connected to Redis Client'))
    .connect();
};

let redis;

(async () => {
  redis = await connectDB();
})();

export { redis };
