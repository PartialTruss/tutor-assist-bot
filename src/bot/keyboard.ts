import { Keyboard } from "grammy";

export const ownerKeyboard = new Keyboard()
  .text("Format tasks")
  .text("Set reminder")
  .row()
  .text("My reminders")
  .resized()
  .persistent();
