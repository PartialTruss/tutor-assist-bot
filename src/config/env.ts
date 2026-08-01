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

export const env = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  /** Teacher — receives 21:00 OneNote reminder + manual bot messages */
  teacherChatId: requireEnv("TEACHER_CHAT_ID"),
  /** You — receives 14:00 “check students’ homework” reminder */
  myChatId: requireEnv("MY_CHAT_ID"),
  /** TA — can change task statuses (RBAC) */
  taChatId: requireEnv("TA_CHAT_ID"),
  senderName: optionalEnv("SENDER_NAME", "My Name"),

  appwrite: {
    endpoint: requireEnv("APPWRITE_ENDPOINT"),
    projectId: requireEnv("APPWRITE_PROJECT_ID"),
    apiKey: requireEnv("APPWRITE_API_KEY"),
    databaseId: requireEnv("APPWRITE_DATABASE_ID"),
    studentsCollectionId: requireEnv("APPWRITE_STUDENTS_COLLECTION_ID"),
  },

  cron: {
    /** Reminder to you: check students’ homework */
    homeworkCheck: optionalEnv("HOMEWORK_CHECK_CRON", "0 14 * * *"),
    /** Reminder to teacher: OneNote tasks */
    teacherDigest: optionalEnv("TEACHER_DIGEST_CRON", "0 21 * * *"),
    timezone: optionalEnv("TZ", "Asia/Tehran"),
  },
} as const;
