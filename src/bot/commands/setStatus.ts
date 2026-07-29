import type { CommandContext, Context } from "grammy";
import { isStaff } from "../rbac.js";
import { replyStatusCardByName } from "../status/card.js";

/**
 * /setstatus Alice
 * Opens that student's task card with ✅ ☑️ 🕒 💎 Finalize buttons.
 */
export async function setStatusCommand(
  ctx: CommandContext<Context>,
): Promise<void> {
  const userId = ctx.from?.id;
  if (!isStaff(userId)) {
    await ctx.reply(
      "Only the Teacher or TA can update statuses.\n" +
        `Your Telegram user ID is: ${userId ?? "unknown"}\n` +
        "It must match TEACHER_CHAT_ID or TA_CHAT_ID in .env",
    );
    return;
  }

  const name = ctx.match?.trim();
  if (!name) {
    await ctx.reply(
      [
        "Usage: `/setstatus <student name>`",
        "",
        "Example: `/setstatus Alice`",
        "",
        "Or use *Update Status* in `/menu`.",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  try {
    await replyStatusCardByName(ctx, name);
  } catch (error) {
    console.error("[setstatus] Failed:", error);
    await ctx.reply("❌ Could not load student. Check Appwrite config.");
  }
}
