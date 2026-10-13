import type { Context, Middleware } from "grammy";
import { env } from "../../config/env.js";

/** True only for a private chat with the configured owner. */
export function isOwnerUpdate(ctx: Context): boolean {
  const fromId = ctx.from?.id;
  const chat = ctx.chat;
  if (fromId === undefined || !chat || chat.type !== "private") return false;

  return String(fromId) === env.myChatId && String(chat.id) === env.myChatId;
}

/**
 * Drop every update that is not from the owner.
 * Callback queries are dismissed so the Telegram client does not spin forever.
 */
export const authorizeOwner: Middleware = async (ctx, next) => {
  if (isOwnerUpdate(ctx)) {
    await next();
    return;
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("[auth] Failed to dismiss a callback query:", error);
    }
  }

  if (ctx.from && String(ctx.from.id) !== env.myChatId) {
    console.warn(`[auth] Ignored an update from user ${ctx.from.id}`);
  }
};
