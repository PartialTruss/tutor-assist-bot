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
  teacherChatId: requireEnv("TEACHER_CHAT_ID"),
  senderName: optionalEnv("SENDER_NAME", "My Name"),

  appwrite: {
    endpoint: requireEnv("APPWRITE_ENDPOINT"),
    projectId: requireEnv("APPWRITE_PROJECT_ID"),
    apiKey: requireEnv("APPWRITE_API_KEY"),
    databaseId: requireEnv("APPWRITE_DATABASE_ID"),
    studentsCollectionId: requireEnv("APPWRITE_STUDENTS_COLLECTION_ID"),
  },

  cron: {
    studentReminder: optionalEnv("STUDENT_REMINDER_CRON", "0 12 * * *"),
    teacherReminder: optionalEnv("TEACHER_REMINDER_CRON", "0 9 * * *"),
    timezone: optionalEnv("TZ", "Asia/Tehran"),
  },
} as const;
