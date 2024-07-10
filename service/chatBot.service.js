import dayjs from 'dayjs';

import { redis } from '../redis.js';
import { sendTeleMsg } from './telegramMessaging.service.js';
import { getTimings } from './rkTime.service.js';
import {
  dayjsDateObj,
  isAuthorizedUser,
  parseFrontalParams,
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
};

const onGetText = async (message) => {
  const {
    chat: { id: chatId },
    data: callbackData,
    text,
  } = message;

  const isCallback = !!callbackData;

  const {
    args: { all, full, start, id },
  } = parseCommandStatement(isCallback ? callbackData : text);

  const userTexts = await redis.zRangeWithScores(
    `${chatId}:text`,
    0,
    -1,
    (err) => {
      console.log('Error in db operation: in retrieving list: ', err);
    },
  );

  if (!userTexts.length) {
    await sendTeleMsg({
      text: 'No texts found.',
      chatId,
    });
    return;
  }

  if (all) {
    for (let i = 0; i < userTexts.length; i++) {
      await sendTeleMsg({
        text: `${userTexts[i].value.slice(0, 50)}...`,
        chatId,
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: '➕',
                callback_data: `/gt --full --id=${userTexts[i].score}`,
              },
            ],
          ],
        },
      });

      await wait(100);
    }
    return;
  }

  if (full) {
    const content = userTexts.filter((e) => e.score === id)[0];
    await sendTeleMsg({
      text: content.value,
      chatId,
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

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '➕',
            callback_data: `/gt --full --id=${item.score}`,
          },
          ...((i + 1) % BATCH_SIZE === 0
            ? [
                {
                  text: 'Next batch',
                  callback_data: `/gt --start=${startIdx + BATCH_SIZE}`,
                },
              ]
            : []),
        ],
      ],
    };

    await sendTeleMsg({
      text: content,
      chatId,
      replyMarkup,
    });

    await wait(100);
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
    await sendTeleMsg({ text: 'Something went wrong :(', chatId: chat.id });
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
    await sendTeleMsg({ text: 'Something went wrong :(', chatId: chat.id });
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

  let filteredEvents = [];

  for (const e of events) {
    const { content, remind, actionDate } = parseFrontalParams(e.value);
    const id = e.score;
    const refDate = actionDate || id;

    switch (remind) {
      case 'once':
        if (actionDate && dayjsDateObj().isSame(dayjs(actionDate), 'date')) {
          filteredEvents.push(content);
        }
        break;
      case 'daily':
        if (
          !actionDate ||
          dayjsDateObj().isAfter(dayjs(actionDate), 'date') ||
          dayjsDateObj().isSame(dayjs(actionDate), 'date')
        ) {
          filteredEvents.push(content);
        }
        break;
      case 'weekly':
        if (dayjsDateObj().day() === dayjs(refDate).day()) {
          filteredEvents.push(content);
        }
        break;
      case 'monthly':
        if (dayjsDateObj().date() === dayjs(refDate).date()) {
          filteredEvents.push(content);
        }
        break;
      case 'annually':
        if (
          dayjsDateObj().date() === dayjs(refDate).date() &&
          dayjsDateObj().month() === dayjs(refDate).month()
        ) {
          filteredEvents.push(content);
        }
    }
  }

  return filteredEvents;
};

/*
  // add functionality to edit, delete
  // To delete:
  const del = await redis.zRemRangeByScore(
    `${chatId}:calendarEvent`,
    '20240629122722',
    '20240629122722',
    (err) => {
      console.log('Error in db operation: in retrieving list: ', err);
    },
  );

  console.log('del', del);
*/