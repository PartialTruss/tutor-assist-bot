import { InlineKeyboard } from "grammy";

export const MENU_CALLBACK = {
  addStudent: "menu:add_student",
  sendReminder: "menu:send_reminder",
  searchLink: "menu:search_link",
  savedLinks: "menu:saved_links",
  back: "menu:back",
} as const;

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Add Student", MENU_CALLBACK.addStudent)
    .row()
    .text("Send Reminder", MENU_CALLBACK.sendReminder)
    .row()
    .text("Search Link", MENU_CALLBACK.searchLink)
    .row()
    .text("Saved Links", MENU_CALLBACK.savedLinks);
}

export const MENU_INTRO = [
  "📋 *Main Menu*",
  "",
  "Choose an action below, or use `/addstudent` / `/meet` for quick commands.",
].join("\n");
