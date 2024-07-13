export const crons = {};
export const cronOptions = { timezone: 'Asia/Singapore' };

export const resetCrons = (keyNames) => {
  Object.keys(crons).forEach((key) => {
    if (!keyNames?.length || keyNames.includes(key)) {
      if (crons[key]) {
        crons[key].stop();
        delete crons[key];
      }
    }
  });
};
