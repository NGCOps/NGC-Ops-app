import {
  getPerson, getPeople, getProjectsForPerson,
  isCertExpired, isCertExpiringSoon,
  getShiftPrepForProject, getDeploymentsForWorker, deploymentHasTBD,
} from "@/lib/data";
import { dbGetCertificationsForWorker, dbGetCertTypes } from "@/lib/db-data";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PersonGroup } from "@/lib/data";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import CertEditor from "@/components/CertEditor";
import MovementPlan from "@/components/MovementPlan";

export const dynamic = "force-dynamic";

const groupColors: Record<PersonGroup, string> = {
  "ngc-management":  "bg-blue-700",
  "katc-supervisor": "bg-violet-700",
  "bc-parks":        "bg-emerald-700",
  "env-tech":        "bg-amber-600",
};

const groupLabels: Record<PersonGroup, string> = {
  "ngc-management":  "NGC Management",
  "katc-supervisor": "KATC Supervisor",
  "bc-parks":        "BC Parks Staff",
  "env-tech":        "Environmental Tech",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export function generateStaticParams() {
  return getPeople().map((p: { id: string }) => ({ id: p.id }));
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = getPerson(id);
  if (!person) notFound();

  const [certTypes, masterCerts] = await Promise.all([
    dbGetCertTypes(),
    dbGetCertificationsForWorker(id),
  ]);

  const allPersonProjects = getProjectsForPerson(id);
  const deployments = getDeploymentsForWorker(id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingProjects = allPersonProjects.filter((p) => {
    const end = new Date(p.endDate + "T12:00:00");
    return end >= today && p.status !== "complete";
  });
  const pastProjects = allPersonProjects.filter((p) => {
    const end = new Date(p.endDate + "T12:00:00");
    return end < today || p.status === "complete";
  });

  const expiredCerts = masterCerts.filter(isCertExpired);
  const expiringCerts = masterCerts.filter((c) => !isCertExpired(c) && isCertExpiringSoon(c));
  const alertCount = expiredCerts.length + expiringCerts.length;

  return (
    <div className="space-y-6">
      <Link href="/people" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
        ← People
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-start gap-4">
          <div className={`${groupColors[person.group]} w-14 h-14 rounded-full flex items-center justify-center shrink-0`}>
            <span className="text-white text-xl font-bold">{initials(person.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-stone-900">{person.name}</h1>
                <div className="text-stone-500 mt-0.5">{person.role}</div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-stone-400">{person.company}</span>
                  <span className="text-xs font-medium bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                    {groupLabels[person.group]}
                  </span>
                </div>
              </div>
              {alertCount > 0 && (
                <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                  ⚠ {alertCount} cert{alertCount !== 1 ? "s" : ""} need attention
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-5 pt-5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Email</div>
            {person.email ? (
              <a href={`mailto:${person.email}`} className="text-sm text-stone-800 hover:underline">{person.email}</a>
            ) : <span className="text-sm text-stone-400 italic">Not on file</span>}
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Phone</div>
            {person.phone ? (
              <a href={`tel:${person.phone}`} className="text-sm text-stone-700 hover:underline">{person.phone}</a>
            ) : <span className="text-sm text-stone-400 italic">Not on file</span>}
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Hourly Rate</div>
            {person.hourlyRate ? (
              <span className="text-sm font-medium text-stone-800">${person.hourlyRate}/hr</span>
            ) : <span className="text-sm text-stone-400 italic">Not on file</span>}
          </div>
        </div>
      </div>

      {/* Certifications */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Certifications</h2>
          <div className="flex gap-2">
            {expiredCerts.length > 0 && (
              <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{expiredCerts.length} expired</span>
            )}
            {expiringCerts.length > 0 && (
              <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">{expiringCerts.length} expiring</span>
            )}
            {masterCerts.length > 0 && !expiredCerts.length && !expiringCerts.length && (
              <span className="text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">{masterCerts.length} valid</span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <CertEditor workerId={id} certTypes={certTypes} existing={masterCerts} />
        </div>
      </section>

      {/* Upcoming Projects + Onboarding */}
      {upcomingProjects.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Upcoming Projects</h2>
          <div className="space-y-4">
            {upcomingProjects.map((p) => {
              const shiftPrep = getShiftPrepForProject(p.id);
              const workerStatus = shiftPrep?.workerStatus[id] ?? {};
              const deployment = deployments.find((d) => d.projectId === p.id);
              const shiftStart = deployment?.shiftStart ?? p.startDate;
              const hasTBDMovement = deployment ? deploymentHasTBD(deployment) : true;

              return (
                <div key={p.id} className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-stone-900">{p.name}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{p.client} · {p.location}</div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {formatDate(p.startDate)} → {formatDate(p.endDate)}
                      </div>
                    </div>
                    {hasTBDMovement && (
                      <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full shrink-0">Movement TBD</span>
                    )}
                  </div>

                  {shiftPrep && shiftPrep.requirements.length > 0 && (
                    <div className="border-t border-stone-100 pt-4">
                      <OnboardingChecklist
                        projectId={p.id}
                        projectName={p.name}
                        shiftStart={shiftStart}
                        workerId={id}
                        requirements={shiftPrep.requirements}
                        workerStatus={workerStatus}
                      />
                    </div>
                  )}

                  {deployment && (
                    <div className="border-t border-stone-100 pt-4">
                      <MovementPlan deployment={deployment} workerName={person.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past Projects */}
      {pastProjects.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Past Projects</h2>
          <div className="space-y-2">
            {pastProjects.map((p) => (
              <div key={p.id} className="bg-white rounded-lg border border-stone-200 p-4 flex items-center justify-between gap-4 opacity-60">
                <div>
                  <div className="font-medium text-stone-800 text-sm">{p.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{p.client} · {p.location}</div>
                </div>
                <div className="text-xs text-stone-400 text-right shrink-0">
                  <div>{formatDate(p.startDate)}</div>
                  <div>→ {formatDate(p.endDate)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcomingProjects.length === 0 && pastProjects.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
          No projects on file for {person.name}.
        </div>
      )}
    </div>
  );
}
