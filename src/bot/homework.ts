import { GrammyError, InlineKeyboard, type Bot } from "grammy";
import { homeworkFollowUpAck } from "../messages.js";
import { setCollected } from "../state/homework.js";
import { isIsoDate } from "../time.js";

export function homeworkKeyboard(date: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Yes", `hw:yes:${date}`)
    .text("❌ No", `hw:no:${date}`);
}

function isMessageNotModified(error: unknown): boolean {
  return (
    error instanceof GrammyError &&
    error.description.toLowerCase().includes("message is not modified")
  );
}

/** ✅ Yes marks the day collected. ❌ No stores the day as not collected. */
export function registerHomeworkActions(bot: Bot): void {
  bot.callbackQuery(/^hw:(yes|no):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const choice = ctx.match[1];
    const date = ctx.match[2];

    if ((choice !== "yes" && choice !== "no") || !date || !isIsoDate(date)) {
      await ctx.answerCallbackQuery({ text: "That button is no longer valid." });
      return;
    }

    const collected = choice === "yes";

    try {
      await setCollected(date, collected);
    } catch (error) {
      console.error("[homework] Failed to save the answer:", error);
      await ctx.answerCallbackQuery({
        text: "Could not save your answer. Try again.",
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery({
      text: collected ? "Marked as collected." : "Left as not collected.",
    });

    const text = homeworkFollowUpAck(date, collected);
    try {
      await ctx.editMessageText(text, {
        reply_markup: homeworkKeyboard(date),
      });
    } catch (error) {
      if (isMessageNotModified(error)) return;
      console.error("[homework] Failed to update the prompt:", error);
      await ctx.reply(text);
    }
  });
}
