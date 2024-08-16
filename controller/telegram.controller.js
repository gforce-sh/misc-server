import {
  handleIncomingCallback,
  handleIncomingMsg,
  logBotCommand,
} from '../service/chatBot.service.js';
import { sendTeleMsg } from '../service/telegramMessaging.service.js';
import { getInlineButtonMarkup, wait } from '../utils/index.js';
import { validateUser } from '../service/method/userValidate.chatbot.method.js';
import { findRemindersForUser } from '../service/method/calendarEvent.chatbot.method.js';

export const gsBotMessaged = async (req, res) => {
  try {
    const { body } = req;

    const isStranger = validateUser(body);
    if (isStranger) {
      res.status(200).json('ok');
      return;
    }

    const isBotCommand = logBotCommand(body);

    if (isBotCommand) {
      await handleIncomingMsg(body.message);
    } else {
      await handleIncomingCallback(body.callback_query);
    }
  } catch (err) {
    console.error('Printing full error: ', err);
    throw err;
  }
};

export const getDaysReminders = async () => {
  try {
    const events = await findRemindersForUser(process.env.CHAT_ID);

    if (!events?.length) {
      console.log('No reminder events found for this day.');
      return;
    }

    for (const event of events) {
      await sendTeleMsg({
        text: event.content,
        chatId: process.env.CHAT_ID,
        replyMarkup: getInlineButtonMarkup([
          ['📛', `/deleteText --id=${event.id} --type=calendarEvent`],
        ]),
      });
      await wait(25);
    }
  } catch (err) {
    console.error('Printing full error: ', err);
    throw err;
  }
};
