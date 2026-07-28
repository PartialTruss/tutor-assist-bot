import type { Api } from "grammy";
import type { Student } from "../types/student.js";

export function buildHomeworkReminder(student: Student): string {
  const lines = [
    `Hi ${student.name}! 📚`,
    "",
    "This is your daily homework reminder. Please complete today's tasks.",
  ];

  if (student.homeworkNote?.trim()) {
    lines.push("", `📝 Note: ${student.homeworkNote.trim()}`);
  }

  if (student.meetLink?.trim()) {
    lines.push("", `🎥 Class Meet link: ${student.meetLink.trim()}`);
  }

  return lines.join("\n");
}

export async function sendStudentReminder(
  api: Api,
  student: Student,
): Promise<void> {
  if (!student.telegramChatId) {
    throw new Error(`Student "${student.name}" has no telegramChatId`);
  }

  await api.sendMessage(
    student.telegramChatId,
    buildHomeworkReminder(student),
    { link_preview_options: { is_disabled: true } },
  );
}
