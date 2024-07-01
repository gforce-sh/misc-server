import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cron from 'node-cron';

import { sendTimings, getTimings, getCronTimings } from './service/rkTime.js';
import { sendTeleMsg } from './service/telegramMessaging.js';
import { sendDoggoInfo } from './service/nc.js';
import { validateUser, handleIncomingMsg } from './service/chatBot.js';

dotenv.config();
console.log('Env is ', process.env.NODE_ENV);
const app = express();

app.use(express.json());
app.use(cors());

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

    if (!!startTime && !!endTime) {
      startCron = cron.schedule(
        `${startTime} * * *`,
        async () => {
          console.log('Executing RKt start cron...');
          await sendTimings('RKt starting 5');
          console.log('RKt start cron complete');
          startCron?.stop();
          startCron = null;
          console.log('RKt start cron stopped and reset');
        },
        cronOptions,
      );

      endCron = cron.schedule(
        `${endTime} * * *`,
        async () => {
          console.log('Executing RKt end cron...');
          await sendTimings('RKt ended');
          console.log('RKt end cron complete');
          endCron?.stop();
          endCron = null;
          console.log('RKt end cron stopped and reset');
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

app.post('/gs-bot-messaged', async (req, res) => {
  try {
    const { body } = req;

    const isStranger = validateUser(body);
    if (isStranger) {
      res.status(200).json('ok');
      return;
    }

    await handleIncomingMsg(body.message);

    res.status(200).json('ok');
  } catch (err) {
    console.log(err.message);
    console.error(JSON.stringify(err));

    // Send success to prevent telegram from re-calling hook
    res.status(200).json('ok');
  }
});

app.use(async (err, req, res, next) => {
  res.status(err.code || 500).json({ message: err.message });
});

export default app;
