import type { CommandContext, Context } from "grammy";
import { listStudents } from "../../db/students.js";
import { formatStatusDashboard } from "../status/keyboard.js";
import { mainMenuKeyboard } from "../menu/keyboard.js";

export async function statusCommand(ctx: CommandContext<Context>): Promise<void> {
  await replyStatusDashboard(ctx);
}

export async function replyStatusDashboard(ctx: Context): Promise<void> {
  try {
    const students = await listStudents();
    const text = formatStatusDashboard(students);

    // Dashboard lines include raw URLs; avoid Markdown parse errors on names/links.
    await ctx.reply(text, {
      link_preview_options: { is_disabled: true },
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error("[status] Dashboard failed:", error);
    await ctx.reply("❌ Could not load student statuses. Check Appwrite config.");
  }
}
