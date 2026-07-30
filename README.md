# Tutor Assist Bot

TypeScript Telegram bot for managing tutoring students: Meet links, task statuses, and scheduled reminders — backed by Appwrite.

Built with [grammY](https://grammy.dev/), [Appwrite](https://appwrite.io/), and [node-cron](https://www.npmjs.com/package/node-cron).

---

## Features

### Menu (`/start` / `/menu`)

1. **Add a student** — name + Google Meet link  
2. **List of all students** — name, Meet link, status emoji  
3. **Search for students** — partial name match  
4. **Update a student** — change **status** or **Meet link**  
5. **Delete a student** — with confirmation  

### Scheduled reminders

| Time (default) | Who | Message |
| --- | --- | --- |
| **14:00** | You (`MY_CHAT_ID`) | Check students’ homework |
| **21:00** | Teacher (`TEACHER_CHAT_ID`) | OneNote tasks + list of **remaining** (not finalized) student statuses |

Timezone defaults to `Asia/Tehran` (`TZ`).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Bot framework | grammY |
| Database | Appwrite (`node-appwrite`) |
| Scheduling | node-cron |
| Runtime | Node.js 18+ · TypeScript |

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/telegram-bot.git
cd telegram-bot
npm install
cp .env.example .env
```

Fill in `.env`, then:

```bash
npm run dev          # development
npm run build && npm start   # production
```

Open Telegram → message the bot → `/start`.

---

## Environment variables

**Never commit `.env`.**

| Variable | Required | Description |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes | From BotFather |
| `TEACHER_CHAT_ID` | Yes | Teacher Telegram user ID (21:00 digest + status RBAC) |
| `MY_CHAT_ID` | Yes | Your Telegram user ID (14:00 homework reminder) |
| `TA_CHAT_ID` | Yes | TA Telegram user ID (status RBAC) |
| `SENDER_NAME` | No | Name shown in reminders |
| `APPWRITE_ENDPOINT` | Yes | e.g. `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Yes | Project ID |
| `APPWRITE_API_KEY` | Yes | Server key with Databases read/write |
| `APPWRITE_DATABASE_ID` | Yes | Database ID |
| `APPWRITE_STUDENTS_COLLECTION_ID` | Yes | e.g. `students` |
| `HOMEWORK_CHECK_CRON` | No | Default `0 14 * * *` |
| `TEACHER_DIGEST_CRON` | No | Default `0 21 * * *` |
| `TZ` | No | Default `Asia/Tehran` |

---

## Appwrite `students` attributes

| Attribute | Type | Required |
| --- | --- | --- |
| `name` | String | Yes |
| `telegramChatId` | String | No |
| `meetLink` | String (URL) | No |
| `homeworkNote` | String | No |
| `taskStatus` | String | No (`✅` `☑️` `🕒` `💎`) |
| `teacherApproved` | Boolean | No |
| `taApproved` | Boolean | No |
| `finalized` | Boolean | No |

Index: equality on `name`.

---

## Status buttons (Teacher / TA / you)

On a student’s task card:

- ✅ Student done · ☑️ TA done · 🕒 Needs TA · 💎 Needs Teacher  
- **Finalize** — only after both Teacher and TA approvals  

Open a card via **Update a student → Update status**, or `/setstatus Alice`.

---

## Useful commands

| Command | Action |
| --- | --- |
| `/menu` | Main menu |
| `/addstudent <name> <url>` | Quick add |
| `/meet <name> <url>` | Update Meet link |
| `/setstatus <name>` | Status keyboard |
| `/status` | List everyone |
| `/cancel` | Abort a prompt |

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | `tsx watch` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run `dist/index.js` |
| `npm run typecheck` | Type-check only |

---

## License

MIT
