import { GrammyError, type Api } from "grammy";
import { env } from "./config/env.js";

type SendExtra = NonNullable<Parameters<Api["sendMessage"]>[2]>;

/** Deliver a message to the configured owner and nobody else. */
export async function sendToOwner(
  api: Api,
  text: string,
  extra?: SendExtra,
): Promise<void> {
  try {
    await api.sendMessage(env.myChatId, text, {
      link_preview_options: { is_disabled: true },
      ...extra,
    });
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      console.error(
        "[notify] Telegram refused the message. Open a private chat with the bot and send /start.",
      );
    }
    throw error;
  }
}
