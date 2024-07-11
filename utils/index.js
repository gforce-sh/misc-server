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
  // rows.some((row) => row.some((cell) => cell?.length < 2));
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
