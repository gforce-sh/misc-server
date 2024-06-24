import { sendGenericMsg } from './generic.js';

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
    console.log('Sending msg to GS...');
    try {
      await sendGenericMsg(info.facts[0], process.env.CHAT_ID);
    } catch (err) {
      console.error(
        `Error sending telegram message to GS. Printing full error below.`
      );
      console.error(err);
      console.log('Trying to send message again...');
      await sendGenericMsg(info.facts[0], process.env.CHAT_ID);
      console.log('Successfully sent msg in the second try.');
    }
  }

  if (only === 'nc' || all) {
    console.log('Sending msg to NC...');
    try {
      await sendGenericMsg(info.facts[0], process.env.N_CHAT_ID);
    } catch (err) {
      console.error(
        `Error sending telegram message to NC. Printing full error below.`
      );
      console.error(err);
      console.log('Trying to send message again...');
      await sendGenericMsg(info.facts[0], process.env.N_CHAT_ID);
      console.log('Successfully sent msg in the second try.');
    }
  }
};
