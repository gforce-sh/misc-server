import { wait } from '../utils/index.js';

const sendTeleMsgOnce = async ({ text, chatId, replyMarkup }) => {
  if (!chatId) throw new Error('Missing chatId in sendTeleMsgOnce');
  if (process.env.NO_MESSAGE_MODE === 'true') {
    console.log(
      'Telegram message sending invoked in no message mode. Msg: ',
      text,
    );
    return;
  }

  await fetch(
    `https://api.telegram.org/bot${
      process.env.BOT_TOKEN
    }/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}${replyMarkup ? `&reply_markup=${JSON.stringify(replyMarkup)}` : ''}`,
  )
    .then((res) => res.json())
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Telegram server returned error: ${res.description}`);
      }
    })
    .then((res) => {
      console.log('Successfully sent Telegram msg');
      return res;
    })
    .catch((err) => {
      console.error(
        'Error in completing request to Telegram: ',
        JSON.stringify(err),
      );
      throw err;
    });
};

export const sendTeleMsg = async (args) => {
  try {
    await sendTeleMsgOnce(args);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    console.log('(2) Trying to send tele msg again after 4s...');
    await wait();
    await sendTeleMsgOnce(args);
    console.log('Successfully sent tele msg in the second try.');
  }
};

export const sendTelePhotoOnce = async ({ photoUrl, caption, chatId }) => {
  await fetch(
    `https://api.telegram.org/bot${
      process.env.BOT_TOKEN
    }/sendPhoto?chat_id=${chatId}&photo=${encodeURIComponent(
      photoUrl,
    )}&caption=${encodeURIComponent(caption)}`,
  )
    .then((res) => {
      console.log('Successfully sent Telegram photo');
      return res;
    })
    .catch((err) => {
      console.error(
        'Error in sending request to Telegram server: ',
        JSON.stringify(err),
      );
      throw err;
    });
};

export const sendConfirmation = (chatId) => sendTeleMsg({ text: '✓', chatId });

export const sendRejection = (chatId) =>
  sendTeleMsg({ text: 'Something went wrong :(', chatId });
