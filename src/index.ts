import express from "express";
import { createBot } from "./bot/bot.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";

// --- 1. Telegram Pre-flight Check ---
async function assertTelegramReachable(token: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
    });
    const body = (await response.json()) as {
      ok?: boolean;
      description?: string;
      result?: { username?: string };
    };

    if (!response.ok || !body.ok) {
      throw new Error(
        body.description ?? `Telegram getMe failed with HTTP ${response.status}`,
      );
    }

    console.log(
      `[boot] Telegram API reachable (bot @${body.result?.username ?? "unknown"}).`,
    );
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("abort"));

    console.error("");
    console.error("[boot] Cannot reach api.telegram.org.");
    if (aborted) {
      console.error(
        "[boot] Connection timed out — Telegram is likely blocked on this network.",
      );
    } else {
      console.error(
        "[boot]",
        error instanceof Error ? error.message : String(error),
      );
    }
    console.error("");
    console.error("Fix options:");
    console.error("  1. Connect a VPN, then restart: npm run dev");
    console.error("  2. Or set an HTTPS proxy in .env, e.g.");
    console.error("      HTTPS_PROXY=http://127.0.0.1:7890");
    console.error("    (and restart after installing proxy support if needed)");
    console.error("");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// --- 2. Appwrite Pre-flight Check ---
async function assertAppwriteReachable(endpoint: string): Promise<void> {
  const controller = new AbortController();
  // Short timeout to catch bad URLs or offline servers quickly
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    // Pinging the Appwrite health/version endpoint to ensure the server is online
    const response = await fetch(`${endpoint}/health/version`, {
      signal: controller.signal,
    });

    // Even if it returns an auth error, a response means the server is up
    if (response) {
      console.log(`[boot] Appwrite server reachable at ${endpoint}.`);
    }
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("abort"));

    console.error("");
    console.error("[boot] Cannot reach Appwrite server.");
    if (aborted) {
      console.error("[boot] Connection timed out — check your Appwrite endpoint URL in .env.");
    } else {
      console.error("[boot]", error instanceof Error ? error.message : String(error));
    }
    console.error("");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// --- 3. Main Bootloader ---
async function main(): Promise<void> {
  console.log("[boot] Running pre-flight checks...");

  // Note: Ensure your env.ts exports appwriteEndpoint
  await assertTelegramReachable(env.telegramBotToken);
  await assertAppwriteReachable(env.appwrite.endpoint);

  const bot = createBot();
  startCronJobs(bot);

  // --- 4. Render Dummy Web Server ---
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get("/", (req, res) => {
    res.send("Telegram Bot is running and healthy!");
  });

  app.listen(PORT, () => {
    console.log(`[boot] Dummy web server running on port ${PORT} to satisfy Render.`);
  });

  // --- 5. Start the Bot ---
  console.log("[boot] Starting Telegram bot (long polling)…");
  console.log(`[boot] Sender name: ${env.senderName}`);
  console.log(`[boot] Teacher chat ID: ${env.teacherChatId}`);

  await bot.start({
    onStart: (info) => {
      console.log(`[boot] Bot @${info.username} is online and ready.`);
    },
  });
}

main().catch((error) => {
  console.error("[boot] Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});