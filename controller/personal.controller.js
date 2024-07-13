import cron from 'node-cron';

import { crons, resetCrons, cronOptions } from '../crons.js';
import {
  getCronTimings,
  getTimings,
  sendTimings,
} from '../service/rkTime.service.js';
import { sendDoggoInfo } from '../service/nc.service.js';
import { sendTeleMsg } from '../service/telegramMessaging.service.js';

export const dailyRkTime = async (req, res, next) => {
  try {
    const { setReminders } = req.query;

    const timings = await getTimings();

    const [startTime, endTime] = getCronTimings(timings);

    if (!!startTime && !!endTime && setReminders !== 'false') {
      crons.rkStartCron = cron.schedule(
        `${startTime} *`,
        async () => {
          console.log('Executing RKt start cron...');
          await sendTimings('RKt starting 5');
          console.log('RKt start cron complete');
        },
        cronOptions,
      );

      crons.rkEndCron = cron.schedule(
        `${endTime} *`,
        async () => {
          console.log('Executing RKt end cron...');
          await sendTimings('RKt ended');
          console.log('RKt end cron complete');
          resetCrons(['rkStartCron', 'rkEndCron']);
          console.log('RKt crons stopped and reset');
        },
        cronOptions,
      );
    } else {
      throw new Error('Crons not set as either start or end time missing.');
    }
    console.log('Crons set');

    await sendTimings(timings);
    console.log('Daily-rk-time request successfully completed');
  } catch (err) {
    console.error(err.message);

    try {
      console.log('Stopping crons...');
      resetCrons(['rkStartCron', 'rkEndCron']);
      console.log('Crons stopped');
    } catch (error) {
      console.error(
        'Error occurred when trying to stop crons',
        JSON.stringify(error),
      );
    }
    next(err);
  }
};

export const ncDoggo = async (req, res, next) => {
  try {
    const { only } = req.query;
    await sendDoggoInfo(only);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

export const ncCustomText = async (req, res, next) => {
  try {
    await sendTeleMsg({ text: req.query.text, chatId: process.env.N_CHAT_ID });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};
