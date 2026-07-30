import { InlineKeyboard } from "grammy";
import type { Student } from "../../types/student.js";
import { TASK_STATUS } from "../../types/student.js";

/** Callback prefixes — keep under Telegram's 64-byte limit. */
export const STATUS_CALLBACK = {
  studentDone: "st:ok",
  taDone: "st:ta",
  needsTa: "st:wait",
  needsTeacher: "st:gem",
  finalize: "st:fin",
} as const;

const CODE_TO_STATUS = {
  ok: TASK_STATUS.studentDone,
  ta: TASK_STATUS.taDone,
  wait: TASK_STATUS.needsTa,
  gem: TASK_STATUS.needsTeacher,
} as const;

export type StatusCode = keyof typeof CODE_TO_STATUS;

export function statusFromCode(code: string): (typeof CODE_TO_STATUS)[StatusCode] | null {
  if (code in CODE_TO_STATUS) {
    return CODE_TO_STATUS[code as StatusCode];
  }
  return null;
}

/** `st:ok:<studentId>` / `st:fin:<studentId>` */
export function parseStatusCallback(data: string): {
  kind: "status" | "finalize";
  code?: StatusCode;
  studentId: string;
} | null {
  const parts = data.split(":");
  if (parts[0] !== "st" || parts.length < 3) return null;

  const action = parts[1];
  const studentId = parts.slice(2).join(":");
  if (!studentId) return null;

  if (action === "fin") {
    return { kind: "finalize", studentId };
  }

  if (action === "ok" || action === "ta" || action === "wait" || action === "gem") {
    return { kind: "status", code: action, studentId };
  }

  return null;
}

export function taskStatusKeyboard(studentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(TASK_STATUS.studentDone, `${STATUS_CALLBACK.studentDone}:${studentId}`)
    .text(TASK_STATUS.taDone, `${STATUS_CALLBACK.taDone}:${studentId}`)
    .row()
    .text(TASK_STATUS.needsTa, `${STATUS_CALLBACK.needsTa}:${studentId}`)
    .text(TASK_STATUS.needsTeacher, `${STATUS_CALLBACK.needsTeacher}:${studentId}`)
    .row()
    .text("Finalize", `${STATUS_CALLBACK.finalize}:${studentId}`);
}

function approvalLabel(approved: boolean): string {
  return approved ? "✅ Approved" : "⏳ Pending";
}

function statusLabel(student: Student): string {
  if (student.finalized) {
    return `${student.taskStatus} (Finalized)`;
  }
  return student.taskStatus;
}

/** Canonical student card shown everywhere in the bot. */
export function formatStudentInfo(student: Student): string {
  return [
    "ℹ️ Information:",
    "\n",
    `👤 Student's Fullname: ${student.name}`,
    "\n",
    `🎥 Google meet link: ${student.meetLink?.trim() || "—"}`,
    "\n",
    `📌 Current status: ${statusLabel(student)}`,
    "\n",
    `🧑‍🏫 TA: ${approvalLabel(student.taApproved)}`,
    "\n",
    `👨‍🏫 Teacher: ${approvalLabel(student.teacherApproved)}`,
  ].join("\n");
}

export function buildTaskMessage(student: Student): string {
  const lines = [formatStudentInfo(student)];

  if (student.homeworkNote?.trim()) {
    lines.push(`📝 Note: ${student.homeworkNote.trim()}`);
  }

  return lines.join("\n");
}

export function formatStudentStatusLine(student: Student): string {
  return formatStudentInfo(student);
}

export function formatStudentDetails(student: Student): string {
  return formatStudentInfo(student);
}

export function formatStatusDashboard(students: Student[]): string {
  if (students.length === 0) {
    return "No students found.";
  }

  return [
    `📋 Students (${students.length})`,
    "",
    ...students.map((s, i) => {
      const block = formatStudentInfo(s);
      return i < students.length - 1 ? `${block}\n────────────` : block;
    }),
  ].join("\n\n");
}

export function formatRemainingTasksDigest(students: Student[]): string {
  const open = students.filter((s) => !s.finalized);
  if (open.length === 0) {
    return "All student tasks are finalized. ✅";
  }

  return [
    `📌 Remaining tasks (${open.length}):`,
    "",
    ...open.map((s, i) => {
      const block = formatStudentInfo(s);
      return i < open.length - 1 ? `${block}\n────────────` : block;
    }),
  ].join("\n\n");
}
