import type { Context } from "grammy";
import {
  createStudent,
  findStudentByName,
  listStudents,
} from "../../db/students.js";
import { sendStudentReminder } from "../../cron/studentReminders.js";
import {
  clearPending,
  getDraft,
  getPending,
  setPending,
} from "../session.js";
import {
  escapeMarkdown,
  isValidMeetUrl,
} from "../utils.js";
import { MENU_CALLBACK, MENU_INTRO, mainMenuKeyboard } from "./keyboard.js";

export async function showMainMenu(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId !== undefined) {
    clearPending(chatId);
  }

  await ctx.reply(MENU_INTRO, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(),
  });
}

export function registerMenuHandlers(bot: {
  callbackQuery: (trigger: string, handler: (ctx: Context) => unknown) => void;
  on: (filter: "message:text", handler: (ctx: Context) => unknown) => void;
}): void {
  bot.callbackQuery(MENU_CALLBACK.addStudent, onAddStudent);
  bot.callbackQuery(MENU_CALLBACK.sendReminder, onSendReminder);
  bot.callbackQuery(MENU_CALLBACK.searchLink, onSearchLink);
  bot.callbackQuery(MENU_CALLBACK.savedLinks, onSavedLinks);
  bot.callbackQuery(MENU_CALLBACK.back, onBackToMenu);

  bot.on("message:text", onPendingText);
}

async function onAddStudent(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_add_name", {});
  await ctx.reply(
    "➕ *Add Student* — step 1/2\n\nSend the student's *name* (or `/cancel`).",
    { parse_mode: "Markdown" },
  );
}

async function onSendReminder(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_reminder_student");
  await ctx.reply(
    "Who should receive the reminder?\nSend the student's exact name (or `/cancel`).",
  );
}

async function onSearchLink(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_search_student");
  await ctx.reply(
    "Which student’s Meet link do you need?\nSend the student's exact name (or `/cancel`).",
  );
}

async function onSavedLinks(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery({ text: "Loading saved links…" });

  try {
    const students = await listStudents();
    const withLinks = students.filter((s) => s.meetLink?.trim());

    if (withLinks.length === 0) {
      await ctx.reply(
        "No saved Meet links yet. Use *Add Student* or `/addstudent`.",
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard(),
        },
      );
      return;
    }

    const lines = [
      `🔗 *Saved Meet links* (${withLinks.length})`,
      "",
      ...withLinks.map(
        (s) =>
          `• *${escapeMarkdown(s.name)}*\n  ${escapeMarkdown(s.meetLink!.trim())}`,
      ),
    ];

    await ctx.reply(lines.join("\n"), {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error("[menu] Saved links failed:", error);
    await ctx.reply("❌ Could not load saved links. Check Appwrite config.");
  }
}

async function onBackToMenu(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  await showMainMenu(ctx);
}

async function onPendingText(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text?.trim();
  if (chatId === undefined || !text) return;

  if (text.startsWith("/")) return;

  const pending = getPending(chatId);
  if (!pending) return;

  switch (pending) {
    case "awaiting_reminder_student":
      await handleReminderStudentName(ctx, chatId, text);
      break;
    case "awaiting_search_student":
      await handleSearchStudentName(ctx, chatId, text);
      break;
    case "awaiting_add_name":
      await handleAddName(ctx, chatId, text);
      break;
    case "awaiting_add_meet_link":
      await handleAddMeetLink(ctx, chatId, text);
      break;
  }
}

async function handleAddName(
  ctx: Context,
  chatId: number,
  name: string,
): Promise<void> {
  try {
    const existing = await findStudentByName(name);
    if (existing) {
      clearPending(chatId);
      await ctx.reply(
        `A student named *${escapeMarkdown(name)}* already exists.\nUse \`/meet\` to update their link, or pick a different name.`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() },
      );
      return;
    }
  } catch (error) {
    console.error("[menu] Add-student name check failed:", error);
    clearPending(chatId);
    await ctx.reply("❌ Could not reach Appwrite. Check configuration.", {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  setPending(chatId, "awaiting_add_meet_link", { name });
  await ctx.reply(
    [
      "➕ *Add Student* — step 2/2",
      "",
      `Name: *${escapeMarkdown(name)}*`,
      "",
      "Send their Google Meet URL.",
    ].join("\n"),
    { parse_mode: "Markdown" },
  );
}

async function handleAddMeetLink(
  ctx: Context,
  chatId: number,
  meetLink: string,
): Promise<void> {
  const draft = getDraft(chatId);
  if (!draft?.name) {
    clearPending(chatId);
    await ctx.reply("Session expired. Start again from the menu.", {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  if (!isValidMeetUrl(meetLink)) {
    await ctx.reply(
      "Invalid Google Meet URL. Example:\n`https://meet.google.com/abc-defg-hij`\n\nTry again or `/cancel`.",
      { parse_mode: "Markdown" },
    );
    return;
  }

  clearPending(chatId);

  try {
    const student = await createStudent({
      name: draft.name,
      meetLink: meetLink.trim(),
    });

    await ctx.reply(
      [
        "✅ Student added.",
        "",
        `*Name:* ${escapeMarkdown(student.name)}`,
        `*Meet:* ${escapeMarkdown(student.meetLink ?? meetLink.trim())}`,
      ].join("\n"),
      {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
        reply_markup: mainMenuKeyboard(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[menu] Add student failed:", error);
    await ctx.reply(`❌ Could not add student.\n${message}`, {
      reply_markup: mainMenuKeyboard(),
    });
  }
}

async function handleReminderStudentName(
  ctx: Context,
  chatId: number,
  name: string,
): Promise<void> {
  clearPending(chatId);

  try {
    const student = await findStudentByName(name);
    if (!student) {
      await ctx.reply(
        `No student named "${name}" found. Try again from the menu.`,
        { reply_markup: mainMenuKeyboard() },
      );
      return;
    }

    await sendStudentReminder(ctx.api, student);
    await ctx.reply(`✅ Reminder sent to *${escapeMarkdown(student.name)}*.`, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[menu] Manual reminder failed:", error);
    await ctx.reply(`❌ Failed to send reminder.\n${message}`, {
      reply_markup: mainMenuKeyboard(),
    });
  }
}

async function handleSearchStudentName(
  ctx: Context,
  chatId: number,
  name: string,
): Promise<void> {
  clearPending(chatId);

  try {
    const student = await findStudentByName(name);
    if (!student) {
      await ctx.reply(
        `No student named "${name}" found. Try again from the menu.`,
        { reply_markup: mainMenuKeyboard() },
      );
      return;
    }

    if (!student.meetLink?.trim()) {
      await ctx.reply(
        `*${escapeMarkdown(student.name)}* has no Meet link saved yet.\nUse \`/meet ${escapeMarkdown(student.name)} <url>\` to add one.`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() },
      );
      return;
    }

    await ctx.reply(
      [
        `🎥 Meet link for *${escapeMarkdown(student.name)}*`,
        "",
        escapeMarkdown(student.meetLink.trim()),
      ].join("\n"),
      {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
        reply_markup: mainMenuKeyboard(),
      },
    );
  } catch (error) {
    console.error("[menu] Search link failed:", error);
    await ctx.reply("❌ Could not search Appwrite. Check configuration.", {
      reply_markup: mainMenuKeyboard(),
    });
  }
}
