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

async function safeEditTaskMessage(ctx: Context, studentId: string, text: string): Promise<void> {
  try {
    await ctx.editMessageText(text, {
      reply_markup: taskStatusKeyboard(studentId),
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Telegram throws if text + keyboard are unchanged.
    if (message.includes("message is not modified")) {
      return;
    }
    throw error;
  }
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
    await ctx.answerCallbackQuery({ text: message.slice(0, 180), show_alert: true });
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

  if (existing.taskStatus === nextStatus && !existing.finalized) {
    await ctx.answerCallbackQuery({ text: `Already ${nextStatus}` });
    return;
  }

  const student = await setTaskStatus(studentId, nextStatus);
  await safeEditTaskMessage(ctx, student.$id, buildTaskMessage(student));
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
    const yourId = ctx.from?.id ?? "?";
    await ctx.answerCallbackQuery({
      text:
        target === "ta"
          ? `Only the TA can approve TA. Your ID: ${yourId}`
          : `Only the Teacher can approve Teacher. Your ID: ${yourId}`,
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

  const already =
    role === "ta" ? existing.taApproved : existing.teacherApproved;

  if (already) {
    await ctx.answerCallbackQuery({
      text: "Already approved.",
      show_alert: true,
    });
    return;
  }

  const student = await setOwnApproval(studentId, role);
  await safeEditTaskMessage(ctx, student.$id, buildTaskMessage(student));
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

  if (existing.finalized) {
    await ctx.answerCallbackQuery({ text: "Already finalized.", show_alert: true });
    return;
  }

  const student = await finalizeStudent(studentId);
  await safeEditTaskMessage(ctx, student.$id, buildTaskMessage(student));
  await ctx.answerCallbackQuery({ text: "Task finalized ✅" });
}
