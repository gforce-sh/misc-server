import { sendPhoto } from './generic.js';

export const sendDoggoInfo = async () => {
  const info = await Promise.all([
    fetch('https://dog-api.kinduff.com/api/facts?numer=1'),
    fetch('https://random.dog/woof.json'),
  ]).then((responses) => Promise.all(responses.map((r) => r.json())));

  console.log('fetched doggo info');

  await Promise.all([
    sendPhoto({
      photoUrl: info[1].url,
      caption: info[0].facts[0],
      chatId: process.env.N_CHAT_ID,
    }),
    sendPhoto({
      photoUrl: info[1].url,
      caption: info[0].facts[0],
      chatId: process.env.CHAT_ID,
    }),
  ]);
};
