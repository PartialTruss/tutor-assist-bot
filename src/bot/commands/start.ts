import type { CommandContext, Context } from "grammy";
import { clearPending } from "../session.js";
import { showMainMenu } from "../menu/handlers.js";

export async function startCommand(ctx: CommandContext<Context>): Promise<void> {
  await showMainMenu(ctx);
}

export async function menuCommand(ctx: CommandContext<Context>): Promise<void> {
  await showMainMenu(ctx);
}

export async function cancelCommand(ctx: CommandContext<Context>): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId !== undefined) {
    clearPending(chatId);
  }
  await ctx.reply("Cancelled. Open `/menu` whenever you’re ready.", {
    parse_mode: "Markdown",
  });
}

export async function helpCommand(ctx: CommandContext<Context>): Promise<void> {
  await ctx.reply(
    [
      "👋 *Telegram Reminder Bot*",
      "",
      "*Menu*",
      "`/start` or `/menu` — Open the interactive menu",
      "",
      "*Menu buttons*",
      "• *Add Student* — Create a student with Meet link",
      "• *Send Reminder* — Manually remind a student",
      "• *Update Status* — Open a student’s status buttons",
      "• *Search Link* — Look up a student’s Meet link",
      "• *Saved Links* — List all saved Meet links",
      "• *List Students* — Status dashboard",
      "",
      "*Commands*",
      "`/addstudent <name> <url>` — Create student + Meet link",
      "`/meet <student> <url>` — Update an existing student’s Meet link",
      "`/status` — List students, Meet links, and task status",
      "`/setstatus <name>` — Open status buttons for one student",
      "`/cancel` — Cancel a pending prompt",
      "`/help` — Show this message",
      "",
      "*Task statuses* (Teacher / TA only)",
      "✅ Student done · ☑️ TA done · 🕒 Needs TA · 💎 Needs Teacher",
      "Finalize requires both Teacher and TA approval.",
    ].join("\n"),
    { parse_mode: "Markdown" },
  );
}
