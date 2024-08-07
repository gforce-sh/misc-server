import dayjs from 'dayjs';
import { cronOptions, crons, resetCrons } from '../crons.js';
import cron from 'node-cron';
import { sendTeleMsg } from '../service/telegramMessaging.service.js';

export const toStr = (e) => `${e}`;

export const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms || 4000));

export const isAuthorizedUser = (id) => [process.env.CHAT_ID].includes(`${id}`);

export const dayjsDateObj = (unixdate) => {
  const jsDate = typeof unixdate === 'number' ? new Date(unixdate) : new Date();
  return dayjs(
    jsDate.toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
    }),
  );
};

export const parseCommandStatement = (s) => {
  if (!s) return {};

  const sArr = s?.split(' ');
  const args = {};

  while (sArr[sArr.length - 1].includes('--')) {
    if (sArr[sArr.length - 1].includes('=')) {
      const split = sArr[sArr.length - 1].split('=');
      const name = split[0].slice(2);
      const value = split[1];
      args[name] = value;
      sArr.pop();
    } else {
      const name = sArr[sArr.length - 1].slice(2);
      args[name] = true;
      sArr.pop();
    }
  }

  return {
    command: sArr[0],
    content: sArr.slice(1, sArr.length).join(' '),
    args,
  };
};

export const parseFrontalParams = (s) => {
  if (!s) return {};

  const args = {};

  const split = s.split(':: ');
  if (!split[1]) {
    return { content: split[0] };
  }
  const content = split[1];
  const paramsStr = split[0];
  const paramsArr = paramsStr.split(':');
  if (paramsArr?.length) {
    paramsArr.forEach((param) => {
      const [name, value] = param.split('=');
      args[name] = value;
    });
  }

  return { content, ...args };
};

export const getInlineButtonMarkup = (...rows) => {
  if (rows.some((row) => row.some((cell) => cell?.length < 2))) {
    throw new Error(
      'Incomplete data received in getInlineButtonMarkup function',
    );
  }
  return {
    inline_keyboard: [
      ...rows.map((row) => [
        ...row.map(([text, callbackData]) => ({
          text,
          callback_data: callbackData,
        })),
      ]),
    ],
  };
};

export const setReminderCron = ({ chatId, timestamp, actionDate, content }) => {
  console.log('setting cron...');
  const cronKey = `${chatId}:calendarEvent:${timestamp}`;
  const remindTime = dayjs(actionDate).format('mm H D M');

  crons[cronKey] = cron.schedule(
    `${remindTime} *`,
    async () => {
      console.log(`Executing ${cronKey} remind cron...`);
      await sendTeleMsg({ text: content, chatId });
      resetCrons([cronKey]);
      console.log(cronKey, ' cron stopped and reset');
    },
    cronOptions,
  );
  console.log('cron set');
};
