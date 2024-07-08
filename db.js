import { connectDB } from './redis.js';

const db = async () => {
  return await connectDB();
};

export default db;
