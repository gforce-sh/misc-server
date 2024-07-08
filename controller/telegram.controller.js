import {
  handleIncomingCallback,
  handleIncomingMsg,
  logBotCommand,
  validateUser,
} from '../service/chatBot.service.js';

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

    res.status(200).json('ok');
  } catch (err) {
    console.log(err.message);
    console.error('Printing full error: ', err);

    // Send success to prevent telegram from re-calling hook
    res.status(200).json('ok');
  }
};
