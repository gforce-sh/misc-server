export const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms || 4000));

export const isAuthorizedUser = (id) => [process.env.CHAT_ID].includes(id);
