export const MEET_URL_PATTERN =
  /^https:\/\/meet\.google\.com\/[a-z0-9-]+(?:\?[^\s]*)?$/i;

export function isValidMeetUrl(url: string): boolean {
  return MEET_URL_PATTERN.test(url.trim());
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}
