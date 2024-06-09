import puppeteer from 'puppeteer';

const getTimings = async () => {
  const browser = await puppeteer.launch();
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
    console.log(dateTimeArr, timings);
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

  console.log(data);

  await browser.close();

  return data;
};

export const sendTimings = async () => {
  const timings = await getTimings();
  await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${
      process.env.CHAT_ID
    }&text=${encodeURIComponent(timings)}`
  )
    .then((res) => {
      console.log('Successfully sent Telegram msg');
      return res;
    })
    .catch((err) => {
      console.error(
        'Something went wrong in sending request to Telegram server.'
      );
      throw err;
    });
  return;
};
