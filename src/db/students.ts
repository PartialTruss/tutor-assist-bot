import { ID, Query } from "node-appwrite";
import { databases, dbIds } from "./appwrite.js";
import type { Student, StudentUpdateInput } from "../types/student.js";

function mapStudent(doc: Record<string, unknown>): Student {
  const chatId = doc.telegramChatId ? String(doc.telegramChatId).trim() : "";
  return {
    $id: String(doc.$id),
    name: String(doc.name ?? ""),
    telegramChatId: chatId || undefined,
    meetLink: doc.meetLink ? String(doc.meetLink) : undefined,
    homeworkNote: doc.homeworkNote ? String(doc.homeworkNote) : undefined,
  };
}

/** Fetch every student document (paged). */
export async function listStudents(): Promise<Student[]> {
  const students: Student[] = [];
  let cursor: string | undefined;

  for (;;) {
    const queries = [Query.limit(100)];
    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const page = await databases.listDocuments({
      databaseId: dbIds.databaseId,
      collectionId: dbIds.studentsCollectionId,
      queries,
    });

    for (const doc of page.documents) {
      students.push(mapStudent(doc as unknown as Record<string, unknown>));
    }

    if (page.documents.length < 100) {
      break;
    }

    cursor = page.documents[page.documents.length - 1].$id;
  }

  return students;
}

/** Find a student by exact name (case-sensitive Appwrite equality). */
export async function findStudentByName(name: string): Promise<Student | null> {
  const result = await databases.listDocuments({
    databaseId: dbIds.databaseId,
    collectionId: dbIds.studentsCollectionId,
    queries: [Query.equal("name", name), Query.limit(1)],
  });

  const doc = result.documents[0];
  return doc ? mapStudent(doc as unknown as Record<string, unknown>) : null;
}

/** Find a student by Appwrite document ID. */
export async function findStudentById(id: string): Promise<Student | null> {
  try {
    const doc = await databases.getDocument({
      databaseId: dbIds.databaseId,
      collectionId: dbIds.studentsCollectionId,
      documentId: id,
    });
    return mapStudent(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Upsert a Google Meet link onto an existing student (by name or document ID). */
export async function saveMeetLink(
  studentRef: string,
  meetLink: string,
): Promise<Student> {
  const byId = await findStudentById(studentRef);
  const student = byId ?? (await findStudentByName(studentRef));

  if (!student) {
    throw new Error(
      `Student not found: "${studentRef}". Use the Appwrite document ID or exact student name.`,
    );
  }

  return updateStudent(student.$id, { meetLink });
}

export async function updateStudent(
  id: string,
  data: StudentUpdateInput,
): Promise<Student> {
  const doc = await databases.updateDocument({
    databaseId: dbIds.databaseId,
    collectionId: dbIds.studentsCollectionId,
    documentId: id,
    data,
  });

  return mapStudent(doc as unknown as Record<string, unknown>);
}

/** Create a student document. Chat ID is optional. */
export async function createStudent(input: {
  name: string;
  telegramChatId?: string;
  meetLink?: string;
  homeworkNote?: string;
}): Promise<Student> {
  const data: Record<string, string> = { name: input.name };

  if (input.telegramChatId?.trim()) {
    data.telegramChatId = input.telegramChatId.trim();
  }
  if (input.meetLink?.trim()) {
    data.meetLink = input.meetLink.trim();
  }
  if (input.homeworkNote?.trim()) {
    data.homeworkNote = input.homeworkNote.trim();
  }

  const doc = await databases.createDocument({
    databaseId: dbIds.databaseId,
    collectionId: dbIds.studentsCollectionId,
    documentId: ID.unique(),
    data,
  });

  return mapStudent(doc as unknown as Record<string, unknown>);
}
