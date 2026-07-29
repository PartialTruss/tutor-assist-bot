import type { Api } from "grammy";
import { env } from "../config/env.js";
import type { Student } from "../types/student.js";
import {
  buildTaskMessage,
  taskStatusKeyboard,
} from "../bot/status/keyboard.js";

export function buildHomeworkReminder(student: Student): string {
  return [
    `Hi ${student.name}! 📚`,
    "",
    "This is your daily homework reminder. Please complete today's tasks.",
    "",
    buildTaskMessage(student),
  ].join("\n");
}

export async function sendStudentReminder(
  api: Api,
  student: Student,
): Promise<void> {
  if (!student.telegramChatId) {
    throw new Error(`Student "${student.name}" has no telegramChatId`);
  }

  const text = buildHomeworkReminder(student);
  const markup = taskStatusKeyboard(student.$id);

  await api.sendMessage(student.telegramChatId, text, {
    reply_markup: markup,
    link_preview_options: { is_disabled: true },
  });

  // Staff copies so Teacher/TA can use the status buttons
  await notifyStaffTaskCard(api, student);
}

export async function notifyStaffTaskCard(
  api: Api,
  student: Student,
): Promise<void> {
  const text = buildTaskMessage(student);
  const markup = taskStatusKeyboard(student.$id);
  const targets = new Set([env.teacherChatId, env.taChatId]);

  for (const chatId of targets) {
    try {
      await api.sendMessage(chatId, text, {
        reply_markup: markup,
        link_preview_options: { is_disabled: true },
      });
    } catch (error) {
      console.error(`[reminder] Failed to notify staff chat ${chatId}:`, error);
    }
  }
}
