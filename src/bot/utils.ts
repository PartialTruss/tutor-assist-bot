import type { Context } from "grammy";

export const MEET_URL_PATTERN =
  /^https:\/\/meet\.google\.com\/[a-z0-9-]+(?:\?[^\s]*)?$/i;

/** Telegram Bot API hard limit for message text. */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export function isValidMeetUrl(url: string): boolean {
  return MEET_URL_PATTERN.test(url.trim());
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

/** Split text into chunks that fit Telegram's message length limit. */
export function chunkTelegramText(
  text: string,
  maxLen = TELEGRAM_MAX_MESSAGE_LENGTH,
): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf("\n", maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

/** Reply with one or more messages if the text is too long for Telegram. */
export async function replyChunked(
  ctx: Context,
  text: string,
  extra?: Parameters<Context["reply"]>[1],
): Promise<void> {
  const chunks = chunkTelegramText(text);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await ctx.reply(chunks[i]!, isLast ? extra : { ...extra, reply_markup: undefined });
  }
}
