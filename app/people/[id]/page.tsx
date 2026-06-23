import {
  getPerson, getPeople, getProjectsForPerson, getProject,
  getCertificationsForWorker, getCertTypes, isCertExpired, isCertExpiringSoon,
  getShiftPrepForProject, getDeploymentsForWorker, deploymentHasTBD,
} from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PersonGroup } from "@/lib/data";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import CertEditor from "@/components/CertEditor";
import MovementPlan from "@/components/MovementPlan";

const groupColors: Record<PersonGroup, string> = {
  "ngc-management": "bg-[#1a3a5c]",
  "katc-supervisor": "bg-violet-700",
  "bc-parks": "bg-emerald-700",
  "env-tech": "bg-amber-600",
};

const groupLabels: Record<PersonGroup, string> = {
  "ngc-management": "NGC Management",
  "katc-supervisor": "KATC Supervisor",
  "bc-parks": "BC Parks Staff",
  "env-tech": "Environmental Tech",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export function generateStaticParams() {
  const { getPeople } = require("@/lib/data");
  return getPeople().map((p: { id: string }) => ({ id: p.id }));
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = getPerson(id);
  if (!person) notFound();

  const certTypes = getCertTypes();
  const masterCerts = getCertificationsForWorker(id);
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

  const avatarColor = groupColors[person.group] ?? "bg-[#1a3a5c]";

  return (
    <div className="space-y-6">
      <Link href="/people" className="text-sm text-slate-500 hover:text-slate-100 transition-colors">
        ← People
      </Link>

      {/* Header */}
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-start gap-4">
          <div className={`${avatarColor} w-14 h-14 rounded-full flex items-center justify-center shrink-0`}>
            <span className="text-white text-xl font-bold">{initials(person.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-100">{person.name}</h1>
                <div className="text-slate-500 mt-0.5">{person.role}</div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">{person.company}</span>
                  <span className="text-xs font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {groupLabels[person.group]}
                  </span>
                </div>
              </div>
              {alertCount > 0 && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  ⚠ {alertCount} cert{alertCount !== 1 ? "s" : ""} need attention
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</div>
            {person.email ? (
              <a href={`mailto:${person.email}`} className="text-sm text-slate-100 hover:underline">{person.email}</a>
            ) : <span className="text-sm text-slate-600 italic">Not on file</span>}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</div>
            {person.phone ? (
              <a href={`tel:${person.phone}`} className="text-sm text-slate-300 hover:underline">{person.phone}</a>
            ) : <span className="text-sm text-slate-600 italic">Not on file</span>}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Hourly Rate</div>
            {person.hourlyRate ? (
              <span className="text-sm font-medium text-slate-200">${person.hourlyRate}/hr</span>
            ) : <span className="text-sm text-slate-600 italic">Not on file</span>}
          </div>
        </div>
      </div>

      {/* Certifications */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Certifications</h2>
          <Link href="/certifications" className="text-xs text-slate-100 hover:underline">View all →</Link>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-4">
          <CertEditor workerId={id} certTypes={certTypes} existing={masterCerts} />
        </div>
      </section>

      {/* Upcoming Projects + Onboarding */}
      {upcomingProjects.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Upcoming Projects</h2>
          <div className="space-y-4">
            {upcomingProjects.map((p) => {
              const shiftPrep = getShiftPrepForProject(p.id);
              const workerStatus = shiftPrep?.workerStatus[id] ?? {};
              const deployment = deployments.find((d) => d.projectId === p.id);
              const shiftStart = deployment?.shiftStart ?? p.startDate;
              const hasTBDMovement = deployment ? deploymentHasTBD(deployment) : true;

              return (
                <div key={p.id} className="bg-slate-900 rounded-xl border border-slate-700/50 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-100">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.client} · {p.location}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(p.startDate)} → {formatDate(p.endDate)}
                      </div>
                    </div>
                    {hasTBDMovement && (
                      <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">Movement TBD</span>
                    )}
                  </div>

                  {/* Onboarding checklist */}
                  {shiftPrep && shiftPrep.requirements.length > 0 && (
                    <div className="border-t border-slate-800 pt-4">
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

                  {/* Movement plan */}
                  {deployment && (
                    <div className="border-t border-slate-800 pt-4">
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
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Past Projects</h2>
          <div className="space-y-2">
            {pastProjects.map((p) => (
              <div key={p.id} className="bg-slate-900 rounded-lg border border-slate-800 p-4 flex items-center justify-between gap-4 opacity-60">
                <div>
                  <div className="font-medium text-slate-300 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.client} · {p.location}</div>
                </div>
                <div className="text-xs text-slate-500 text-right shrink-0">
                  <div>{formatDate(p.startDate)}</div>
                  <div>→ {formatDate(p.endDate)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcomingProjects.length === 0 && pastProjects.length === 0 && (
        <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700/50 p-8 text-center text-sm text-slate-500">
          No projects on file for {person.name}.
        </div>
      )}
    </div>
  );
}
