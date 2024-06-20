import puppeteer from 'puppeteer';

import { sendGenericMsg } from './generic.js';

const getTimings = async () => {
  const browser = await puppeteer.launch({ headless: 'shell' });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url() === process.env.TARGET_URL) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.goto(process.env.TARGET_URL);
  await page.setViewport({ width: 1080, height: 1024 });

  await page.waitForSelector('.dpMuhurtaCardTiming');

  const data = await page.evaluate(() => {
    const dateTimeArr = Array.from(
      document.querySelectorAll('.dpMuhurtaCardInfo')
    )
      .map((element) => element.textContent)[0]
      .split(',');
    const date = dateTimeArr[1];

    const timings = Array.from(
      document.querySelectorAll('.dpMuhurtaCardTiming')
    ).map((element) => element.textContent)[0];

    const day = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ].reduce((acc, curr) =>
      dateTimeArr[0].includes(curr) ? curr.slice(0, 3) : acc
    );

    return `RK: ${timings}, ${day}${date}`;
  });

  await browser.close();

  return data;
};

export const sendTimings = async () => {
  const timings = await getTimings();
  console.log('Obtained RK timings: ', timings);

  console.log('Attempting to send timings to GS...');

  try {
    await sendGenericMsg(timings, process.env.CHAT_ID);
  } catch (err) {
    console.error(`Error sending telegram message. Printing full error below.`);
    console.error(err);
    console.log('Trying to send timings again...');
    await sendGenericMsg(timings, process.env.CHAT_ID);
    console.log('Successfully sent timings in the second try.');
  }
};
