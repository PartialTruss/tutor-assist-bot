import type { Context } from "grammy";
import type { Student } from "../../types/student.js";
import { findStudentByName } from "../../db/students.js";
import { buildTaskMessage, taskStatusKeyboard } from "./keyboard.js";

/** Send a task card with status buttons for one student. */
export async function replyStudentStatusCard(
  ctx: Context,
  student: Student,
): Promise<void> {
  await ctx.reply(buildTaskMessage(student), {
    reply_markup: taskStatusKeyboard(student.$id),
    link_preview_options: { is_disabled: true },
  });
}

/** Look up by exact name and send their status card. */
export async function replyStatusCardByName(
  ctx: Context,
  name: string,
): Promise<boolean> {
  const student = await findStudentByName(name.trim());
  if (!student) {
    await ctx.reply(
      `No student named "${name.trim()}" found.\nUse /status to see exact names.`,
    );
    return false;
  }

  await replyStudentStatusCard(ctx, student);
  return true;
}
