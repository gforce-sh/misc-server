import { wait } from '../utils/index.js';

const sendTeleMsgOnce = async (txt, chatId) => {
  await fetch(
    `https://api.telegram.org/bot${
      process.env.BOT_TOKEN
    }/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(txt)}`,
  )
    .then((res) => {
      console.log('Successfully sent Telegram msg');
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

export const sendTeleMsg = async (txt, chatId) => {
  try {
    await sendTeleMsgOnce(txt, chatId);
  } catch (err) {
    console.log('(2) Trying to send tele msg again after 4s...');
    await wait();

    try {
      await sendTeleMsgOnce(txt, chatId);
      console.log('Successfully sent tele msg in the second try.');
    } catch (err) {
      console.log('(3) Trying to send tele msg again after 4s...');
      await wait();

      await sendTeleMsgOnce(txt, chatId);
      console.log('Successfully sent tele msg in the third try.');
    }
  }
};

export const sendTelePhoto = async ({ photoUrl, caption, chatId }) => {
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
