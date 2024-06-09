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
  console.log(req.url);
  console.log(`A new request for ${req.url} received at ${Date.now()}`);
  next();
});

app.get('/', (req, res) => {
  res.json('Hello world!');
});

app.get('/daily-rk-time', async (req, res, next) => {
  try {
    await sendTimings();
    res.status(200).json('success');
  } catch (err) {
    console.log(`error status is ${err.status}`);
    console.error(err.message);
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message });
});

export default app;
