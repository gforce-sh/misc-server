export const sendGenericMsg = async (txt, chatId) => {
  await fetch(
    `https://api.telegram.org/bot${
      process.env.BOT_TOKEN
    }/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(txt)}`
  )
    .then((res) => {
      console.log('Successfully sent Telegram msg');
      return res;
    })
    .catch((err) => {
      console.error(
        'Something went wrong in sending request to Telegram server.'
      );
      throw err;
    });
};

export const sendPhoto = async ({ photoUrl, caption, chatId }) => {
  await fetch(
    `https://api.telegram.org/bot${
      process.env.BOT_TOKEN
    }/sendPhoto?chat_id=${chatId}&photo=${encodeURIComponent(
      photoUrl
    )}&caption=${encodeURIComponent(caption)}`
  )
    .then((res) => {
      console.log('Successfully sent Telegram photo');
      return res;
    })
    .catch((err) => {
      console.error(
        'Something went wrong in sending request to Telegram server.'
      );
      throw err;
    });
};
