export type PendingKind = "tasks" | "reminder";

const pending = new Map<number, PendingKind>();

/** Replace whatever the chat was waiting for. */
export function setPending(chatId: number, kind: PendingKind): void {
  pending.set(chatId, kind);
}

/** Take the pending input, if any, so a later message is not handled twice. */
export function consumePending(chatId: number): PendingKind | undefined {
  const kind = pending.get(chatId);
  pending.delete(chatId);
  return kind;
}

export function clearPending(chatId: number): boolean {
  return pending.delete(chatId);
}
