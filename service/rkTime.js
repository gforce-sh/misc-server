import puppeteer from 'puppeteer';

import { sendGenericMsg } from './generic.js';
import dayjs from 'dayjs';

const DUMMY_DATE = "2024-01-01"

export const getTimings = async () => {
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
      dateTimeArr[0].includes(curr) ? curr.slice(0, 3) : acc
    );

    return `RK: ${timings}, ${day}${date}`.replaceAll(" 0", " ");
  });

  await browser.close();

  console.log('Obtained RK timings: ', data);
  return data;
};

export const sendTimings = async (timings) => {
  console.log('Attempting to send timings to GS...');
  try {
    await sendGenericMsg(timings, process.env.CHAT_ID);
  } catch (err) {
    console.error(`Error sending telegram message. Printing full error below.`);
    console.log(JSON.stringify(err));

    console.log("err.errors>>>", err.errors)

    console.log('Trying to send timings again after 5s...');
    await new Promise((resolve) => setTimeout(resolve, 5000))
    await sendGenericMsg(timings, process.env.CHAT_ID);

    console.log('Successfully sent timings in the second try.');
  }
};

export const getCronTimings = (timingStr) => {
  const [start, end] = timingStr.split(',')[0].slice(4).split(" to ");
  const startTime = dayjs(`${DUMMY_DATE} ${start}`).subtract(5, 'minute').format("mm H")
  const endTime = dayjs(`${DUMMY_DATE} ${end}`).format("mm H")

  console.log("Obtained cron start and end timings (mm:h): ", startTime, ", ", endTime);

  return [startTime, endTime]
}
