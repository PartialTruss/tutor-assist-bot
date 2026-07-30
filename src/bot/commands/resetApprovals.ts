import type { CommandContext, Context } from "grammy";
import { findStudentByName, resetApprovals } from "../../db/students.js";
import { isStaff } from "../rbac.js";
import { formatStudentInfo } from "../status/keyboard.js";

/**
 * /resetapprovals Alice
 * Sets TA + Teacher back to N/A (false) and clears finalized.
 */
export async function resetApprovalsCommand(
  ctx: CommandContext<Context>,
): Promise<void> {
  if (!isStaff(ctx.from?.id)) {
    await ctx.reply("Only staff can reset approvals.");
    return;
  }

  const name = ctx.match?.trim();
  if (!name) {
    await ctx.reply("Usage: `/resetapprovals <student name>`", {
      parse_mode: "Markdown",
    });
    return;
  }

  try {
    const existing = await findStudentByName(name);
    if (!existing) {
      await ctx.reply(`No student named "${name}".`);
      return;
    }

    const student = await resetApprovals(existing.$id);
    await ctx.reply(
      `Approvals reset to N/A for ${student.name}.\n\n${formatStudentInfo(student)}`,
      { link_preview_options: { is_disabled: true } },
    );
  } catch (error) {
    console.error("[resetapprovals] Failed:", error);
    await ctx.reply("❌ Could not reset approvals. Check Appwrite boolean fields.");
  }
}
