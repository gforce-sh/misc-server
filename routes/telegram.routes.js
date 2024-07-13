import express from 'express';

import {
  gsBotMessaged,
  getDaysReminders,
} from '../controller/telegram.controller.js';

const router = express.Router();

router.post('/messaged', async (req, res) => {
  try {
    await gsBotMessaged(req, res);
    res.status(200).json('ok');
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // Send success to prevent telegram from re-calling hook
    res.status(200).json('ok');
  }
});

router.get('/days-reminders', async (req, res, next) => {
  try {
    await getDaysReminders();
    res.status(200).json('ok');
  } catch (err) {
    next(err);
  }
});

export default router;
