import express from 'express';

import {
  dailyRkTime,
  ncDoggo,
  ncCustomText,
} from '../controller/personal.controller.js';
import { crons } from '../crons.js';

const router = express.Router();

router.get('/daily-rk-time', async (req, res, next) => {
  try {
    await dailyRkTime(req, res, next);
    res.status(200).json('success');
  } catch (err) {
    next(err);
  }
});

router.get('/print-active-crons', async (req, res, next) => {
  try {
    console.log('crons', crons);
    res.status(200).json('success');
  } catch (err) {
    next(err);
  }
});

router.get('/nc-doggo', async (req, res, next) => {
  try {
    await ncDoggo(req, res, next);
    res.status(200).json('success');
  } catch (err) {
    next(err);
  }
});

router.get('/nc-custom-text', async (req, res, next) => {
  try {
    await ncCustomText(req, res);
    res.status(200).json('success');
  } catch (err) {
    next(err);
  }
});

export default router;
