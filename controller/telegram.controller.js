import {
  findRemindersforUser,
  handleIncomingCallback,
  handleIncomingMsg,
  logBotCommand,
  validateUser,
} from '../service/chatBot.service.js';
import { sendTeleMsg } from '../service/telegramMessaging.service.js';
import { wait } from '../utils/index.js';

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
    const events = await findRemindersforUser(process.env.CHAT_ID);

    if (!events?.length) {
      console.log('No reminder events found for this day.');
      return;
    }

    for (const event of events) {
      await sendTeleMsg({ text: event, chatId: process.env.CHAT_ID });
      await wait(100);
    }
  } catch (err) {
    console.error('Printing full error: ', err);
    throw err;
  }
};
