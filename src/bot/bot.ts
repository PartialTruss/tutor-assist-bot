import { Bot } from "grammy";
import { env } from "../config/env.js";
import { registerCommands } from "./commands/index.js";

export function createBot(): Bot {
  const bot = new Bot(env.telegramBotToken);

  registerCommands(bot);

  bot.catch((err) => {
    console.error("[bot] Unhandled error:", err.error);
  });

  return bot;
}
