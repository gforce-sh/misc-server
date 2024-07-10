import cron from 'node-cron';

import {
  getCronTimings,
  getTimings,
  sendTimings,
} from '../service/rkTime.service.js';
import { resetCron } from '../utils/index.js';
import { sendDoggoInfo } from '../service/nc.service.js';
import { sendTeleMsg } from '../service/telegramMessaging.service.js';

let startCron;
let endCron;
const cronOptions = { timezone: 'Asia/Singapore' };

export const dailyRkTime = async (req, res) => {
  try {
    const { setReminders } = req.query;

    const timings = await getTimings();

    const [startTime, endTime] = getCronTimings(timings);

    if (!!startTime && !!endTime && setReminders !== 'false') {
      startCron = cron.schedule(
        `${startTime} *`,
        async () => {
          console.log('Executing RKt start cron...');
          await sendTimings('RKt starting 5');
          console.log('RKt start cron complete');
        },
        cronOptions,
      );

      endCron = cron.schedule(
        `${endTime} *`,
        async () => {
          console.log('Executing RKt end cron...');
          await sendTimings('RKt ended');
          console.log('RKt end cron complete');

          resetCron([startCron, endCron]);
          startCron = null;
          endCron = null;
          console.log('RKt crons stopped and reset');
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

    try {
      console.log('Stopping crons...');
      resetCron([startCron, endCron]);
      startCron = null;
      endCron = null;
      console.log('Crons stopped');
    } catch (error) {
      console.error(
        'Error occured when trying to stop crons',
        JSON.stringify(error),
      );
    }
  }
};

export const ncDoggo = async (req, res) => {
  try {
    const { only } = req.query;
    await sendDoggoInfo(only);
    res.status(200).json('success');
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

export const ncCustomText = async (req, res) => {
  try {
    await sendTeleMsg({ text: req.query.text, chatId: process.env.N_CHAT_ID });
    res.status(200).json('success');
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};
