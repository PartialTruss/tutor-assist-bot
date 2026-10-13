# Personal assistant bot

Private Telegram bot for daily homework collection, weekly availability, class booking, and platform confirmation reminders.

Built with [grammY](https://grammy.dev/) and [node-cron](https://www.npmjs.com/package/node-cron). It only accepts updates from, and only sends messages to, the Telegram user id in `MY_CHAT_ID`.

## Reminders

All times use `TZ` (default `Europe/Brussels`).

| When | Message |
| --- | --- |
| Every day 14:00 | Time to collect students' homework! |
| Every day 16:00 | Did you collect the homework? — ✅ Yes / ❌ No |
| Every day 19:00 | Urgent reminder, only if homework is still not collected |
| Friday 10:00 | Check who is and isn't available for next week. |
| Saturday–Wednesday 11:00 | Check who hasn't booked their classes yet and reach out to them. |
| Saturday–Thursday 22:00 | Inform students to confirm their classes on the platform. |

✅ **Yes** stores that calendar day as collected. ❌ **No** stores it as not collected. Ignoring the 16:00 prompt leaves the day uncollected, so the 19:00 reminder still goes out.

The buttons stay on the message, so a mis-tap can be corrected before 19:00. Each button carries its own date, so yesterday's prompt cannot change today.

## Homework state

Today's answer is kept in an in-memory map and written to `data/homework-state.json`. On startup the bot loads that file, so a restart on the same disk keeps a Yes clicked earlier in the day.

`/status` reports the Brussels calendar day.

## Start

Requirements: Node.js 18+.

```bash
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

1. `TELEGRAM_BOT_TOKEN` from [@BotFather](https://t.me/BotFather).
2. `MY_CHAT_ID` — your numeric Telegram user id (ask [@userinfobot](https://t.me/userinfobot)).
3. `TZ=Europe/Brussels`, unless you want another IANA timezone.

```bash
npm run dev
```

Open a private chat with the bot and send `/start` once. Telegram only delivers bot messages after that.

Production:

```bash
npm run build
npm start
```

The process also listens on `PORT` (default `3000`) and answers `GET /` for a hosting health check. Run a single instance; a second poller gets a Telegram 409 conflict.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run with `tsx watch` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run `dist/index.js` |
| `npm run typecheck` | Type-check only |

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes | BotFather token |
| `MY_CHAT_ID` | Yes | Your Telegram user id |
| `TZ` | No | Default `Europe/Brussels` |
| `HOMEWORK_COLLECT_CRON` | No | Default `0 14 * * *` |
| `HOMEWORK_FOLLOWUP_CRON` | No | Default `0 16 * * *` |
| `HOMEWORK_URGENT_CRON` | No | Default `0 19 * * *` |
| `AVAILABILITY_CRON` | No | Default `0 10 * * 5` (Friday) |
| `BOOKING_CRON` | No | Default `0 11 * * 0,1,2,3,6` (Sat–Wed) |
| `PLATFORM_CONFIRM_CRON` | No | Default `0 22 * * 0,1,2,3,4,6` (Sat–Thu) |
| `PORT` | No | Health-check port, default `3000` |

## License

MIT
