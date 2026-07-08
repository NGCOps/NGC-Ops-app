"use server";

import { revalidatePath } from "next/cache";
import { dbGetProject, dbSaveProject } from "@/lib/db-data";
import type { ProjectContact } from "@/lib/data";

export async function upsertProjectContact(projectId: string, contact: ProjectContact) {
  const project = await dbGetProject(projectId);
  if (!project) throw new Error("Project not found");
  const contacts = project.contacts ?? [];
  const idx = contacts.findIndex((c) => c.id === contact.id);
  const updated = idx >= 0
    ? contacts.map((c, i) => (i === idx ? contact : c))
    : [...contacts, contact];
  await dbSaveProject({ ...project, contacts: updated });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectContact(projectId: string, contactId: string) {
  const project = await dbGetProject(projectId);
  if (!project) throw new Error("Project not found");
  const contacts = (project.contacts ?? []).filter((c) => c.id !== contactId);
  await dbSaveProject({ ...project, contacts });
  revalidatePath(`/projects/${projectId}`);
}
