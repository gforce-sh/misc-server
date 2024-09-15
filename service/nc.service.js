import { sendTeleMsg } from './telegramMessaging.service.js';

export const sendDoggoInfo = async (only) => {
  const info = await fetch('https://dog-api.kinduff.com/api/facts?numer=1')
    .then((response) => {
      console.log('fetched doggo info');
      return response.json();
    })
    .catch((err) => {
      console.error('Error fetching dog facts from dog-api.kinduff.com');
      throw err;
    });

  const all = !only;
  const text = `Your daily doggo fact:\n\n${info.facts[0]}`;

  if (only === 'gs' || all) {
    console.log('(1) Attempting to send doggo msg to GS...');
    await sendTeleMsg({ text, chatId: process.env.CHAT_ID });
  }

  if (only === 'nc' || all) {
    console.log('(1) Attempting to send doggo msg to NC...');
    await sendTeleMsg({ text, chatId: process.env.N_CHAT_ID });
  }
};
