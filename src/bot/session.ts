export type PendingAction =
  | "awaiting_reminder_student"
  | "awaiting_search_student"
  | "awaiting_status_student"
  | "awaiting_add_name"
  | "awaiting_add_meet_link";

export interface AddStudentDraft {
  name?: string;
}

interface SessionState {
  action: PendingAction;
  draft?: AddStudentDraft;
}

/** In-memory per-user prompt state (chatId → session). */
const sessions = new Map<number, SessionState>();

export function setPending(
  chatId: number,
  action: PendingAction,
  draft?: AddStudentDraft,
): void {
  sessions.set(chatId, { action, draft });
}

export function getPending(chatId: number): PendingAction | undefined {
  return sessions.get(chatId)?.action;
}

export function getDraft(chatId: number): AddStudentDraft | undefined {
  return sessions.get(chatId)?.draft;
}

export function clearPending(chatId: number): void {
  sessions.delete(chatId);
}
