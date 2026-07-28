import type { Bot } from "grammy";
import { env } from "../config/env.js";

export function buildTeacherReminder(): string {
  return `Reminder from ${env.senderName}: Please check your tasks on OneNote.`;
}

export async function sendTeacherReminder(bot: Bot): Promise<void> {
  await bot.api.sendMessage(env.teacherChatId, buildTeacherReminder());
}
