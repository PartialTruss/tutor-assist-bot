import { InlineKeyboard, type Api, type Bot, type Context } from "grammy";
import cron, { type ScheduledTask } from "node-cron";
import { env } from "../config/env.js";
import { sendToOwner } from "../notify.js";
import {
  addReminder,
  dueReminders,
  listReminders,
  reminderLimit,
  removeReminder,
  type Reminder,
} from "../state/reminders.js";
import { formatWhen } from "../time.js";
import { ownerKeyboard } from "./keyboard.js";
import { parseReminderInput, reminderExamples } from "./parseReminder.js";
import { clearPending, setPending } from "./pending.js";

let delivering = false;

export function registerReminders(bot: Bot): void {
  bot.hears("Set reminder", async (ctx) => {
    if (!ctx.chat) return;
    setPending(ctx.chat.id, "reminder");
    await ctx.reply(reminderExamples(env.cron.timezone));
  });

  bot.hears("My reminders", async (ctx) => {
    if (ctx.chat) clearPending(ctx.chat.id);
    await replyWithReminderList(ctx);
  });

  bot.command("remind", async (ctx) => {
    const payload = ctx.match.trim();
    if (!payload) {
      if (ctx.chat) setPending(ctx.chat.id, "reminder");
      await ctx.reply(reminderExamples(env.cron.timezone));
      return;
    }
    if (ctx.chat) clearPending(ctx.chat.id);
    await saveReminderFromText(ctx, payload);
  });

  bot.command("reminders", async (ctx) => {
    if (ctx.chat) clearPending(ctx.chat.id);
    await replyWithReminderList(ctx);
  });

  bot.callbackQuery(/^rm:([0-9a-f]+)$/, async (ctx) => {
    const id = ctx.match[1];
    if (!id) {
      await ctx.answerCallbackQuery({ text: "That reminder is already gone." });
      return;
    }

    const removed = await removeReminder(id);
    await ctx.answerCallbackQuery({
      text: removed ? "Reminder removed." : "That reminder is already gone.",
    });

    const items = listReminders();
    const text =
      items.length === 0
        ? "Reminder removed. You have no reminders."
        : formatReminderList(items, env.cron.timezone);
    try {
      await ctx.editMessageText(text, {
        reply_markup: items.length > 0 ? reminderCancelKeyboard(items) : { inline_keyboard: [] },
      });
    } catch (error) {
      console.error("[reminder] Failed to update the list:", error);
    }
  });
}

export async function saveReminderFromText(ctx: Context, raw: string): Promise<void> {
  const parsed = parseReminderInput(raw, env.cron.timezone);
  if (!parsed.ok) {
    if (ctx.chat) setPending(ctx.chat.id, "reminder");
    const details = parsed.showExamples
      ? `${parsed.error}\n\n${reminderExamples(env.cron.timezone)}`
      : parsed.error;
    await ctx.reply(details);
    return;
  }

  if (listReminders().length >= reminderLimit()) {
    await ctx.reply(`You already have ${reminderLimit()} reminders. Cancel one before adding another.`);
    return;
  }

  try {
    await addReminder(parsed.text, parsed.dueAt);
  } catch (error) {
    console.error("[reminder] Failed to save:", error);
    await ctx.reply("Could not save that reminder. Try again.");
    return;
  }

  const when = formatWhen(parsed.dueAt, env.cron.timezone);
  await ctx.reply(`Reminder set for ${when}.\n${parsed.text}`, {
    reply_markup: ownerKeyboard,
  });

  if (parsed.dueAt.getTime() <= Date.now()) {
    await deliverDueReminders(ctx.api);
  }
}

export function startReminderLoop(api: Api): ScheduledTask {
  const expression = "* * * * *";
  if (!cron.validate(expression)) {
    throw new Error(`Invalid reminder poll: "${expression}"`);
  }

  void deliverDueReminders(api);
  const task = cron.schedule(expression, () => void deliverDueReminders(api), {
    timezone: env.cron.timezone,
  });
  console.log(`[reminder] Personal reminders poll every minute (${env.cron.timezone})`);
  return task;
}

export async function deliverDueReminders(api: Api): Promise<void> {
  if (delivering) return;
  delivering = true;
  try {
    const now = new Date();
    for (const reminder of dueReminders(now)) {
      try {
        await sendToOwner(api, notificationText(reminder, now));
        await removeReminder(reminder.id);
        console.log(`[reminder] Sent ${reminder.id}`);
      } catch (error) {
        console.error(`[reminder] Failed to send ${reminder.id}:`, error);
      }
    }
  } finally {
    delivering = false;
  }
}

function notificationText(reminder: Reminder, now: Date): string {
  const late = now.getTime() - Date.parse(reminder.dueAt) > 2 * 60 * 1000;
  const when = formatWhen(new Date(reminder.dueAt), env.cron.timezone);
  return late
    ? `⏰ Reminder\nScheduled for ${when}\n\n${reminder.text}`
    : `⏰ Reminder\n\n${reminder.text}`;
}

async function replyWithReminderList(ctx: Context): Promise<void> {
  const items = listReminders();
  await ctx.reply(formatReminderList(items, env.cron.timezone), {
    reply_markup: items.length > 0 ? reminderCancelKeyboard(items) : ownerKeyboard,
  });
}

function formatReminderList(items: Reminder[], timeZone: string): string {
  if (items.length === 0) return "You have no reminders.";

  const lines = [`Upcoming reminders (${timeZone})`, ""];
  items.forEach((reminder, index) => {
    lines.push(`${index + 1}. ${formatWhen(new Date(reminder.dueAt), timeZone)}`);
    lines.push(`   ${preview(reminder.text)}`);
  });
  lines.push("", "Tap ✖️ to cancel one.");
  return lines.join("\n");
}

function preview(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 200 ? `${oneLine.slice(0, 197)}...` : oneLine;
}

function reminderCancelKeyboard(items: Reminder[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  items.forEach((reminder, index) => {
    keyboard.text(`✖️ ${index + 1}`, `rm:${reminder.id}`);
    if (index % 4 === 3) keyboard.row();
  });
  return keyboard;
}
