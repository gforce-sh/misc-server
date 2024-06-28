import { sendTeleMsg } from './telegramMessaging.js';

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

  if (only === 'gs' || all) {
    console.log('(1) Attempting to send doggo msg to GS...');
    await sendTeleMsg(info.facts[0], process.env.CHAT_ID);
  }

  if (only === 'nc' || all) {
    console.log('(1) Attempting to send doggo msg to NC...');
    await sendTeleMsg(info.facts[0], process.env.N_CHAT_ID);
  }
};
