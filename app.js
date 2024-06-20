import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { sendTimings } from './service/rkTime.js';
import { sendGenericMsg } from './service/generic.js';
import { sendDoggoInfo } from './service/nc.js';

dotenv.config();

console.log('Env is ', process.env.NODE_ENV);

const app = express();

app.use(express.json());
app.use(cors());

app.use('/', (req, res, next) => {
  const date = new Date();
  console.log(
    `A new request for ${
      req.url
    } received at ${date.getHours()} ${date.getMinutes()} ${date.getSeconds()}`
  );
  next();
});

app.get('/', (req, res) => {
  res.json('Hello world!');
});

app.get('/daily-rk-time', async (req, res, next) => {
  try {
    await sendTimings();
    res.status(200).json('success');
    const date = new Date();
    console.log(
      `${
        req.url
      } request completed at ${date.getHours()} ${date.getMinutes()} ${date.getSeconds()}`
    );
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

app.get('/nc-custom-text', async (req, res, next) => {
  try {
    await sendGenericMsg(req.query.text, process.env.N_CHAT_ID);
    res.status(200).json('success');
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

app.get('/nc-doggo', async (req, res, next) => {
  try {
    const { only } = req.query;
    await sendDoggoInfo(only);
    res.status(200).json('success');
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

app.use(async (err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message });
  if (req.url === '/daily-rk-time') {
    console.log(
      'There was an error in the /daily-rk-time endpoint process. Trying once more post failure.'
    );
    await sendTimings();
    console.log('2nd attempt for daily-rk-time post failure completed');
  }
});

export default app;
