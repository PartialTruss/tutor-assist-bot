# Telegram Class Reminder Bot

A TypeScript Telegram bot for tutors and teachers: store Google Meet links per student, send homework reminders on a schedule, and ping a teacher about OneNote tasks — backed by Appwrite.

Built with [grammY](https://grammy.dev/), [Appwrite](https://appwrite.io/), and [node-cron](https://www.npmjs.com/package/node-cron).

---

## Features

- **Interactive menu** (`/start` / `/menu`) with inline buttons  
  - Add Student · Send Reminder · Search Link · Saved Links  
- **Add students** with name + Meet link (chat ID optional)  
- **Update Meet links** for existing students (`/meet`)  
- **Daily student homework reminders** (default 12:00, timezone-aware)  
- **Daily teacher OneNote reminder** to a fixed Telegram chat ID  
- Fully typed Node.js / TypeScript codebase with a modular layout  

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Bot framework | grammY |
| Database | Appwrite (`node-appwrite`) |
| Scheduling | node-cron |
| Runtime | Node.js 18+ · TypeScript |

---

## Prerequisites

1. **Node.js** 18 or newer  
2. A **Telegram bot token** from [@BotFather](https://t.me/BotFather)  
3. An **Appwrite** project (Cloud or self-hosted) with a database + `students` collection  
4. Network access to `api.telegram.org` (use a VPN/proxy if Telegram is blocked in your region)

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/telegram-bot.git
cd telegram-bot
npm install
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment variables](#environment-variables)), then:

```bash
# Development (auto-reload)
npm run dev

# Production
npm run build
npm start
```

When the bot is online you should see:

```text
[boot] Bot @YourBotUsername is online.
```

Open Telegram, message your bot, and send `/start`.

---

## Environment variables

Copy `.env.example` → `.env`. **Never commit `.env`.**

| Variable | Required | Description |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes | Token from BotFather |
| `TEACHER_CHAT_ID` | Yes | Teacher’s numeric Telegram chat ID |
| `SENDER_NAME` | No | Name used in the teacher reminder (default: `My Name`) |
| `APPWRITE_ENDPOINT` | Yes | e.g. `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Yes | Appwrite project ID |
| `APPWRITE_API_KEY` | Yes | Server API key with Databases read/write |
| `APPWRITE_DATABASE_ID` | Yes | Database ID |
| `APPWRITE_STUDENTS_COLLECTION_ID` | Yes | Collection ID (e.g. `students`) |
| `STUDENT_REMINDER_CRON` | No | Default `0 12 * * *` (12:00 daily) |
| `TEACHER_REMINDER_CRON` | No | Default `0 9 * * *` (09:00 daily) |
| `TZ` | No | IANA timezone (default `Asia/Tehran`) |

Cron expressions use standard [node-cron](https://www.npmjs.com/package/node-cron) / crontab syntax.

---

## Appwrite setup

### 1. Create a database and collection

Create a collection (e.g. `students`) with these attributes:

| Attribute | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | String | Yes | Used for lookups (`/meet`, Search Link, etc.) |
| `telegramChatId` | String | No | Needed only to DM homework reminders |
| `meetLink` | String (URL) | No | Google Meet URL |
| `homeworkNote` | String | No | Optional note appended to reminders |

### 2. Indexes

Add an **equality** index on `name` so name lookups are reliable.

### 3. API key permissions

Create a server API key with at least:

- `databases.read`
- `databases.write`

---

## Bot usage

### Menu buttons

| Button | What it does |
| --- | --- |
| **Add Student** | Guided flow: name → Meet URL |
| **Send Reminder** | Ask for a student name, then DM them a homework reminder |
| **Search Link** | Look up one student’s Meet link by name |
| **Saved Links** | List every student who has a Meet link saved |

### Commands

| Command | Description |
| --- | --- |
| `/start` · `/menu` | Open the interactive menu |
| `/help` | Show help text |
| `/addstudent <name> <meet-url>` | Create a student + Meet link |
| `/meet <student> <meet-url>` | Update Meet link (by name or document ID) |
| `/cancel` | Abort a pending prompt |

**Examples**

```text
/addstudent Alice https://meet.google.com/abc-defg-hij
/addstudent Jane Doe https://meet.google.com/abc-defg-hij
/meet Alice https://meet.google.com/xyz-uvwx-rst
```

### Scheduled messages

- **Students** (default 12:00): homework reminder; includes Meet link / homework note when set. Students without `telegramChatId` are skipped.  
- **Teacher** (default 09:00):

  ```text
  Reminder from {SENDER_NAME}: Please check your tasks on OneNote.
  ```

> To receive Telegram DMs, a student must have opened the bot at least once **and** have their chat ID stored in Appwrite.

---

## Project structure

```text
telegram-bot/
├── src/
│   ├── index.ts                 # Entry: Telegram preflight + bot + cron
│   ├── config/
│   │   └── env.ts               # Typed env loading / validation
│   ├── db/
│   │   ├── appwrite.ts          # Appwrite client
│   │   └── students.ts          # Student collection helpers
│   ├── bot/
│   │   ├── bot.ts               # grammY bot factory
│   │   ├── session.ts           # In-memory prompt state
│   │   ├── utils.ts             # Shared validators / escaping
│   │   ├── menu/
│   │   │   ├── keyboard.ts      # Inline keyboard
│   │   │   └── handlers.ts      # Callback + guided flows
│   │   └── commands/
│   │       ├── index.ts
│   │       ├── start.ts         # /start /menu /help /cancel
│   │       ├── meet.ts          # /meet
│   │       └── addStudent.ts    # /addstudent
│   ├── cron/
│   │   ├── index.ts             # Job registration
│   │   ├── studentReminders.ts
│   │   └── teacherReminder.ts
│   └── types/
│       └── student.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run with `tsx watch` (reload on change) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled `dist/index.js` |
| `npm run typecheck` | Type-check without emitting |

---

## Troubleshooting

### Bot hangs / never prints “online”

Your machine likely cannot reach `api.telegram.org` (timeout). Connect a VPN (or HTTP proxy), then restart `npm run dev`. The boot check will fail fast with a clear message if Telegram is unreachable.

### “Student not found”

Names are matched **exactly** as stored in Appwrite (case-sensitive). Use the exact `name` attribute, or the document ID with `/meet`.

### Reminders not arriving

1. Student has a valid `telegramChatId`  
2. They have started a chat with the bot  
3. Cron timezone (`TZ`) matches your expectation  
4. The process is still running at the scheduled time  

---

## Security

- Keep secrets in `.env` only — it is gitignored.  
- Use `.env.example` with **placeholders**, never real tokens.  
- If a token or API key was ever committed or shared, **rotate it** in BotFather / Appwrite immediately.  
- Scope the Appwrite API key to the minimum permissions required.

---

## License

MIT — feel free to fork and adapt for your own classes or tutoring workflow.
