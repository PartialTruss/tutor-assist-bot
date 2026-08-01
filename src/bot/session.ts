export type PendingAction =
  | "awaiting_add_name"
  | "awaiting_add_meet_link"
  | "awaiting_search_query"
  | "awaiting_update_student"
  | "awaiting_update_meet"
  | "awaiting_delete_student"
  | "awaiting_teacher_message";

export interface StudentDraft {
  name?: string;
  studentId?: string;
}

interface SessionState {
  action: PendingAction;
  draft?: StudentDraft;
}

const sessions = new Map<number, SessionState>();

export function setPending(
  chatId: number,
  action: PendingAction,
  draft?: StudentDraft,
): void {
  sessions.set(chatId, { action, draft });
}

export function getPending(chatId: number): PendingAction | undefined {
  return sessions.get(chatId)?.action;
}

export function getDraft(chatId: number): StudentDraft | undefined {
  return sessions.get(chatId)?.draft;
}

export function clearPending(chatId: number): void {
  sessions.delete(chatId);
}
