import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cron from 'node-cron';

import { sendTimings, getTimings, getCronTimings } from './service/rkTime.js';
import { sendTeleMsg } from './service/telegramMessaging.js';
import { sendDoggoInfo } from './service/nc.js';

dotenv.config();

console.log('Env is ', process.env.NODE_ENV);

const app = express();

app.use(express.json());
app.use(cors());

let start;
let end;

let startCron;
let endCron;

const cronOptions = { timezone: 'Asia/Singapore' };

app.use('/', (req, res, next) => {
  const date = new Date();
  console.log(
    `A new request for ${
      req.url
    } received at ${date.getHours()} ${date.getMinutes()} ${date.getSeconds()}`,
  );
  next();
});

app.get('/', (req, res) => {
  res.json('Hello world!');
});

app.get('/daily-rk-time', async (req, res, next) => {
  try {
    const timings = await getTimings();

    const [startTime, endTime] = getCronTimings(timings);
    start = startTime;
    end = endTime;

    console.log(`Setting crons with ${start} and ${end}`);
    if (!!start && !!end) {
      startCron = cron.schedule(
        `${start} * * *`,
        async () => {
          console.log('Executing RKt start cron...');
          await sendTimings('RKt in 5');
          console.log('RKt start cron complete');
        },
        cronOptions,
      );

      endCron = cron.schedule(
        `${end} * * *`,
        async () => {
          console.log('Executing RKt end cron...');
          await sendTimings('jEnded RKt');
          console.log('RKt end cron complete');
        },
        cronOptions,
      );
    } else {
      throw new Error('Crons not set as either start or end time missing.');
    }
    console.log('Crons set');

    await sendTimings(timings);

    res.status(200).json('success');
    console.log('Daily-rk-time request successfully completed');
  } catch (err) {
    console.error(err.message);

    console.log('Stopping crons...');
    startCron?.stop();
    endCron?.stop();
    console.log('Crons stopped');

    start = null;
    end = null;

    next(err);
  }
});

app.get('/nc-custom-text', async (req, res, next) => {
  try {
    await sendTeleMsg(req.query.text, process.env.N_CHAT_ID);
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
  res.status(err.code || 500).json({ message: err.message });
});

export default app;
