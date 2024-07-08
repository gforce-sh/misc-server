import express from 'express';

import {
  dailyRkTime,
  ncDoggo,
  ncCustomText,
} from '../controller/personal.controller.js';

const router = express.Router();

router.get('/daily-rk-time', async (req, res, next) => {
  try {
    await dailyRkTime(req, res);
  } catch (err) {
    next(err);
  }
});

router.get('/nc-doggo', async (req, res, next) => {
  try {
    await ncDoggo(req, res);
  } catch (err) {
    next(err);
  }
});

router.get('/nc-custom-text', async (req, res, next) => {
  try {
    await ncCustomText(req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
