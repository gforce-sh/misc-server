export const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms || 4000));
