import puppeteer from 'puppeteer';

import { sendGenericMsg } from './generic.js';

const getTimings = async () => {
  const browser = await puppeteer.launch({ headless: 'shell' });
  const page = await browser.newPage();
  await page.goto(process.env.TARGET_URL);
  await page.setViewport({ width: 1080, height: 1024 });

  await page.waitForSelector('.dpMuhurtaCardTiming');

  const data = await page.evaluate(() => {
    const dateTimeArr = Array.from(
      document.querySelectorAll('.dpMuhurtaCardInfo')
    )
      .map((element) => element.textContent)[0]
      .split(','); // dpMuhurtaCardTiming for only time
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
    const date = dateTimeArr[1];

    return `RK: ${timings}, ${day}${date}`;
  });

  await browser.close();

  return data;
};

export const sendTimings = async () => {
  const timings = await getTimings();
  console.log('Obtained RK timings: ', timings);
  await sendGenericMsg(timings, process.env.CHAT_ID);
};
