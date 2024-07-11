import dayjs from 'dayjs';

import { redis } from '../redis.js';
import { sendTeleMsg } from './telegramMessaging.service.js';
import { getTimings } from './rkTime.service.js';
import {
  dayjsDateObj,
  getInlineButtonMarkup,
  getMsgTypeFromCmd,
  isAuthorizedUser,
  parseFrontalParams,
  toStr,
  wait,
} from '../utils/index.js';
import { parseCommandStatement } from '../utils/index.js';

export const validateUser = (body) => {
  let id;
  if (Object.keys(body.callback_query || {}).length) {
    console.log('Received callback query');
    if (`${body.callback_query.message.from.id}` !== `${process.env.BOT_ID}`) {
      console.log('Received message from unknown bot. Printing details below:');
      console.info(JSON.stringify(body));
      return true;
    }
    console.log('Bot is known');
    id = body.callback_query.from.id;
  } else {
    id = body.message.from.id;
  }

  if (!isAuthorizedUser(`${id}`)) {
    console.log('Received message from unknown user. Printing details below:');
    console.info(JSON.stringify(body));
    return true;
  }
  console.log('User is known');
  return false;
};

const sendConfirmation = (chatId) => sendTeleMsg({ text: '✓', chatId });
const sendRejection = (chatId) =>
  sendTeleMsg({ text: 'Something went wrong :(', chatId });

const onStart = async (message) => {
  await sendTeleMsg({ text: 'Welcome!', chatId: message.chat.id });
};

const onRknd = async (message) => {
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
  } = parseCommandStatement(text);
  const reqDay = date || d;

  if (!!reqDay) {
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

const onHelp = async (message) => {
  const { chat } = message;
  await sendTeleMsg({
    text: `Welcome to help. The available commands are:
    /start - Start
    /rknd - Get RKND. Optional args: --date={dd/mm/yyyy}\n
    /calendarEvent - Store a date-time-based event description. --date={dd/mm/yyy}
    All optional args must be separated by a single space.
    Eg /example --date=12/02/2024 --count=5
    `,
    chatId: chat.id,
  });
};

const onSimpleText = async ({ chatId, text, date }) => {
  if (text.length > 1500) {
    console.log('Received text is too long. It will not be saved');
    await sendTeleMsg({ text: 'Message is too long to be saved.', chatId });
    return;
  }

  const timestamp = dayjsDateObj(date * 1000).format('YYYYMMDDHHmmss');

  await redis
    .zAdd(`${chatId}:text`, { score: timestamp, value: text })
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

  await sendConfirmation(chatId);
};

export const onCalendarEvent = async (message) => {
  const {
    chat: { id: chatId },
    text,
    date,
  } = message;

  if (text.length > 1000) {
    console.log('Received event description is too long. It will not be saved');
    await sendTeleMsg({
      text: 'Event description is too long to be saved.',
      chatId,
    });
    return;
  }

  const {
    content,
    args: {
      date: userSpecifiedSlashSeparatedDate,
      d,
      remind: userSpecifiedRemind,
      r,
    },
  } = parseCommandStatement(text);

  const userSpecifiedDate = userSpecifiedSlashSeparatedDate || d;
  const remind = userSpecifiedRemind || r;

  const isUserSpecifiedDate = typeof userSpecifiedDate === 'string';
  const remindFreq = remind === true ? 'once' : remind;
  const timestamp = dayjsDateObj(date * 1000).format('YYYYMMDDHHmmss');

  const [day, month, year] =
    (isUserSpecifiedDate && userSpecifiedDate.split('/')) || [];
  const actionDate = isUserSpecifiedDate
    ? dayjs(`${year}-${month}-${day}`).format('YYYYMMDDHHmmss')
    : timestamp;

  const showRemind = isUserSpecifiedDate
    ? !!remindFreq
    : !!remindFreq && remindFreq !== 'once';
  const baseParams = `${showRemind ? `remind=${remindFreq}:` : ''}${isUserSpecifiedDate ? `actionDate=${actionDate}:` : ''}`;
  console.log('base params>', baseParams);

  await redis
    .zAdd(`${chatId}:calendarEvent`, {
      score: timestamp,
      value: `${baseParams}${!!baseParams ? ': ' : ''}${content}`,
    })
    .then(() => {
      console.log('Event saved');
    })
    .catch((err) => {
      console.error(
        'Encountered error in writing event description to DB:\n',
        err,
      );
      throw err;
    });

  await sendConfirmation(chatId);
};

const onGetText = async (message) => {
  const {
    chat: { id: chatId },
    data: callbackData,
    text,
  } = message;

  const isCallback = !!callbackData;

  const {
    command,
    args: { full, start, id, type: msgTypeFromCallbackData },
  } = parseCommandStatement(isCallback ? callbackData : text);

  const msgType = isCallback
    ? msgTypeFromCallbackData
    : getMsgTypeFromCmd(command);

  if (!msgType) throw new Error('Missing message type');

  const userTexts = await redis.zRangeWithScores(
    `${chatId}:${msgType}`,
    0,
    -1,
    (err) => {
      console.log('Error in retrieving list from DB. Err: ', err);
    },
  );

  if (!userTexts.length) {
    await sendTeleMsg({
      text: 'No texts found.',
      chatId,
    });
    return;
  }

  if (full) {
    const content = userTexts.filter((t) => toStr(t.score) === id)[0];
    await sendTeleMsg({
      text: content.value.split(':: ')[1],
      chatId,
      replyMarkup: getInlineButtonMarkup([
        ['📛', `/deleteText --id=${content.score} --type=${msgType}`],
      ]),
    });
    return;
  }

  const BATCH_SIZE = 3;
  let startIdx = 0;
  let endIdx = startIdx + BATCH_SIZE;

  if (start) {
    startIdx = parseInt(start);
    endIdx = startIdx + BATCH_SIZE;
  }

  if (endIdx > userTexts.length) {
    endIdx = userTexts.length;
  }

  if (startIdx >= userTexts.length) {
    await sendTeleMsg({
      text: 'You have reached the end.',
      chatId,
    });
    return;
  }

  for (let i = startIdx; i < endIdx; i++) {
    const item = userTexts[i];
    const content = `${item.value.slice(0, 50)}...`;
    const callbackArgs = `--id=${item.score} --type=${msgType}`;

    const replyMarkup = getInlineButtonMarkup([
      ['➕', `/gt --full ${callbackArgs}`],
      ['📛', `/deleteText ${callbackArgs}`],
      ...((i + 1) % BATCH_SIZE === 0
        ? [['⏩', `/gt --start=${startIdx + BATCH_SIZE} --type=${msgType}`]]
        : []),
    ]);

    await sendTeleMsg({
      text: content,
      chatId,
      replyMarkup,
    });

    await wait(100);
  }
};

const onDeleteText = async (message) => {
  const {
    data,
    chat: { id: chatId },
  } = message;
  const {
    args: { id, type },
  } = parseCommandStatement(data);

  const del = await redis.zRemRangeByScore(
    `${chatId}:${type}`,
    id,
    id,
    (err) => {
      console.log('Error in deleting item(s) from DB. Err: \n', err);
    },
  );

  if (del === 1) {
    await sendConfirmation(chatId);
  } else {
    await sendRejection(chatId);
    throw new Error('Somehow more than 1 element was found and deleted');
  }
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

    if (!!func) {
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

    if (!!func) {
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

export const findRemindersforUser = async (chatId) => {
  if (!chatId) {
    throw new Error('No chatId provided');
  }
  const events = await redis.zRangeWithScores(
    `${chatId}:calendarEvent`,
    0,
    -1,
    (err) => {
      console.log('Error in db operation: in retrieving list: ', err);
    },
  );

  const filteredEvents = [];

  for (const e of events) {
    const { content, remind, actionDate } = parseFrontalParams(e.value);
    const id = e.score;
    const refDate = actionDate || id;

    switch (remind) {
      case 'once':
        if (actionDate && dayjsDateObj().isSame(dayjs(actionDate), 'date')) {
          filteredEvents.push({ content, id });
        }
        break;
      case 'daily':
        if (
          !actionDate ||
          dayjsDateObj().isAfter(dayjs(actionDate), 'date') ||
          dayjsDateObj().isSame(dayjs(actionDate), 'date')
        ) {
          filteredEvents.push({ content, id });
        }
        break;
      case 'weekly':
        if (dayjsDateObj().day() === dayjs(refDate).day()) {
          filteredEvents.push({ content, id });
        }
        break;
      case 'monthly':
        if (dayjsDateObj().date() === dayjs(refDate).date()) {
          filteredEvents.push({ content, id });
        }
        break;
      case 'annually':
        if (
          dayjsDateObj().date() === dayjs(refDate).date() &&
          dayjsDateObj().month() === dayjs(refDate).month()
        ) {
          filteredEvents.push({ content, id });
        }
    }
  }

  return filteredEvents;
};
