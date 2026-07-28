import { env } from "./config/env.js";
import { createBot } from "./bot/bot.js";
import { startCronJobs } from "./cron/index.js";

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
    console.error("       HTTPS_PROXY=http://127.0.0.1:7890");
    console.error("     (and restart after installing proxy support if needed)");
    console.error("");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  await assertTelegramReachable(env.telegramBotToken);

  const bot = createBot();

  startCronJobs(bot);

  console.log("[boot] Starting Telegram bot (long polling)…");
  console.log(`[boot] Sender name: ${env.senderName}`);
  console.log(`[boot] Teacher chat ID: ${env.teacherChatId}`);

  await bot.start({
    onStart: (info) => {
      console.log(`[boot] Bot @${info.username} is online.`);
    },
  });
}

main().catch((error) => {
  console.error("[boot] Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
