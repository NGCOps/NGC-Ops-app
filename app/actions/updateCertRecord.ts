"use server";

import { revalidatePath } from "next/cache";
import { dbUpsertCertification, dbDeleteCertification } from "@/lib/db-data";
import type { Certification } from "@/lib/data";

export async function upsertCertification(cert: Omit<Certification, "id"> & { id?: string }) {
  const id = cert.id ?? `${cert.workerId}-${cert.certTypeId}-${Date.now()}`;
  const record: Certification = { ...cert, id } as Certification;
  await dbUpsertCertification(record);
  revalidatePath(`/people/${cert.workerId}`);
  revalidatePath("/certifications");
  revalidatePath("/projects", "layout");
}

export async function deleteCertification(certId: string, workerId: string) {
  await dbDeleteCertification(certId);
  revalidatePath(`/people/${workerId}`);
  revalidatePath("/certifications");
  revalidatePath("/projects", "layout");
}
