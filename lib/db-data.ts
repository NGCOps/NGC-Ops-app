import { sql } from "@/lib/db";
import type { Project, Person, CertType, Certification, Deployment, ShiftPrepRecord } from "@/lib/data";

export async function dbGetProjects(): Promise<Project[]> {
  const rows = await sql`SELECT data FROM projects ORDER BY (data->>'startDate')`;
  return rows.map((r) => r.data as Project);
}

export async function dbGetProject(id: string): Promise<Project | null> {
  const rows = await sql`SELECT data FROM projects WHERE id = ${id}`;
  return rows[0]?.data ?? null;
}

export async function dbSaveProject(project: Project): Promise<void> {
  await sql`INSERT INTO projects (id, data) VALUES (${project.id}, ${JSON.stringify(project)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
}

export async function dbGetPeople(): Promise<Person[]> {
  const rows = await sql`SELECT data FROM people ORDER BY (data->>'name')`;
  return rows.map((r) => r.data as Person);
}

export async function dbGetCertTypes(): Promise<CertType[]> {
  const rows = await sql`SELECT data FROM cert_types ORDER BY (data->>'label')`;
  return rows.map((r) => r.data as CertType);
}

export async function dbGetCertificationsForWorker(workerId: string): Promise<Certification[]> {
  const rows = await sql`SELECT data FROM certifications WHERE worker_id = ${workerId}`;
  return rows.map((r) => r.data as Certification);
}

export async function dbUpsertCertification(cert: Certification): Promise<void> {
  await sql`INSERT INTO certifications (id, worker_id, data) VALUES (${cert.id}, ${cert.workerId}, ${JSON.stringify(cert)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, worker_id = EXCLUDED.worker_id`;
}

export async function dbDeleteCertification(certId: string): Promise<void> {
  await sql`DELETE FROM certifications WHERE id = ${certId}`;
}

export async function dbGetDeployments(): Promise<Deployment[]> {
  const rows = await sql`SELECT data FROM logistics ORDER BY (data->>'shiftStart')`;
  return rows.map((r) => r.data as Deployment);
}

export async function dbGetDeploymentsForProject(projectId: string): Promise<Deployment[]> {
  const rows = await sql`SELECT data FROM logistics WHERE data->>'projectId' = ${projectId} ORDER BY (data->>'shiftStart')`;
  return rows.map((r) => r.data as Deployment);
}

export async function dbGetShiftPrepForProject(projectId: string): Promise<ShiftPrepRecord | null> {
  const rows = await sql`SELECT data FROM shift_prep WHERE project_id = ${projectId}`;
  return rows[0]?.data ?? null;
}

export async function dbDeploymentHasTBD(d: Deployment): Promise<boolean> {
  return d.legs.length === 0 || d.legs.some((l) => l.status === "tbd");
}
