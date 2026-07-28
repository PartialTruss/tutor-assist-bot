import type { Bot } from "grammy";
import { startCommand, menuCommand, helpCommand, cancelCommand } from "./start.js";
import { meetCommand } from "./meet.js";
import { addStudentCommand } from "./addStudent.js";
import { registerMenuHandlers } from "../menu/handlers.js";

export function registerCommands(bot: Bot): void {
  bot.command("start", startCommand);
  bot.command("menu", menuCommand);
  bot.command("help", helpCommand);
  bot.command("cancel", cancelCommand);
  bot.command("meet", meetCommand);
  bot.command("addstudent", addStudentCommand);

  registerMenuHandlers(bot);
}
