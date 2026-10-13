import type { Bot } from "grammy";
import cron, { type ScheduledTask } from "node-cron";
import { homeworkKeyboard } from "../bot/homework.js";
import { env } from "../config/env.js";
import { messages } from "../messages.js";
import { sendToOwner } from "../notify.js";
import { isCollected, setCollected } from "../state/homework.js";
import { calendarDate } from "../time.js";

interface CronJob {
  label: string;
  expression: string;
  task: () => Promise<void>;
}

function assertValidCron(expression: string, label: string): void {
  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression for ${label}: "${expression}"`);
  }
}

async function runJob(label: string, task: () => Promise<void>): Promise<void> {
  console.log(`[cron] ${label}`);
  try {
    await task();
  } catch (error) {
    console.error(`[cron] ${label} failed:`, error);
  }
}

export function startCronJobs(bot: Bot): ScheduledTask[] {
  const { timezone } = env.cron;
  const today = () => calendarDate(timezone);

  const jobs: CronJob[] = [
    {
      label: "Homework collect",
      expression: env.cron.homeworkCollect,
      task: async () => {
        const date = today();
        try {
          await setCollected(date, false);
        } catch (error) {
          console.error(`[cron] Could not open homework for ${date}:`, error);
        }
        await sendToOwner(bot.api, messages.homeworkCollect);
        console.log(`[cron] Homework collection opened for ${date}.`);
      },
    },
    {
      label: "Homework follow-up",
      expression: env.cron.homeworkFollowUp,
      task: async () => {
        const date = today();
        await sendToOwner(bot.api, messages.homeworkFollowUp, {
          reply_markup: homeworkKeyboard(date),
        });
        console.log(`[cron] Homework follow-up sent for ${date}.`);
      },
    },
    {
      label: "Homework urgent",
      expression: env.cron.homeworkUrgent,
      task: async () => {
        const date = today();
        if (isCollected(date)) {
          console.log(`[cron] Homework for ${date} is collected. Urgent reminder skipped.`);
          return;
        }
        await sendToOwner(bot.api, messages.homeworkUrgent);
        console.log(`[cron] Urgent homework reminder sent for ${date}.`);
      },
    },
    {
      label: "Weekly availability",
      expression: env.cron.availability,
      task: async () => {
        await sendToOwner(bot.api, messages.availability);
      },
    },
    {
      label: "Unbooked classes",
      expression: env.cron.booking,
      task: async () => {
        await sendToOwner(bot.api, messages.booking);
      },
    },
    {
      label: "Platform confirmation",
      expression: env.cron.platformConfirm,
      task: async () => {
        await sendToOwner(bot.api, messages.platformConfirm);
      },
    },
  ];

  for (const job of jobs) assertValidCron(job.expression, job.label);

  const tasks = jobs.map((job) => {
    const task = cron.schedule(
      job.expression,
      () => void runJob(job.label, job.task),
      { timezone },
    );
    console.log(`[cron] ${job.label}: "${job.expression}" (${timezone})`);
    return task;
  });

  return tasks;
}
