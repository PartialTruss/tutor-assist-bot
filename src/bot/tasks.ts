import { Keyboard, type Bot, type Context } from "grammy";

const CHECKLIST_TITLE = "🎯 YOUR ASSIGNMENT CHECKLIST 🎯";
const CHECKLIST_SUBTITLE = "🗓 Tasks for Next session:";

/** Number, bullet, or checkbox at the start of a line. */
const LEADING_MARKER = /^(?:\d+\s*[.)\-:]\s*|[-*•–—]\s+|☑️\s*|✅\s*)/;

const waitingForTasks = new Set<number>();

export const taskKeyboard = new Keyboard().text("Format tasks").resized().persistent();

function isHeader(line: string): boolean {
  return (
    line.includes("YOUR ASSIGNMENT CHECKLIST") ||
    line.startsWith("🗓") ||
    /^tasks for next session:?$/i.test(line)
  );
}

function stripMarker(line: string): string {
  let rest = line.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const next = rest.replace(LEADING_MARKER, "").trim();
    if (next === rest) break;
    rest = next;
  }
  return rest;
}

/** One task per line. A leading number or bullet is optional. */
export function parseTasks(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("/"))
    .filter((line) => !isHeader(line))
    .map(stripMarker)
    .filter((line) => line.length > 0);
}

export function formatAssignmentChecklist(tasks: string[]): string {
  return [CHECKLIST_TITLE, CHECKLIST_SUBTITLE, ...tasks.map((task) => `☑️ ${task}`)].join(
    "\n",
  );
}

export function formatTasksMessage(raw: string): string | null {
  const tasks = parseTasks(raw);
  if (tasks.length === 0) return null;
  return formatAssignmentChecklist(tasks);
}

async function sendChecklist(ctx: Context, raw: string): Promise<void> {
  const formatted = formatTasksMessage(raw);
  if (!formatted) {
    await ctx.reply("No tasks found. Send one task per line. Numbers are optional.");
    return;
  }
  await ctx.reply(formatted, { reply_markup: taskKeyboard });
}

export function registerTaskFormatting(bot: Bot): void {
  bot.hears("Format tasks", async (ctx) => {
    if (!ctx.chat) return;
    waitingForTasks.add(ctx.chat.id);
    await ctx.reply("Send the tasks, one per line. Numbers are optional.");
  });

  bot.command("tasks", async (ctx) => {
    const payload = ctx.match.trim();
    if (!payload) {
      if (ctx.chat) waitingForTasks.add(ctx.chat.id);
      await ctx.reply("Send the tasks, one per line. Numbers are optional.");
      return;
    }
    if (ctx.chat) waitingForTasks.delete(ctx.chat.id);
    await sendChecklist(ctx, payload);
  });

  bot.command("cancel", async (ctx) => {
    if (!ctx.chat || !waitingForTasks.delete(ctx.chat.id)) return;
    await ctx.reply("Cancelled.");
  });

  bot.on("message:text", async (ctx) => {
    if (!ctx.chat || !waitingForTasks.delete(ctx.chat.id)) return;
    await sendChecklist(ctx, ctx.message.text);
  });
}
