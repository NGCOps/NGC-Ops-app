"use server";

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { revalidatePath } from "next/cache";
import type { Certification, CertSource } from "@/lib/data";

const dataPath = join(process.cwd(), "data", "certifications.json");

function read(): Certification[] {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
}
function write(data: Certification[]) {
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export async function upsertCertification(cert: Omit<Certification, "id"> & { id?: string }) {
  const data = read();
  const id = cert.id ?? `${cert.workerId}-${cert.certTypeId}-${Date.now()}`;
  const existing = data.findIndex((c) => c.id === id);
  const record: Certification = { ...cert, id };
  if (existing >= 0) {
    data[existing] = record;
  } else {
    data.push(record);
  }
  write(data);
  revalidatePath(`/people/${cert.workerId}`);
  revalidatePath("/certifications");
  revalidatePath("/projects", "layout");
}

export async function deleteCertification(certId: string, workerId: string) {
  const data = read().filter((c) => c.id !== certId);
  write(data);
  revalidatePath(`/people/${workerId}`);
  revalidatePath("/certifications");
}
