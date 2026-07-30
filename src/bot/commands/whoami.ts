import type { CommandContext, Context } from "grammy";
import { env } from "../../config/env.js";
import { getStaffRole } from "../rbac.js";

/** Shows your Telegram user ID and detected role — useful for fixing TA_CHAT_ID. */
export async function whoamiCommand(
  ctx: CommandContext<Context>,
): Promise<void> {
  const id = ctx.from?.id;
  const role = getStaffRole(id);

  await ctx.reply(
    [
      "🪪 Who am I",
      "",
      `Your Telegram user ID: ${id ?? "unknown"}`,
      `Detected role: ${role ?? "none (not staff)"}`,
      "",
      `Configured TA_CHAT_ID: ${env.taChatId}`,
      `Configured TEACHER_CHAT_ID: ${env.teacherChatId}`,
      `Configured MY_CHAT_ID: ${env.myChatId}`,
      "",
      role === "ta"
        ? "✅ You can press Approve TA."
        : "To approve as TA: open the bot from the TA account, and set TA_CHAT_ID on Render to that account’s user ID (must match exactly).",
    ].join("\n"),
  );
}
