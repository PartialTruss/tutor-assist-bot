import type { Bot, Context } from "grammy";
import {
  finalizeStudent,
  findStudentById,
  setTaskStatus,
} from "../../db/students.js";
import { getStaffRole, isStaff } from "../rbac.js";
import {
  buildTaskMessage,
  parseStatusCallback,
  statusFromCode,
  taskStatusKeyboard,
} from "./keyboard.js";

export function registerStatusHandlers(bot: Bot): void {
  bot.callbackQuery(/^st:(ok|ta|wait|gem|fin):.+/, onStatusCallback);
}

async function onStatusCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const parsed = parseStatusCallback(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: "Unknown status action." });
    return;
  }

  const userId = ctx.from?.id;
  if (!isStaff(userId)) {
    await ctx.answerCallbackQuery({
      text: "You do not have permission to change statuses.",
      show_alert: true,
    });
    return;
  }

  const role = getStaffRole(userId)!;

  try {
    if (parsed.kind === "finalize") {
      await handleFinalize(ctx, parsed.studentId);
      return;
    }

    await handleStatusChange(ctx, parsed.studentId, parsed.code!, role);
  } catch (error) {
    console.error("[status] Callback failed:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    await ctx.answerCallbackQuery({ text: message, show_alert: true });
  }
}

async function handleStatusChange(
  ctx: Context,
  studentId: string,
  code: "ok" | "ta" | "wait" | "gem",
  role: "teacher" | "ta",
): Promise<void> {
  const nextStatus = statusFromCode(code);
  if (!nextStatus) {
    await ctx.answerCallbackQuery({ text: "Invalid status." });
    return;
  }

  const existing = await findStudentById(studentId);
  if (!existing) {
    await ctx.answerCallbackQuery({
      text: "Student not found in Appwrite.",
      show_alert: true,
    });
    return;
  }

  const approvals =
    role === "teacher"
      ? { teacherApproved: true, taApproved: existing.taApproved }
      : { teacherApproved: existing.teacherApproved, taApproved: true };

  const student = await setTaskStatus(studentId, nextStatus, approvals);

  await ctx.editMessageText(buildTaskMessage(student), {
    reply_markup: taskStatusKeyboard(student.$id),
    link_preview_options: { is_disabled: true },
  });

  await ctx.answerCallbackQuery({ text: `Status → ${nextStatus}` });
}

async function handleFinalize(ctx: Context, studentId: string): Promise<void> {
  const existing = await findStudentById(studentId);
  if (!existing) {
    await ctx.answerCallbackQuery({
      text: "Student not found in Appwrite.",
      show_alert: true,
    });
    return;
  }

  if (!existing.teacherApproved || !existing.taApproved) {
    await ctx.answerCallbackQuery({
      text: "Finalize requires both Teacher and TA approval first.",
      show_alert: true,
    });
    return;
  }

  const student = await finalizeStudent(studentId);

  await ctx.editMessageText(buildTaskMessage(student), {
    reply_markup: taskStatusKeyboard(student.$id),
    link_preview_options: { is_disabled: true },
  });

  await ctx.answerCallbackQuery({ text: "Task finalized ✅" });
}
