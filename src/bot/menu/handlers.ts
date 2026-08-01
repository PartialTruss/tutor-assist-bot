import type { Context } from "grammy";
import {
  createStudent,
  deleteStudent,
  findStudentById,
  findStudentByName,
  listStudents,
  saveMeetLink,
  searchStudents,
} from "../../db/students.js";
import { sendMessageToTeacher } from "../../cron/teacherReminder.js";
import {
  clearPending,
  getDraft,
  getPending,
  setPending,
} from "../session.js";
import { escapeMarkdown, isValidMeetUrl, replyChunked } from "../utils.js";
import { replyStudentStatusCard } from "../status/card.js";
import {
  formatStudentDetails,
  formatStatusDashboard,
} from "../status/keyboard.js";
import { isStaff } from "../rbac.js";
import {
  MENU_CALLBACK,
  MENU_INTRO,
  deleteConfirmKeyboard,
  mainMenuKeyboard,
  updateStudentActionsKeyboard,
} from "./keyboard.js";

export async function showMainMenu(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId !== undefined) clearPending(chatId);

  await ctx.reply(MENU_INTRO, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(),
  });
}

export function registerMenuHandlers(bot: {
  callbackQuery: (
    trigger: string | RegExp,
    handler: (ctx: Context) => unknown,
  ) => void;
  on: (filter: "message:text", handler: (ctx: Context) => unknown) => void;
}): void {
  bot.callbackQuery(MENU_CALLBACK.addStudent, onAddStudent);
  bot.callbackQuery(MENU_CALLBACK.listStudents, onListStudents);
  bot.callbackQuery(MENU_CALLBACK.searchStudents, onSearchStudents);
  bot.callbackQuery(MENU_CALLBACK.updateStudent, onUpdateStudent);
  bot.callbackQuery(MENU_CALLBACK.deleteStudent, onDeleteStudent);
  bot.callbackQuery(MENU_CALLBACK.messageTeacher, onMessageTeacher);
  bot.callbackQuery(MENU_CALLBACK.back, onBackToMenu);
  bot.callbackQuery(MENU_CALLBACK.deleteCancel, onDeleteCancel);
  bot.callbackQuery(/^upd:status:.+/, onUpdateStatusChoice);
  bot.callbackQuery(/^upd:meet:.+/, onUpdateMeetChoice);
  bot.callbackQuery(/^del:yes:.+/, onDeleteConfirm);

  bot.on("message:text", onPendingText);
}

async function onAddStudent(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_add_name", {});
  await ctx.reply("➕ Send the student's *name* (or `/cancel`).", {
    parse_mode: "Markdown",
  });
}

async function onListStudents(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery({ text: "Loading…" });
  try {
    const students = await listStudents();
    await replyChunked(ctx, formatStatusDashboard(students), {
      link_preview_options: { is_disabled: true },
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error("[menu] List failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`❌ Could not load students.\n${detail}`);
  }
}

async function onSearchStudents(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_search_query");
  await ctx.reply("🔍 Send part of a student name to search (or `/cancel`).");
}

async function onUpdateStudent(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_update_student");
  await ctx.reply(
    "✏️ Which student do you want to update?\nSend their exact name (or `/cancel`).",
  );
}

async function onDeleteStudent(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_delete_student");
  await ctx.reply(
    "🗑 Which student should be deleted?\nSend their exact name (or `/cancel`).",
  );
}

async function onMessageTeacher(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!isStaff(ctx.from?.id)) {
    await ctx.reply(
      `Only staff can message the teacher.\nYour ID: ${ctx.from?.id ?? "?"}`,
    );
    return;
  }

  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  setPending(chatId, "awaiting_teacher_message");
  await ctx.reply(
    "📨 Send the message for the teacher (or `/cancel`).\nIt will be delivered through the bot.",
    { parse_mode: "Markdown" },
  );
}

async function onBackToMenu(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  await showMainMenu(ctx);
}

async function onDeleteCancel(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery({ text: "Cancelled" });
  await showMainMenu(ctx);
}

async function onUpdateStatusChoice(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data ?? "";
  const studentId = data.slice("upd:status:".length);
  await ctx.answerCallbackQuery();

  if (!isStaff(ctx.from?.id)) {
    await ctx.reply(
      `Only staff can update status.\nYour ID: ${ctx.from?.id ?? "?"}`,
    );
    return;
  }

  const student = await findStudentById(studentId);
  if (!student) {
    await ctx.reply("Student not found.");
    return;
  }

  await replyStudentStatusCard(ctx, student);
  await ctx.reply("Tap a status button on the card above.", {
    reply_markup: mainMenuKeyboard(),
  });
}

async function onUpdateMeetChoice(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data ?? "";
  const studentId = data.slice("upd:meet:".length);
  await ctx.answerCallbackQuery();

  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const student = await findStudentById(studentId);
  if (!student) {
    await ctx.reply("Student not found.");
    return;
  }

  setPending(chatId, "awaiting_update_meet", {
    studentId: student.$id,
    name: student.name,
  });
  await ctx.reply(
    `Send the new Google Meet URL for *${escapeMarkdown(student.name)}* (or /cancel).`,
    { parse_mode: "Markdown" },
  );
}

async function onDeleteConfirm(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data ?? "";
  const studentId = data.slice("del:yes:".length);

  try {
    const student = await findStudentById(studentId);
    if (!student) {
      await ctx.answerCallbackQuery({
        text: "Student already gone.",
        show_alert: true,
      });
      return;
    }

    await deleteStudent(studentId);
    await ctx.answerCallbackQuery({ text: "Deleted" });
    await ctx.reply(`🗑 Deleted *${escapeMarkdown(student.name)}*.`, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error("[menu] Delete failed:", error);
    await ctx.answerCallbackQuery({ text: "Delete failed", show_alert: true });
  }
}

async function onPendingText(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text?.trim();
  if (chatId === undefined || !text || text.startsWith("/")) return;

  const pending = getPending(chatId);
  if (!pending) return;

  switch (pending) {
    case "awaiting_add_name":
      await handleAddName(ctx, chatId, text);
      break;
    case "awaiting_add_meet_link":
      await handleAddMeetLink(ctx, chatId, text);
      break;
    case "awaiting_search_query":
      await handleSearch(ctx, chatId, text);
      break;
    case "awaiting_update_student":
      await handleUpdatePick(ctx, chatId, text);
      break;
    case "awaiting_update_meet":
      await handleUpdateMeet(ctx, chatId, text);
      break;
    case "awaiting_delete_student":
      await handleDeletePick(ctx, chatId, text);
      break;
    case "awaiting_teacher_message":
      await handleTeacherMessage(ctx, chatId, text);
      break;
  }
}

async function handleTeacherMessage(
  ctx: Context,
  chatId: number,
  body: string,
): Promise<void> {
  if (!isStaff(ctx.from?.id)) {
    clearPending(chatId);
    await ctx.reply("Only staff can message the teacher.", {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  clearPending(chatId);

  try {
    await sendMessageToTeacher(ctx.api, body);
    await ctx.reply("✅ Sent to the teacher.", {
      reply_markup: mainMenuKeyboard(),
    });
  } catch (error) {
    console.error("[menu] Message teacher failed:", error);
    await ctx.reply("❌ Could not send the message.", {
      reply_markup: mainMenuKeyboard(),
    });
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
        `A student named *${escapeMarkdown(name)}* already exists.`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() },
      );
      return;
    }
  } catch (error) {
    console.error("[menu] Add name check failed:", error);
    clearPending(chatId);
    await ctx.reply("❌ Could not reach Appwrite.", {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  setPending(chatId, "awaiting_add_meet_link", { name });
  await ctx.reply(
    `Name: *${escapeMarkdown(name)}*\n\nNow send their Google Meet URL.`,
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
    await ctx.reply("Session expired.", { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (!isValidMeetUrl(meetLink)) {
    await ctx.reply(
      "Invalid Meet URL. Example: `https://meet.google.com/abc-defg-hij`",
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
      `✅ Added *${escapeMarkdown(student.name)}*\nMeet: ${escapeMarkdown(student.meetLink ?? "")}`,
      {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
        reply_markup: mainMenuKeyboard(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[menu] Add failed:", error);
    await ctx.reply(`❌ Could not add student.\n${message}`, {
      reply_markup: mainMenuKeyboard(),
    });
  }
}

async function handleSearch(
  ctx: Context,
  chatId: number,
  query: string,
): Promise<void> {
  clearPending(chatId);

  try {
    const matches = await searchStudents(query);
    if (matches.length === 0) {
      await ctx.reply(`No students matching "${query}".`, {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }

    const body = matches.map(formatStudentDetails).join("\n\n────────────\n\n");
    await replyChunked(
      ctx,
      `🔍 Results (${matches.length})\n\n${body}`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: mainMenuKeyboard(),
      },
    );
  } catch (error) {
    console.error("[menu] Search failed:", error);
    await ctx.reply("❌ Search failed.", { reply_markup: mainMenuKeyboard() });
  }
}

async function handleUpdatePick(
  ctx: Context,
  chatId: number,
  name: string,
): Promise<void> {
  clearPending(chatId);

  try {
    const student = await findStudentByName(name);
    if (!student) {
      await ctx.reply(`No student named "${name}".`, {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }

    await ctx.reply(
      `${formatStudentDetails(student)}\n\nWhat do you want to update?`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: updateStudentActionsKeyboard(student.$id),
      },
    );
  } catch (error) {
    console.error("[menu] Update pick failed:", error);
    await ctx.reply("❌ Could not load student.", {
      reply_markup: mainMenuKeyboard(),
    });
  }
}

async function handleUpdateMeet(
  ctx: Context,
  chatId: number,
  meetLink: string,
): Promise<void> {
  const draft = getDraft(chatId);
  if (!draft?.studentId && !draft?.name) {
    clearPending(chatId);
    await ctx.reply("Session expired.", { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (!isValidMeetUrl(meetLink)) {
    await ctx.reply(
      "Invalid Meet URL. Example: `https://meet.google.com/abc-defg-hij`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  clearPending(chatId);

  try {
    const ref = draft.name ?? draft.studentId!;
    const student = await saveMeetLink(ref, meetLink.trim());
    await ctx.reply(
      `✅ Meet link updated for *${escapeMarkdown(student.name)}*\n${escapeMarkdown(meetLink.trim())}`,
      {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
        reply_markup: mainMenuKeyboard(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[menu] Meet update failed:", error);
    await ctx.reply(`❌ ${message}`, { reply_markup: mainMenuKeyboard() });
  }
}

async function handleDeletePick(
  ctx: Context,
  chatId: number,
  name: string,
): Promise<void> {
  clearPending(chatId);

  try {
    const student = await findStudentByName(name);
    if (!student) {
      await ctx.reply(`No student named "${name}".`, {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }

    await ctx.reply(
      `Delete *${escapeMarkdown(student.name)}*?\nThis cannot be undone.`,
      {
        parse_mode: "Markdown",
        reply_markup: deleteConfirmKeyboard(student.$id),
      },
    );
  } catch (error) {
    console.error("[menu] Delete pick failed:", error);
    await ctx.reply("❌ Could not load student.", {
      reply_markup: mainMenuKeyboard(),
    });
  }
}
