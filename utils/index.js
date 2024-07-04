import dayjs from 'dayjs';

export const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms || 4000));

export const isAuthorizedUser = (id) => [process.env.CHAT_ID].includes(`${id}`);

export const resetCron = (crons) => {
  crons.forEach((cron) => cron?.stop());
};

export const dayjsDateObj = (unixdate) => {
  const jsDate = typeof unixdate === 'number' ? new Date(unixdate) : new Date();
  return dayjs(
    jsDate.toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
    }),
  );
};
