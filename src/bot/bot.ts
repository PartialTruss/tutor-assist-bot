import { Bot } from "grammy";
import { env } from "../config/env.js";
import { isCollected } from "../state/homework.js";
import { calendarDate } from "../time.js";
import { registerHomeworkActions } from "./homework.js";
import { authorizeOwner } from "./middleware/authorize.js";
import { registerTaskFormatting, taskKeyboard } from "./tasks.js";

export const ownerCommands = [
  { command: "start", description: "Show the reminder schedule" },
  { command: "status", description: "Today's homework collection status" },
  { command: "tasks", description: "Format a task list into the checklist" },
];

function scheduleOverview(): string {
  const tz = env.cron.timezone;
  return [
    "Personal assistant is online.",
    "",
    `Reminders use ${tz}.`,
    "",
    "Homework",
    "• 14:00 — Time to collect students' homework",
    "• 16:00 — Confirm with Yes or No",
    "• 19:00 — Urgent reminder if it is still open",
    "",
    "Availability and booking",
    "• Friday 10:00 — Check next week's availability",
    "• Saturday–Wednesday 11:00 — Reach out to students who have not booked",
    "",
    "Platform",
    "• Saturday–Thursday 22:00 — Ask students to confirm classes",
    "",
    "/status — today's homework state",
    "/tasks — paste a task list and get the assignment checklist",
  ].join("\n");
}

export function createBot(): Bot {
  const bot = new Bot(env.telegramBotToken);

  bot.use(authorizeOwner);

  bot.command("start", async (ctx) => {
    await ctx.reply(scheduleOverview(), { reply_markup: taskKeyboard });
  });

  bot.command("status", async (ctx) => {
    const date = calendarDate(env.cron.timezone);
    const collected = isCollected(date);
    await ctx.reply(
      collected
        ? `✅ Homework for ${date} is collected.`
        : `❌ Homework for ${date} is not collected.`,
    );
  });

  registerHomeworkActions(bot);
  registerTaskFormatting(bot);

  bot.catch((err) => {
    console.error("[bot] Unhandled error:", err.error);
  });

  return bot;
}
