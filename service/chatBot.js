import dayjs from 'dayjs';

import { sendTeleMsg } from './telegramMessaging.js';
import { getTimings } from './rkTime.js';

export const validateUser = (body) => {
  if (
    ![process.env.CHAT_ID, process.env.N_CHAT_ID].includes(
      `${body.message.chat.id}`,
    )
  ) {
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

const commandFuncMapping = {
  '/start': onStart,
  '/help': onHelp,
  '/rknd': onRknd,
};

export const handleIncomingMsg = async (message) => {
  const { chat, text } = message;
  try {
    const command = text.split(' ')[0];
    const func = commandFuncMapping[command];
    await func(message);
  } catch (err) {
    await sendTeleMsg('Something went wrong :(', chat.id);
    throw err;
  }
};
