import cron from "node-cron";
import type { Bot } from "grammy";
import { env } from "../config/env.js";
import { listStudents } from "../db/students.js";
import { sendStudentReminder } from "./studentReminders.js";
import { sendTeacherReminder } from "./teacherReminder.js";

function assertValidCron(expression: string, label: string): void {
  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression for ${label}: "${expression}"`);
  }
}

export function startCronJobs(bot: Bot): void {
  const { studentReminder, teacherReminder, timezone } = env.cron;

  assertValidCron(studentReminder, "STUDENT_REMINDER_CRON");
  assertValidCron(teacherReminder, "TEACHER_REMINDER_CRON");

  cron.schedule(
    studentReminder,
    async () => {
      console.log("[cron] Running student homework reminders…");
      try {
        const students = await listStudents();
        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const student of students) {
          if (!student.telegramChatId) {
            skipped += 1;
            continue;
          }

          try {
            await sendStudentReminder(bot.api, student);
            sent += 1;
          } catch (error) {
            failed += 1;
            console.error(
              `[cron] Failed to remind student "${student.name}" (${student.$id}):`,
              error,
            );
          }
        }

        console.log(
          `[cron] Student reminders done. sent=${sent} failed=${failed} skipped=${skipped} total=${students.length}`,
        );
      } catch (error) {
        console.error("[cron] Student reminder job failed:", error);
      }
    },
    { timezone },
  );

  cron.schedule(
    teacherReminder,
    async () => {
      console.log("[cron] Sending teacher OneNote reminder…");
      try {
        await sendTeacherReminder(bot);
        console.log("[cron] Teacher reminder sent.");
      } catch (error) {
        console.error("[cron] Teacher reminder job failed:", error);
      }
    },
    { timezone },
  );

  console.log(
    `[cron] Scheduled student reminders: "${studentReminder}" (${timezone})`,
  );
  console.log(
    `[cron] Scheduled teacher reminder: "${teacherReminder}" (${timezone})`,
  );
}
