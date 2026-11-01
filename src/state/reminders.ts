import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Reminder {
  id: string;
  text: string;
  dueAt: string;
  createdAt: string;
}

const MAX_REMINDERS = 50;
const STATE_FILE = path.resolve(process.cwd(), "data", "reminders.json");

const reminders: Reminder[] = [];
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = queue.then(task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function flush(): Promise<void> {
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(reminders, null, 2)}\n`, "utf8");
}

function isReminder(value: unknown): value is Reminder {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Reminder>;
  return (
    typeof record.id === "string" &&
    typeof record.text === "string" &&
    typeof record.dueAt === "string" &&
    Number.isFinite(Date.parse(record.dueAt)) &&
    typeof record.createdAt === "string"
  );
}

export async function loadReminders(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(STATE_FILE, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      console.log(`[reminder] No reminder file yet. It will be created at ${STATE_FILE}`);
      return;
    }
    throw error;
  }

  if (!raw.trim()) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      `Reminder file is not valid JSON (${STATE_FILE}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Reminder file has an unexpected shape: ${STATE_FILE}`);
  }

  reminders.length = 0;
  for (const entry of parsed) {
    if (isReminder(entry)) reminders.push(entry);
  }
  console.log(`[reminder] Loaded ${reminders.length} reminder(s) from ${STATE_FILE}`);
}

export function listReminders(): Reminder[] {
  return [...reminders].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function dueReminders(now: Date): Reminder[] {
  const cutoff = now.toISOString();
  return listReminders().filter((reminder) => reminder.dueAt <= cutoff);
}

export function addReminder(text: string, dueAt: Date): Promise<Reminder> {
  if (reminders.length >= MAX_REMINDERS) {
    return Promise.reject(new Error("Reminder limit reached"));
  }

  const reminder: Reminder = {
    id: randomBytes(4).toString("hex"),
    text,
    dueAt: dueAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
  reminders.push(reminder);
  return enqueue(() => flush()).then(() => reminder);
}

export function removeReminder(id: string): Promise<boolean> {
  const index = reminders.findIndex((reminder) => reminder.id === id);
  if (index === -1) return Promise.resolve(false);
  reminders.splice(index, 1);
  return enqueue(() => flush()).then(() => true);
}

export function reminderLimit(): number {
  return MAX_REMINDERS;
}
