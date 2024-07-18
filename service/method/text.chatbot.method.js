import {
  dayjsDateObj,
  getInlineButtonMarkup,
  parseCommandStatement,
  toStr,
  wait,
} from '../../utils/index.js';
import { redis } from '../../redis.js';
import {
  sendConfirmation,
  sendRejection,
  sendTeleMsg,
} from '../telegramMessaging.service.js';

export const onSimpleText = async ({ chatId, text, date }) => {
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

const getMsgTypeFromCmd = (cmd) => {
  switch (cmd) {
    case '/gt':
    case '/getText':
      return 'text';
    case '/gce':
    case 'getCalendarEvent':
      return 'calendarEvent';
  }
  throw new Error('Cannot get msg type from command');
};

export const onGetText = async (message) => {
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
    const paramSplitContent = content.value.split(':: ');
    await sendTeleMsg({
      text: paramSplitContent[1] || paramSplitContent[0],
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

    await wait(25);
  }
};

export const onDeleteText = async (message) => {
  const {
    data,
    chat: { id: chatId },
  } = message;
  const {
    args: { id, type },
  } = parseCommandStatement(data);

  const del = await redis
    .zRemRangeByScore(`${chatId}:${type}`, id, id, (err) => {
      console.log('Error in deleting item(s) from DB. Err: \n', err);
    })
    .then((r) => {
      console.log(`${id} id in ${chatId}:${type} deleted successfully.`);
      return r;
    })
    .catch((err) => {
      console.log('Error in delete operation');
      throw err;
    });

  if (del === 1) {
    await sendConfirmation(chatId);
  } else {
    await sendRejection(chatId);
    throw new Error('Somehow more than 1 element was found and deleted');
  }
};
