import { sendRejection, sendTeleMsg } from './telegramMessaging.service.js';
import { onCalendarEvent } from './method/calendarEvent.chatbot.method.js';
import {
  onDeleteText,
  onGetText,
  onSimpleText,
} from './method/text.chatbot.method.js';
import { onRknd } from './rkTime.service.js';

const onStart = async (message) => {
  await sendTeleMsg({ text: 'Welcome!', chatId: message.chat.id });
};

const onHelp = async (message) => {
  const { chat } = message;
  await sendTeleMsg({
    text: `Welcome to help. The available commands are:\n
    /start - Start
    /rknd - Get RKND. Optional args: --date={dd/mm/yyyy}
    /calendarEvent - Store a date-time-based event description that can be reminded. --remind={once/daily/weekly/monthly/annually} --date={dd/mm/yyy}\n
    All optional args must be preceded by a double dash "--" and separated by a single space.
    Eg. /example --date=12/02/2024 --count=5
    `,
    chatId: chat.id,
  });
};

// Add next function above here^^^

const commandFuncMapping = {
  '/start': onStart,
  '/help': onHelp,
  '/rknd': onRknd,
  '/calendarEvent': onCalendarEvent,
  '/ce': onCalendarEvent,
  '/getText': onGetText,
  '/gt': onGetText,
  '/getCalendarEvent': onGetText,
  '/gce': onGetText,
  '/deleteText': onDeleteText,
};

export const handleIncomingCallback = async (callbackQuery) => {
  const { data, message } = callbackQuery;

  try {
    const command = data.split(' ')[0];
    const func = commandFuncMapping[command];

    if (func) {
      await func({ ...message, data });
    } else {
      console.log(`${command} is an unknown callback command`);
      return;
    }
  } catch (err) {
    await sendRejection(message.chat.id);
    throw err;
  }
};

export const handleIncomingMsg = async (message) => {
  const { chat, text, date } = message;

  try {
    if (text[0] !== '/') {
      await onSimpleText({ chatId: chat.id, date, text });
      return;
    }

    const command = text.split(' ')[0];
    const func = commandFuncMapping[command];

    if (func) {
      await func(message);
    } else {
      console.log(`${command} is an unknown command`);
      return;
    }
  } catch (err) {
    await sendRejection(chat.id);
    throw err;
  }
};

export const logBotCommand = (body) => {
  const { message, callback_query } = body;

  if (Object.keys(callback_query || {}).length) {
    console.log('Callback received with data: ', callback_query.data);
    return false;
  }

  const { text } = message;

  if (text[0] === '/') {
    console.log('Command received is: ', text.split(' ')[0]);
    return true;
  }
  console.log('Non-command/simple text received');
  return true;
};
