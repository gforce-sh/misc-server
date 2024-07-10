# Miscellaneous Server

## Deployed host

`https://misc-server-sx0b.onrender.com`

## Routes

1. GET `/`
2. GET `/daily-rk-time`
3. GET `/nc-doggo`
4. POST `/gs-bot/messaged`
5. GET `/gs-bot/days-reminders`

## Telegram commands

- `/start`
- `/rknd` @params{1} "--(d)ate=dd/mm/yyyy"
- `/help`
- `/calendarEvent` / `/ce` @params{2} Optional:"--(d)ate=dd/mm/yyyy" Optional:"--(r)emind={default:
  once/annually/monthly/weekly/daily}"
- `/getText` / `/gt` @params{1} "--all"
- `/deleteText` / `/dt` @params{1} "--id={id}"
- `editText` / `/et` @params{1} "string any" "--id={id}"
- `none` @params{0} "string any"

## Webhook

`https://api.telegram.org/bot<id>/setWebhook?url=<webhookUrl>`

