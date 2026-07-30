import type { Api, Bot } from "grammy";
import { env } from "../config/env.js";
import { listStudents } from "../db/students.js";
import { formatRemainingTasksDigest } from "../bot/status/keyboard.js";

/** 21:00 — teacher: OneNote + remaining student tasks */
export function buildTeacherDigest(remainingText: string): string {
  return [
    `Reminder from ${env.senderName}:`,
    "",
    "1) Please check your tasks on OneNote.",
    "",
    "2) Student task status (remaining):",
    remainingText,
  ].join("\n");
}

export async function sendTeacherDigest(api: Api): Promise<void> {
  const students = await listStudents();
  const remainingText = formatRemainingTasksDigest(students);
  await api.sendMessage(env.teacherChatId, buildTeacherDigest(remainingText), {
    link_preview_options: { is_disabled: true },
  });
}

/** 14:00 — you: check students’ homework */
export function buildHomeworkCheckReminder(): string {
  return [
    `Hi ${env.senderName} 👋`,
    "",
    "Reminder: please check the students’ homework.",
    "Use /menu → List of all students, or /status.",
  ].join("\n");
}

export async function sendHomeworkCheckReminder(api: Api): Promise<void> {
  await api.sendMessage(env.myChatId, buildHomeworkCheckReminder());
}

/** @deprecated use sendTeacherDigest */
export async function sendTeacherReminder(bot: Bot): Promise<void> {
  await sendTeacherDigest(bot.api);
}
