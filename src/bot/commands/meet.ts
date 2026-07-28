import type { CommandContext, Context } from "grammy";
import { saveMeetLink } from "../../db/students.js";
import { escapeMarkdown, isValidMeetUrl } from "../utils.js";

function parseMeetArgs(raw: string): { studentRef: string; meetLink: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Prefer splitting on the last whitespace so multi-word names work:
  // /meet Jane Doe https://meet.google.com/...
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return null;

  const studentRef = trimmed.slice(0, lastSpace).trim();
  const meetLink = trimmed.slice(lastSpace + 1).trim();

  if (!studentRef || !meetLink) return null;
  return { studentRef, meetLink };
}

export async function meetCommand(ctx: CommandContext<Context>): Promise<void> {
  const parsed = parseMeetArgs(ctx.match);

  if (!parsed) {
    await ctx.reply(
      [
        "Usage: `/meet <student> <google-meet-url>`",
        "",
        "Example: `/meet Alice https://meet.google.com/abc-defg-hij`",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  const { studentRef, meetLink } = parsed;

  if (!isValidMeetUrl(meetLink)) {
    await ctx.reply(
      "Invalid Google Meet URL. Expected something like:\n`https://meet.google.com/abc-defg-hij`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  try {
    const student = await saveMeetLink(studentRef, meetLink);

    await ctx.reply(
      [
        "✅ Meet link saved.",
        "",
        `*Student:* ${escapeMarkdown(student.name)}`,
        `*Link:* ${escapeMarkdown(meetLink)}`,
      ].join("\n"),
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[meet] Failed to save link:", error);
    await ctx.reply(`❌ Could not save Meet link.\n${message}`);
  }
}
