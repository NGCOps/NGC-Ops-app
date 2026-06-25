import type { Project, Certification } from "@/lib/data";

export function workerQualifiesFor(workerCerts: Certification[], project: Project): boolean {
  if (!project.requiredCerts?.length) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const validIds = new Set(
    workerCerts
      .filter((c) => !c.expiryDate || new Date(c.expiryDate + "T12:00:00") >= now)
      .map((c) => c.certTypeId)
  );
  return project.requiredCerts.every((cid) => validIds.has(cid));
}
