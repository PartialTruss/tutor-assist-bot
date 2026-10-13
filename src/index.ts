import express from "express";
import { createBot, ownerCommands } from "./bot/bot.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";
import { loadHomeworkState } from "./state/homework.js";

function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause =
    "cause" in error && error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `${error.message}${cause}`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyTelegramBot(
  getMe: () => Promise<{ username?: string }>,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const me = await getMe();
      console.log(`[boot] Telegram OK (bot @${me.username ?? "unknown"}).`);
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
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.get("/", (_req, res) => {
    res.status(200).send("Personal assistant bot is running.");
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(port, () => {
      console.log(`[boot] HTTP health server on port ${port}`);
      resolve(listener);
    });
    listener.on("error", reject);
  });

  await loadHomeworkState();

  const bot = createBot();

  await verifyTelegramBot(async () => bot.api.getMe());
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  console.log("[boot] Webhook cleared (long polling).");

  try {
    await bot.api.setMyCommands(ownerCommands, {
      scope: { type: "chat", chat_id: Number(env.myChatId) },
    });
  } catch (error) {
    console.warn(
      `[boot] Could not set the command menu for your chat: ${formatFetchError(error)}`,
    );
    await bot.api.setMyCommands(ownerCommands);
  }

  const tasks = startCronJobs(bot);
  console.log(`[boot] Owner chat: ${env.myChatId}`);

  let stopping = false;
  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[boot] ${signal} received, stopping…`);
    for (const task of tasks) task.stop();
    server.close();
    bot.stop();
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  try {
    await bot.start({
      onStart: (info) => {
        console.log(`[boot] Bot @${info.username} is online.`);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("409") || message.toLowerCase().includes("conflict")) {
      console.error("[boot] Telegram 409: another getUpdates poll is already running.");
      console.error("[boot] Stop the other process before starting this one.");
    }
    throw error;
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled rejection:", reason);
});

main().catch((error) => {
  console.error("[boot] Fatal error:", formatFetchError(error));
  process.exit(1);
});
