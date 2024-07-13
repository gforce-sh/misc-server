import { isAuthorizedUser } from '../../utils/index.js';

export const validateUser = (body) => {
  let id;
  if (Object.keys(body.callback_query || {}).length) {
    console.log('Received callback query');
    if (`${body.callback_query.message.from.id}` !== `${process.env.BOT_ID}`) {
      console.log('Received message from unknown bot. Printing details below:');
      console.info(JSON.stringify(body));
      return true;
    }
    console.log('Bot is known');
    id = body.callback_query.from.id;
  } else {
    id = body.message.from.id;
  }

  if (!isAuthorizedUser(`${id}`)) {
    console.log('Received message from unknown user. Printing details below:');
    console.info(JSON.stringify(body));
    return true;
  }
  console.log('User is known');
  return false;
};
