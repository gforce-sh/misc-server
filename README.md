# Miscellaneous Server

## Deployed host

`https://misc-server-sx0b.onrender.com`

## Routes

1. GET `/`
2. GET `/daily-rk-time`
3. GET `/nc-doggo`
4. POST `/gs-bot-messaged`

## Telegram commands

- `/start`
- `/rknd` @params{1} "--date=dd/mm/yyyy"
- `/help`
- `/calendarEvent` / `/ce` @params{2} "--date=dd/mm/yyyy" "--reminder={annual/monthly/weekly/daily}"
- `/getText` / `/gt` @params{1} "--all"
- `/deleteText` / `/dt` @params{1} "--id={id}"
- `editText` / `/et` @params{2} "string any" "--id={id}"
- `none` @params{1} string any

## Webhook

`https://api.telegram.org/bot<id>/setWebhook?url=<webhookUrl>`

