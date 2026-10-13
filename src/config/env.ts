import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function requireChatId(name: string): string {
  const value = requireEnv(name);
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a numeric Telegram user id`);
  }
  return value;
}

function assertTimeZone(timeZone: string): string {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error(`Invalid TZ timezone: "${timeZone}"`);
  }
  return timeZone;
}

const timezone = assertTimeZone(optionalEnv("TZ", "Europe/Brussels"));

export const env = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  /** The only Telegram account this bot may message or accept updates from. */
  myChatId: requireChatId("MY_CHAT_ID"),
  cron: {
    timezone,
    /** Every day at 14:00 — start homework collection. */
    homeworkCollect: optionalEnv("HOMEWORK_COLLECT_CRON", "0 14 * * *"),
    /** Every day at 16:00 — ask whether homework was collected. */
    homeworkFollowUp: optionalEnv("HOMEWORK_FOLLOWUP_CRON", "0 16 * * *"),
    /** Every day at 19:00 — remind if homework is still open. */
    homeworkUrgent: optionalEnv("HOMEWORK_URGENT_CRON", "0 19 * * *"),
    /** Friday at 10:00 — next week's availability. Day-of-week 5 = Friday. */
    availability: optionalEnv("AVAILABILITY_CRON", "0 10 * * 5"),
    /**
     * Saturday–Wednesday at 11:00 — students who have not booked.
     * 6 = Sat, 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed.
     */
    booking: optionalEnv("BOOKING_CRON", "0 11 * * 0,1,2,3,6"),
    /**
     * Saturday–Thursday at 22:00 — platform confirmations.
     * 6 = Sat, 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu.
     */
    platformConfirm: optionalEnv("PLATFORM_CONFIRM_CRON", "0 22 * * 0,1,2,3,4,6"),
  },
} as const;
