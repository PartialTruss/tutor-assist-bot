import type { CommandContext, Context } from "grammy";
import { listStudents } from "../../db/students.js";
import { formatStatusDashboard } from "../status/keyboard.js";
import { mainMenuKeyboard } from "../menu/keyboard.js";
import { replyChunked } from "../utils.js";

export async function statusCommand(ctx: CommandContext<Context>): Promise<void> {
  await replyStatusDashboard(ctx);
}

export async function replyStatusDashboard(ctx: Context): Promise<void> {
  try {
    const students = await listStudents();
    // Compact lines + chunking stay under Telegram's 4096-char limit.
    await replyChunked(ctx, formatStatusDashboard(students), {
      link_preview_options: { is_disabled: true },
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error("[status] Dashboard failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`❌ Could not load student statuses.\n${detail}`);
  }
}
