import type { Bot, Context } from "grammy";
import {
  finalizeStudent,
  findStudentById,
  setOwnApproval,
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
  bot.callbackQuery(/^st:(ok|ta|wait|gem|apta|apte|fin):.+/, onStatusCallback);
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

    if (parsed.kind === "approve_ta") {
      await handleApprove(ctx, parsed.studentId, "ta", role);
      return;
    }

    if (parsed.kind === "approve_teacher") {
      await handleApprove(ctx, parsed.studentId, "teacher", role);
      return;
    }

    await handleStatusChange(ctx, parsed.studentId, parsed.code!);
  } catch (error) {
    console.error("[status] Callback failed:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    await ctx.answerCallbackQuery({ text: message, show_alert: true });
  }
}

/** Status emojis update Current status only — not TA/Teacher approvals. */
async function handleStatusChange(
  ctx: Context,
  studentId: string,
  code: "ok" | "ta" | "wait" | "gem",
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

  const student = await setTaskStatus(studentId, nextStatus);

  await ctx.editMessageText(buildTaskMessage(student), {
    reply_markup: taskStatusKeyboard(student.$id),
    link_preview_options: { is_disabled: true },
  });

  await ctx.answerCallbackQuery({ text: `Status → ${nextStatus}` });
}

/** Each role may only approve their own field. */
async function handleApprove(
  ctx: Context,
  studentId: string,
  target: "teacher" | "ta",
  role: "teacher" | "ta",
): Promise<void> {
  if (role !== target) {
    await ctx.answerCallbackQuery({
      text:
        target === "ta"
          ? "Only the TA can approve the TA field."
          : "Only the Teacher can approve the Teacher field.",
      show_alert: true,
    });
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

  const student = await setOwnApproval(studentId, role);

  await ctx.editMessageText(buildTaskMessage(student), {
    reply_markup: taskStatusKeyboard(student.$id),
    link_preview_options: { is_disabled: true },
  });

  await ctx.answerCallbackQuery({
    text: role === "ta" ? "TA approved ✅" : "Teacher approved ✅",
  });
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
      text: "Finalize needs both TA and Teacher approval first.",
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
