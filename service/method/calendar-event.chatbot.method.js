import dayjs from 'dayjs';

import { redis } from '../../redis.js';
import { sendConfirmation, sendTeleMsg } from '../telegramMessaging.service.js';
import {
  dayjsDateObj,
  parseCommandStatement,
  parseFrontalParams,
  setReminderCron,
} from '../../utils/index.js';

export const onCalendarEvent = async (message) => {
  const {
    chat: { id: chatId },
    text,
    date,
  } = message;

  if (!text) {
    console.log('Empty message received');
    return;
  }

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
      time,
      t,
    },
  } = parseCommandStatement(text);

  const userSpecifiedDate = userSpecifiedSlashSeparatedDate || d;
  const remind = userSpecifiedRemind || r;
  const userSpecifiedTime = t || time;

  const isUserSpecifiedDate = typeof userSpecifiedDate === 'string';
  const isUserSpecifiedTime = typeof userSpecifiedTime === 'string';
  const remindFreq = remind === true ? 'once' : remind;
  const timestampObj = dayjsDateObj(date * 1000);
  const timestamp = timestampObj.format('YYYYMMDDHHmmss');

  const [day, month, year] =
    (isUserSpecifiedDate && userSpecifiedDate.split('/')) || [];
  const [hour, minute] =
    typeof userSpecifiedTime === 'string' ? userSpecifiedTime.split(':') : [];

  const actionDateObj = isUserSpecifiedDate
    ? dayjs(
        `${year}-${month}-${day}${isUserSpecifiedTime ? ` ${userSpecifiedTime}` : ''}`,
      )
    : isUserSpecifiedTime
      ? timestampObj.set('hour', hour).set('minute', minute).set('second', '0')
      : timestampObj;
  const actionDate = actionDateObj.format('YYYYMMDDHHmmss');

  const showRemind =
    isUserSpecifiedDate || isUserSpecifiedTime
      ? !!remindFreq
      : !!remindFreq && remindFreq !== 'once';
  const baseParams = `${showRemind ? `remind=${remindFreq}:` : ''}${isUserSpecifiedDate || isUserSpecifiedTime ? `actionDate=${actionDate}:` : ''}`;

  await redis
    .zAdd(`${chatId}:calendarEvent`, {
      score: timestamp,
      value: `${baseParams}${baseParams ? ': ' : ''}${content}`,
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

  if (
    !!userSpecifiedTime &&
    actionDateObj.isSame(dayjsDateObj(), 'day') &&
    actionDateObj.isAfter(dayjsDateObj().add(1, 'minute'), 'minute')
  ) {
    await setReminderCron({ chatId, timestamp, actionDate, content });
  }

  await sendConfirmation(chatId);
};

export const findRemindersForUser = async (chatId) => {
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
          try {
            await setReminderCron({
              chatId,
              timestamp: id,
              actionDate,
              content,
            });
          } catch (err) {
            console.log(
              "Error in setting cron for setting an individual reminder in 'findRemindersForUser' func",
            );
          }
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
