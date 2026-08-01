import type { Api, Bot } from "grammy";
import { env } from "../config/env.js";

/** 21:00 — teacher: OneNote reminder */
export function buildTeacherDigest(): string {
  return [
    `Reminder from ${env.senderName}:`,
    "",
    "Please check your tasks on OneNote.",
  ].join("\n");
}

export async function sendTeacherDigest(api: Api): Promise<void> {
  await api.sendMessage(env.teacherChatId, buildTeacherDigest(), {
    link_preview_options: { is_disabled: true },
  });
}

/** Send a free-text message to the teacher via the bot */
export function buildTeacherMessage(body: string): string {
  return [`Message from ${env.senderName}:`, "", body].join("\n");
}

export async function sendMessageToTeacher(
  api: Api,
  body: string,
): Promise<void> {
  await api.sendMessage(env.teacherChatId, buildTeacherMessage(body), {
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
