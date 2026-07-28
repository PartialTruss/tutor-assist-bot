import { Client, Databases } from "node-appwrite";
import { env } from "../config/env.js";

const client = new Client()
  .setEndpoint(env.appwrite.endpoint)
  .setProject(env.appwrite.projectId)
  .setKey(env.appwrite.apiKey);

export const databases = new Databases(client);

export const dbIds = {
  databaseId: env.appwrite.databaseId,
  studentsCollectionId: env.appwrite.studentsCollectionId,
} as const;
