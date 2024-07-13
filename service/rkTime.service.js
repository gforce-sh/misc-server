import puppeteer from 'puppeteer';

import { sendTeleMsg } from './telegramMessaging.service.js';
import dayjs from 'dayjs';
import { dayjsDateObj, parseCommandStatement } from '../utils/index.js';

export const getTimings = async (url) => {
  const reqUrl = url || process.env.TARGET_URL;
  const browser = await puppeteer.launch({ headless: 'shell' });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url() === reqUrl) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.goto(reqUrl);
  await page.setViewport({ width: 1080, height: 1024 });

  await page.waitForSelector('.dpMuhurtaCardTiming');

  const data = await page.evaluate(() => {
    const dateTimeArr = Array.from(
      document.querySelectorAll('.dpMuhurtaCardInfo'),
    )
      .map((element) => element.textContent)[0]
      .split(',');
    const date = dateTimeArr[1];

    const timings = Array.from(
      document.querySelectorAll('.dpMuhurtaCardTiming'),
    )?.map((element) => element.textContent)[0];

    const day = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ].reduce((acc, curr) =>
      dateTimeArr[0].includes(curr) ? curr.slice(0, 3) : acc,
    );

    return `RK: ${timings}, ${day}${date}`.replaceAll(' 0', ' ');
  });

  await browser.close();

  console.log('Obtained RK timings: ', data);
  return data;
};

export const sendTimings = async (timings) => {
  console.log('(1) Attempting to send timings to GS...');
  await sendTeleMsg({ text: timings, chatId: process.env.CHAT_ID });
};

export const getCronTimings = (timingStr) => {
  const [start, end] = timingStr.split(',')[0].slice(4).split(' to ');

  const currDate = dayjsDateObj().format('YYYY-MM-DD');

  const startTime = dayjs(`${currDate} ${start}`)
    .subtract(5, 'minute')
    .format('mm H D M');
  const endTime = dayjs(`${currDate} ${end}`).format('mm H D M');

  console.log(
    'Obtained cron start and end timings (mm h D M): ',
    startTime,
    ', ',
    endTime,
  );

  return [startTime, endTime];
};

export const onRknd = async (message) => {
  if (`${message.chat.id}` !== process.env.CHAT_ID) {
    console.log(
      'Unauthorized user tried to request /rknd',
      JSON.stringify(message),
    );
    return;
  }

  await sendTeleMsg({ text: 'Getting info...', chatId: message.chat.id });

  let day;
  const {
    args: { date, d },
  } = parseCommandStatement(message.text);
  const reqDay = date || d;

  if (reqDay) {
    console.log('/rknd date arg exists: ', reqDay);
    if (dayjs(reqDay, 'DD/MM/YYYY', true).isValid()) {
      console.log('/rknd date arg is valid');
      day = reqDay;
    } else {
      console.log('/rknd date arg is invalid');
      await sendTeleMsg({
        text: 'Invalid date, /help for more info.',
        chatId: message.chat.id,
      });
      return;
    }
  } else {
    day = dayjs.unix(message.date).add(1, 'day').format('DD/MM/YYYY');
  }

  const t = await getTimings(`${process.env.TARGET_URL}&date=${day}`);
  await sendTeleMsg({ text: t, chatId: message.chat.id });
};
