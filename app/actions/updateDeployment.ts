"use server";

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { revalidatePath } from "next/cache";
import type { Deployment, Leg, Hotel } from "@/lib/data";

const dataPath = join(process.cwd(), "data", "logistics.json");

function read(): Deployment[] {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
}
function write(data: Deployment[]) {
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export async function upsertDeployment(deployment: Deployment) {
  const data = read();
  const idx = data.findIndex((d) => d.id === deployment.id);
  if (idx >= 0) {
    data[idx] = deployment;
  } else {
    data.push(deployment);
  }
  write(data);
  revalidatePath(`/people/${deployment.workerId}`);
  revalidatePath("/logistics");
  revalidatePath("/");
}

export async function updateLeg(deploymentId: string, workerId: string, leg: Leg) {
  const data = read();
  const dep = data.find((d) => d.id === deploymentId);
  if (!dep) throw new Error(`Deployment ${deploymentId} not found`);
  const legIdx = dep.legs.findIndex((l) => l.id === leg.id);
  if (legIdx >= 0) {
    dep.legs[legIdx] = leg;
  } else {
    dep.legs.push(leg);
    dep.legs.sort((a, b) => a.order - b.order);
  }
  write(data);
  revalidatePath(`/people/${workerId}`);
  revalidatePath("/logistics");
  revalidatePath("/");
}

export async function deleteLeg(deploymentId: string, legId: string, workerId: string) {
  const data = read();
  const dep = data.find((d) => d.id === deploymentId);
  if (!dep) return;
  dep.legs = dep.legs.filter((l) => l.id !== legId);
  write(data);
  revalidatePath(`/people/${workerId}`);
  revalidatePath("/logistics");
  revalidatePath("/");
}

export async function updateHotel(deploymentId: string, workerId: string, hotel: Hotel) {
  const data = read();
  const dep = data.find((d) => d.id === deploymentId);
  if (!dep) throw new Error(`Deployment ${deploymentId} not found`);
  dep.hotel = hotel;
  write(data);
  revalidatePath(`/people/${workerId}`);
  revalidatePath("/logistics");
}
