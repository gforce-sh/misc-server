import { createClient } from 'redis';

const retryStrategy = (options) => {
  if (options.error && options.error.code === 'ECONNREFUSED') {
    // End reconnecting on a specific error and flush all commands with a individual error
    return new Error('The server refused the connection');
  }
  if (options.total_retry_time > 3500) {
    // End reconnecting after a specific timeout and flush all commands with a individual error
    return new Error('Retry time exhausted');
  }
  if (options.attempt > 3) {
    // End reconnecting with built-in error
    return undefined;
  }
  // reconnect after
  return 1000;
};

export const connectDB = async () => {
  return await createClient({
    password: process.env.REDIS_DB_PASSWORD,
    socket: {
      host: process.env.REDIS_DB_HOST,
      port: process.env.REDIS_DB_PORT,
    },
    retry_strategy: retryStrategy,
  })
    .on('error', (err) => console.log('Redis Client Error', err))
    .connect();
};
