import type { CommandContext, Context } from "grammy";
import { createStudent, findStudentByName } from "../../db/students.js";
import { escapeMarkdown, isValidMeetUrl } from "../utils.js";

/**
 * Parse:
 *   /addstudent <name…> <meetUrl>
 * Name may contain spaces; Meet URL is the last token.
 */
export function parseAddStudentArgs(raw: string): {
  name: string;
  meetLink: string;
} | null {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  const meetLink = parts[parts.length - 1]!;
  const name = parts.slice(0, -1).join(" ").trim();

  if (!name || !meetLink) return null;
  return { name, meetLink };
}

export async function addStudentCommand(
  ctx: CommandContext<Context>,
): Promise<void> {
  const parsed = parseAddStudentArgs(ctx.match);

  if (!parsed) {
    await ctx.reply(
      [
        "Usage: `/addstudent <name> <meet-url>`",
        "",
        "Example:",
        "`/addstudent Alice https://meet.google.com/abc-defg-hij`",
        "`/addstudent Jane Doe https://meet.google.com/abc-defg-hij`",
        "",
        "Or use *Add Student* in `/menu` for a step-by-step flow.",
      ].join("\n"),
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } },
    );
    return;
  }

  const { name, meetLink } = parsed;

  if (!isValidMeetUrl(meetLink)) {
    await ctx.reply(
      "Invalid Google Meet URL. Expected something like:\n`https://meet.google.com/abc-defg-hij`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  try {
    const existing = await findStudentByName(name);
    if (existing) {
      await ctx.reply(
        `A student named *${escapeMarkdown(name)}* already exists.\nUse \`/meet ${escapeMarkdown(name)} <url>\` to update their link.`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const student = await createStudent({ name, meetLink });

    await ctx.reply(
      [
        "✅ Student added.",
        "",
        `*Name:* ${escapeMarkdown(student.name)}`,
        `*Meet:* ${escapeMarkdown(student.meetLink ?? meetLink)}`,
        `*Doc ID:* \`${escapeMarkdown(student.$id)}\``,
      ].join("\n"),
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[addstudent] Failed:", error);
    await ctx.reply(`❌ Could not add student.\n${message}`);
  }
}
