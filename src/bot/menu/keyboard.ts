import { InlineKeyboard } from "grammy";

export const MENU_CALLBACK = {
  addStudent: "menu:add_student",
  listStudents: "menu:list_students",
  searchStudents: "menu:search_students",
  updateStudent: "menu:update_student",
  deleteStudent: "menu:delete_student",
  messageTeacher: "menu:message_teacher",
  updateStatus: "upd:status",
  updateMeet: "upd:meet",
  deleteConfirm: "del:yes",
  deleteCancel: "del:no",
  back: "menu:back",
} as const;

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Add a student", MENU_CALLBACK.addStudent)
    .row()
    .text("List of all students", MENU_CALLBACK.listStudents)
    .row()
    .text("Search for students", MENU_CALLBACK.searchStudents)
    .row()
    .text("Update a student", MENU_CALLBACK.updateStudent)
    .row()
    .text("Delete a student", MENU_CALLBACK.deleteStudent)
    .row()
    .text("Message teacher", MENU_CALLBACK.messageTeacher);
}

export function updateStudentActionsKeyboard(studentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Update status", `${MENU_CALLBACK.updateStatus}:${studentId}`)
    .row()
    .text("Update Meet link", `${MENU_CALLBACK.updateMeet}:${studentId}`)
    .row()
    .text("« Main menu", MENU_CALLBACK.back);
}

export function deleteConfirmKeyboard(studentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Yes, delete", `${MENU_CALLBACK.deleteConfirm}:${studentId}`)
    .text("Cancel", MENU_CALLBACK.deleteCancel);
}

export const MENU_INTRO = [
  "📋 *Tutor Assist*",
  "",
  "Choose an action:",
].join("\n");
