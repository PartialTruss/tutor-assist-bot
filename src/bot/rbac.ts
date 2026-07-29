import { env } from "../config/env.js";

export type StaffRole = "teacher" | "ta";

/** True if the Telegram user ID matches TEACHER_CHAT_ID or TA_CHAT_ID. */
export function isStaff(userId: number | undefined): boolean {
  return getStaffRole(userId) !== null;
}

export function getStaffRole(userId: number | undefined): StaffRole | null {
  if (userId === undefined) return null;
  const id = String(userId);
  if (id === env.teacherChatId) return "teacher";
  if (id === env.taChatId) return "ta";
  return null;
}
