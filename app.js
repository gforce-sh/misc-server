import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { sendTimings } from './service/rkTime.js';

dotenv.config();

console.log('Env is ', process.env.NODE_ENV);

const app = express();

app.use(express.json());
app.use(cors());

app.use('/', (req, res, next) => {
  console.log('A new request received at ' + Date.now());
  next();
});

app.get('/', (req, res) => {
  res.json('Hi');
});

app.use('/daily-rk-time', async (req, res) => {
  await sendTimings();
  res.status(200).json('Success');
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

export default app;
