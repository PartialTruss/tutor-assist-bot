import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isIsoDate } from "../time.js";

export interface HomeworkRecord {
  date: string;
  collected: boolean;
  updatedAt: string;
}

const MAX_DAYS = 30;
const STATE_FILE = path.resolve(process.cwd(), "data", "homework-state.json");

const records = new Map<string, HomeworkRecord>();
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = queue.then(task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function prune(): void {
  const extra = records.size - MAX_DAYS;
  if (extra <= 0) return;

  const oldest = [...records.keys()].sort().slice(0, extra);
  for (const date of oldest) records.delete(date);
}

async function flush(): Promise<void> {
  prune();

  const snapshot: Record<string, HomeworkRecord> = {};
  for (const [date, record] of records) snapshot[date] = record;

  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

function isRecord(value: unknown): value is { collected: unknown; updatedAt?: unknown } {
  return typeof value === "object" && value !== null;
}

/** Load the on-disk map. Missing file starts the bot with an empty map. */
export async function loadHomeworkState(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(STATE_FILE, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      console.log(`[state] No homework file yet. It will be created at ${STATE_FILE}`);
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
      `Homework state file is not valid JSON (${STATE_FILE}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Homework state file has an unexpected shape: ${STATE_FILE}`);
  }

  records.clear();
  for (const [date, value] of Object.entries(parsed)) {
    if (!isIsoDate(date) || !isRecord(value) || typeof value.collected !== "boolean") {
      continue;
    }
    records.set(date, {
      date,
      collected: value.collected,
      updatedAt:
        typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    });
  }

  prune();
  console.log(`[state] Loaded ${records.size} homework day(s) from ${STATE_FILE}`);
}

export function isCollected(date: string): boolean {
  return records.get(date)?.collected === true;
}

/**
 * Record whether homework for `date` was collected.
 * The map updates immediately; the JSON file is written afterwards.
 */
export function setCollected(date: string, collected: boolean): Promise<HomeworkRecord> {
  if (!isIsoDate(date)) {
    return Promise.reject(new Error(`Invalid homework date: ${date}`));
  }

  const record: HomeworkRecord = {
    date,
    collected,
    updatedAt: new Date().toISOString(),
  };
  records.set(date, record);
  return enqueue(() => flush()).then(() => record);
}
