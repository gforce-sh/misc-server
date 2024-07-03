import dayjs from 'dayjs';

import { sendTeleMsg } from './telegramMessaging.js';
import { getTimings } from './rkTime.js';
import { isAuthorizedUser } from '../utils/index.js';

export const validateUser = (body) => {
  if (!isAuthorizedUser(`${body.message.from.id}`)) {
    console.log('Received message from unknown user. Printing details below:');
    console.info(JSON.stringify(body));
    return true;
  }
  console.log('User is known');
  return false;
};

const onStart = async (message) => {
  await sendTeleMsg('Welcome!', message.chat.id);
};

const onRknd = async (message) => {
  if (`${message.chat.id}` !== process.env.CHAT_ID) {
    console.log(
      'Unauthorized user tried to request /rknd',
      JSON.stringify(message),
    );
    return;
  }

  await sendTeleMsg('Getting info...', message.chat.id);

  let day;
  const reqDay = message.text.split(' ')[1];
  if (!!reqDay) {
    console.log('/rknd date arg exists: ', reqDay);
    if (dayjs(reqDay, 'DD/MM/YYYY', true).isValid()) {
      console.log('/rknd date arg is valid');
      day = reqDay;
    } else {
      console.log('/rknd date arg is invalid');
      await sendTeleMsg('Invalid date, /help for more info.', message.chat.id);
      return;
    }
  } else {
    day = dayjs.unix(message.date).add(1, 'day').format('DD/MM/YYYY');
  }

  const t = await getTimings(`${process.env.TARGET_URL}&date=${day}`);
  await sendTeleMsg(t, message.chat.id);
};

const onHelp = async (message) => {
  const { chat } = message;
  await sendTeleMsg(
    `Welcome to help. The available commands are:
    /start - Start
    /rknd - Get RKND. Optional args: 'dd/mm/yyyy'\nAll optional args must be separated by a single space.
    `,
    chat.id,
  );
};

const onSimpleText = async ({ chatId, text, date, redis }) => {
  if (text.length > 1500) {
    console.log('Received text is too long. It will not be saved');
    await sendTeleMsg('Message is too long to be saved.', chatId);
    return;
  }

  const timestamp = dayjs(
    new Date(date * 1000).toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
    }),
  ).format('YYYYMMDDHHmmss');

  await redis
    .lPush(`${chatId}:text`, `${timestamp}: ${text}`)
    .then(() => {
      console.log('Text saved');
    })
    .catch((err) => {
      console.error(
        'Encountered error in writing user text to DB\n',
        JSON.stringify(err),
      );
      throw err;
    });
};

const commandFuncMapping = {
  '/start': onStart,
  '/help': onHelp,
  '/rknd': onRknd,
};

export const handleIncomingMsg = async (message, redis) => {
  const { chat, text, date } = message;
  try {
    if (text[0] !== '/') {
      if (isAuthorizedUser(chat.id)) {
        await onSimpleText({ chatId: chat.id, date, text, redis });
      } else {
        console.log('User not authorized to save texts, chat id: ', chat.id);
      }
      return;
    }

    const command = text.split(' ')[0];
    const func = commandFuncMapping[command];

    if (!!func) {
      await func(message);
    } else {
      console.log(`${command} is an unknown command`);
      return;
    }
  } catch (err) {
    await sendTeleMsg('Something went wrong :(');
    throw err;
  }
};

export const logBotCommand = (text) => {
  if (text[0] === '/') {
    console.log('Command received is: ', text.slice(0, 25));
    return;
  }
  console.log('Non-command/simple text received');
};
