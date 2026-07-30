import express from "express";
import { createBot } from "./bot/bot.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";

function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause =
    "cause" in error && error.cause instanceof Error
      ? ` (${error.cause.message})`
      : "";
  return `${error.message}${cause}`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Soft check — never crash the process. */
async function pingAppwrite(endpoint: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/health`, {
      signal: controller.signal,
    });
    console.log(
      `[boot] Appwrite ping HTTP ${response.status} at ${endpoint}`,
    );
  } catch (error) {
    console.warn(
      `[boot] Appwrite ping skipped/failed: ${formatFetchError(error)}`,
    );
    console.warn("[boot] Continuing anyway — Appwrite is checked on first DB call.");
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyTelegramBot(
  getMe: () => Promise<{ username?: string }>,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const me = await getMe();
      console.log(
        `[boot] Telegram OK (bot @${me.username ?? "unknown"}).`,
      );
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[boot] Telegram getMe attempt ${attempt}/3 failed: ${formatFetchError(error)}`,
      );
      if (attempt < 3) await sleep(2_000 * attempt);
    }
  }

  throw new Error(
    `Cannot reach Telegram API after 3 tries: ${formatFetchError(lastError)}`,
  );
}

async function main(): Promise<void> {
  // Bind PORT first so Render health checks succeed during bot startup.
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get("/", (_req, res) => {
    res.status(200).send("Tutor Assist bot is running.");
  });

  await new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(`[boot] HTTP health server on port ${PORT}`);
      resolve();
    });
  });

  console.log("[boot] Starting services…");
  await pingAppwrite(env.appwrite.endpoint);

  const bot = createBot();

  await verifyTelegramBot(() => bot.api.getMe());

  await bot.api.deleteWebhook({ drop_pending_updates: false });
  console.log("[boot] Webhook cleared (long polling).");

  startCronJobs(bot);

  console.log(`[boot] Sender: ${env.senderName}`);
  console.log(`[boot] Teacher: ${env.teacherChatId} · Me: ${env.myChatId} · TA: ${env.taChatId}`);

  try {
    await bot.start({
      onStart: (info) => {
        console.log(`[boot] Bot @${info.username} is online.`);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("409") || message.toLowerCase().includes("conflict")) {
      console.error("[boot] Telegram 409: another getUpdates is running.");
      console.error("[boot] Stop local npm run dev and keep Render instances = 1.");
    }
    throw error;
  }
}

main().catch((error) => {
  console.error("[boot] Fatal error:", formatFetchError(error));
  process.exit(1);
});
