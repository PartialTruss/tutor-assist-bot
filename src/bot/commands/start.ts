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
  if (chatId !== undefined) clearPending(chatId);
  await ctx.reply("Cancelled. Open `/menu` when ready.", {
    parse_mode: "Markdown",
  });
}

export async function helpCommand(ctx: CommandContext<Context>): Promise<void> {
  await ctx.reply(
    [
      "👋 *Tutor Assist Bot*",
      "",
      "*Menu* (`/start` or `/menu`)",
      "• Add a student",
      "• List of all students",
      "• Search for students",
      "• Update a student (status or Meet link)",
      "• Delete a student",
      "",
      "*Commands*",
      "`/addstudent <name> <url>`",
      "`/meet <name> <url>` — update Meet link",
      "`/setstatus <name>` — status buttons",
      "`/status` — list everyone",
      "`/cancel` — abort a prompt",
      "",
      "*Scheduled*",
      "• 14:00 → you: check students’ homework",
      "• 21:00 → teacher: OneNote + remaining tasks",
    ].join("\n"),
    { parse_mode: "Markdown" },
  );
}
