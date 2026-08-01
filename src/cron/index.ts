import cron from "node-cron";
import type { Bot } from "grammy";
import { env } from "../config/env.js";
import {
  sendHomeworkCheckReminder,
  sendTeacherDigest,
} from "./teacherReminder.js";

function assertValidCron(expression: string, label: string): void {
  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression for ${label}: "${expression}"`);
  }
}

export function startCronJobs(bot: Bot): void {
  const { homeworkCheck, teacherDigest, timezone } = env.cron;

  assertValidCron(homeworkCheck, "HOMEWORK_CHECK_CRON");
  assertValidCron(teacherDigest, "TEACHER_DIGEST_CRON");

  cron.schedule(
    homeworkCheck,
    async () => {
      console.log("[cron] Sending homework-check reminder (to you)…");
      try {
        await sendHomeworkCheckReminder(bot.api);
        console.log("[cron] Homework-check reminder sent.");
      } catch (error) {
        console.error("[cron] Homework-check reminder failed:", error);
      }
    },
    { timezone },
  );

  cron.schedule(
    teacherDigest,
    async () => {
      console.log("[cron] Sending teacher digest (OneNote)…");
      try {
        await sendTeacherDigest(bot.api);
        console.log("[cron] Teacher digest sent.");
      } catch (error) {
        console.error("[cron] Teacher digest failed:", error);
      }
    },
    { timezone },
  );

  console.log(
    `[cron] Homework check (you) at "${homeworkCheck}" (${timezone})`,
  );
  console.log(
    `[cron] Teacher digest at "${teacherDigest}" (${timezone})`,
  );
}
