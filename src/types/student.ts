/** Appwrite document fields for the students collection. */
export interface Student {
  $id: string;
  name: string;
  /** Telegram chat ID used to DM this student (optional until reminders are needed). */
  telegramChatId?: string;
  /** Optional Google Meet link for this student. */
  meetLink?: string;
  /** Optional homework note included in daily reminders. */
  homeworkNote?: string;
}

export type StudentCreateInput = Omit<Student, "$id">;
export type StudentUpdateInput = Partial<Omit<Student, "$id">>;
