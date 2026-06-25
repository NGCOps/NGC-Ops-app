import type { Project, Certification } from "@/lib/data";

export type CertTier = "high" | "medium" | "standard";

export const TIER_CONFIG: Record<CertTier, { label: string; dot: string; bg: string }> = {
  high:     { label: "High",     dot: "bg-red-500",    bg: "bg-red-50 text-red-700 border-red-200" },
  medium:   { label: "Medium",   dot: "bg-yellow-400", bg: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  standard: { label: "Standard", dot: "bg-green-500",  bg: "bg-green-50 text-green-700 border-green-200" },
};

export function projectTier(project: Project): CertTier {
  return project.tier ?? "standard";
}

// Worker is "high" if they hold ALL required certs for at least one high-tier project.
// Worker is "medium" if they hold ALL certs for at least one medium-tier project.
// Otherwise "standard".
export function workerTier(workerCerts: Certification[], projects: Project[]): CertTier {
  const now = new Date(); now.setHours(0, 0, 0, 0);

  const validCertIds = new Set(
    workerCerts
      .filter((c) => !c.expiryDate || new Date(c.expiryDate + "T12:00:00") >= now)
      .map((c) => c.certTypeId)
  );

  const hasAllCerts = (required: string[]) =>
    required.length > 0 && required.every((cid) => validCertIds.has(cid));

  for (const tier of ["high", "medium"] as CertTier[]) {
    const tierProjects = projects.filter((p) => (p.tier ?? "standard") === tier && p.requiredCerts?.length);
    if (tierProjects.some((p) => hasAllCerts(p.requiredCerts!))) {
      return tier;
    }
  }
  return "standard";
}
