import projectsData from "@/data/projects.json";
import peopleData from "@/data/people.json";
import shiftPrepData from "@/data/shift-prep.json";
import logisticsData from "@/data/logistics.json";
import certTypesData from "@/data/cert-types.json";
import certificationsData from "@/data/certifications.json";

// ─── Projects ───────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "complete" | "on-hold" | "upcoming";

export interface ProjectContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  description: string;
  workerIds: string[];
  supervisorId: string;
  requiredCerts?: string[];
  tier?: "high" | "medium" | "standard";
  internal?: boolean;
  programs?: string[];
  contacts?: ProjectContact[];
}

export function getProjects(): Project[] { return projectsData as Project[]; }
export function getProject(id: string) { return getProjects().find((p) => p.id === id); }

// ─── People ──────────────────────────────────────────────────────────────────

export type PersonGroup = "ngc-management" | "katc-supervisor" | "bc-parks" | "env-tech";

export interface Person {
  id: string;
  name: string;
  role: string;
  company: string;
  group: PersonGroup;
  email: string;
  phone: string;
  hourlyRate: number | null;
  type: "staff" | "field" | "supervisor";
  active: boolean;
}

export function getPeople(): Person[] { return peopleData as Person[]; }
export function getPerson(id: string) { return getPeople().find((p) => p.id === id); }

export function getProjectsForPerson(personId: string): Project[] {
  return getProjects().filter(
    (p) => p.workerIds.includes(personId) || p.supervisorId === personId
  );
}

// ─── Cert Types ──────────────────────────────────────────────────────────────

export interface CertType {
  id: string;
  label: string;
  category: string;
  validityMonths: number | null;
  notes: string;
}

export function getCertTypes(): CertType[] { return certTypesData as CertType[]; }
export function getCertType(id: string) { return getCertTypes().find((c) => c.id === id); }

// ─── Certifications (master per-worker records) ───────────────────────────────

export type CertSource = "sharepoint" | "workhub" | "email" | "paper" | "other";

export interface Certification {
  id: string;
  workerId: string;
  certTypeId: string;
  issuedDate: string | null;
  expiryDate: string | null;
  source: CertSource;
  documentRef: string;
  notes: string;
}

export function getCertifications(): Certification[] { return certificationsData as Certification[]; }
export function getCertificationsForWorker(workerId: string) {
  return getCertifications().filter((c) => c.workerId === workerId);
}

export function isCertExpired(cert: Certification): boolean {
  if (!cert.expiryDate) return false;
  return new Date(cert.expiryDate + "T12:00:00") < new Date();
}

export function isCertExpiringSoon(cert: Certification, withinDays = 60): boolean {
  if (!cert.expiryDate) return false;
  const exp = new Date(cert.expiryDate + "T12:00:00");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return exp <= cutoff && exp >= new Date();
}

// ─── Shift Prep (project onboarding checklists) ───────────────────────────────

export type CertStatus = "complete" | "pending" | "expired" | "na";

export interface Requirement {
  id: string;
  label: string;
  category: string;
  daysBeforeStart: number | null;
  note: string;
}

export interface WorkerCertStatus {
  status: CertStatus;
  expiry: string | null;
  completedDate: string | null;
  notes: string;
}

export interface ShiftPrepRecord {
  id: string;
  projectId: string;
  requirements: Requirement[];
  workerStatus: Record<string, Record<string, WorkerCertStatus>>;
}

export function getShiftPrep(): ShiftPrepRecord[] { return shiftPrepData as ShiftPrepRecord[]; }
export function getShiftPrepForProject(projectId: string) {
  return getShiftPrep().find((s) => s.projectId === projectId);
}

export function getPersonCerts(personId: string) {
  const results: Array<{
    projectId: string;
    projectName: string;
    requirement: Requirement;
    cert: WorkerCertStatus;
  }> = [];
  for (const sp of getShiftPrep()) {
    const workerStatus = sp.workerStatus[personId];
    if (!workerStatus) continue;
    const project = getProject(sp.projectId);
    for (const req of sp.requirements) {
      const cert = workerStatus[req.id];
      if (cert) results.push({ projectId: sp.projectId, projectName: project?.name ?? sp.projectId, requirement: req, cert });
    }
  }
  return results;
}

// ─── Logistics (deployments + legs) ──────────────────────────────────────────

export type LegType = "self" | "ngc-drive" | "external-carpool" | "flight" | "bus" | "other";
export type LegStatus = "tbd" | "confirmed" | "complete";

export interface Leg {
  id: string;
  order: number;
  type: LegType;
  from: string;
  to: string;
  date: string;
  time: string;
  arrangedBy: string;
  driverName: string;
  notes: string;
  status: LegStatus;
}

export interface Hotel {
  needed: boolean;
  name: string;
  address: string;
  confirmationNumber: string;
  checkIn: string;
  checkOut: string;
  bookedBy: string;
  notes: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  workerId: string;
  shiftStart: string;
  shiftEnd: string;
  hotel: Hotel;
  legs: Leg[];
  notes: string;
}

export function getDeployments(): Deployment[] { return logisticsData as Deployment[]; }
export function getDeploymentsForProject(projectId: string) {
  return getDeployments().filter((d) => d.projectId === projectId);
}
export function getDeploymentsForWorker(workerId: string) {
  return getDeployments().filter((d) => d.workerId === workerId);
}

export function deploymentHasTBD(d: Deployment): boolean {
  return d.legs.length === 0 || d.legs.some((l) => l.status === "tbd");
}
