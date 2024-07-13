import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import personalRouter from './routes/personal.routes.js';
import telegramRouter from './routes/telegram.routes.js';

dotenv.config();
console.log('Env is ', process.env.NODE_ENV);

const app = express();

app.use(express.json());
app.use(cors());

app.use('/', (req, res, next) => {
  const date = new Date();
  console.log(
    `A new request for ${
      req.url
    } received at ${date.getHours()} ${date.getMinutes()} ${date.getSeconds()}`,
  );
  next();
});

app.get('/', (req, res) => {
  res.json('Hello world!');
});

app.use('/', personalRouter);
app.use('/gs-bot', telegramRouter);

// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, next) => {
  res.status(err.code || 500).json({ message: err.message });
});

export default app;
