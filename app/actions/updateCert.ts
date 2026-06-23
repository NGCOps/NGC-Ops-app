"use server";

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { revalidatePath } from "next/cache";
import type { ShiftPrepRecord, CertStatus } from "@/lib/data";

const dataPath = join(process.cwd(), "data", "shift-prep.json");

function readData(): ShiftPrepRecord[] {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
}

function writeData(data: ShiftPrepRecord[]) {
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export async function updateCertStatus(
  projectId: string,
  workerId: string,
  certId: string,
  status: CertStatus,
  notes: string,
  expiry: string,
  completedDate: string
) {
  const data = readData();
  const record = data.find((r) => r.projectId === projectId);
  if (!record) throw new Error(`No shift prep record for project ${projectId}`);

  if (!record.workerStatus[workerId]) {
    record.workerStatus[workerId] = {};
  }

  record.workerStatus[workerId][certId] = {
    status,
    expiry: expiry || null,
    completedDate: completedDate || null,
    notes,
  };

  writeData(data);
  revalidatePath(`/people/${workerId}`);
  revalidatePath("/shift-prep");
  revalidatePath("/");
}
