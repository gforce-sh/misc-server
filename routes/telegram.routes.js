import express from 'express';

import { gsBotMessaged } from '../controller/telegram.controller.js';

const router = express.Router();

router.post('/messaged', async (req, res, next) => {
  try {
    await gsBotMessaged(req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
