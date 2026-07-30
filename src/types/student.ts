/** Workflow status emojis stored on each student document. */
export const TASK_STATUS = {
  studentDone: "✅",
  taDone: "☑️",
  needsTa: "🕒",
  needsTeacher: "💎",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_VALUES: readonly TaskStatus[] = [
  TASK_STATUS.studentDone,
  TASK_STATUS.taDone,
  TASK_STATUS.needsTa,
  TASK_STATUS.needsTeacher,
];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUS_VALUES as readonly string[]).includes(value);
}

export function defaultTaskStatus(): TaskStatus {
  return TASK_STATUS.needsTa;
}

/** Optional tri-state approval: unset/false → N/A, true → Approved. */
export type ApprovalState = boolean | null;

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
  /** Current task workflow status emoji. */
  taskStatus: TaskStatus;
  /**
   * Teacher approval — only the Teacher may set this.
   * false/null = N/A, true = Approved.
   */
  teacherApproved: boolean;
  /**
   * TA approval — only the TA may set this.
   * false/null = N/A, true = Approved.
   */
  taApproved: boolean;
  /** Dual-approval finalize completed. */
  finalized: boolean;
}

export type StudentCreateInput = Omit<Student, "$id">;
export type StudentUpdateInput = Partial<Omit<Student, "$id">>;
