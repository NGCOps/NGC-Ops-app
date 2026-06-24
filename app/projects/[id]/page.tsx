import {
  getProject, getProjects, getPeople, getPerson,
  getShiftPrepForProject, getDeploymentsForProject, deploymentHasTBD,
  getCertTypes, getCertificationsForWorker, isCertExpired, isCertExpiringSoon,
} from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import MovementPlan from "@/components/MovementPlan";

export function generateStaticParams() {
  const { getProjects } = require("@/lib/data");
  return getProjects().map((p: { id: string }) => ({ id: p.id }));
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-emerald-100 text-emerald-800" },
  complete: { label: "Complete", classes: "bg-slate-800 text-slate-400" },
  "on-hold": { label: "On Hold", classes: "bg-amber-100 text-amber-800" },
  upcoming: { label: "Upcoming", classes: "bg-blue-100 text-blue-800" },
};

const groupColors: Record<string, string> = {
  "ngc-management": "bg-[#1a3a5c]",
  "katc-supervisor": "bg-violet-700",
  "bc-parks": "bg-emerald-700",
  "env-tech": "bg-amber-600",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  if (!d) return "TBD";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function daysUntil(d: string): number {
  const target = new Date(d + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const people = getPeople();
  const shiftPrep = getShiftPrepForProject(id);
  const deployments = getDeploymentsForProject(id);
  const supervisor = getPerson(project.supervisorId);

  const workers = project.workerIds
    .map((wid) => people.find((p) => p.id === wid))
    .filter(Boolean);

  const certTypes = getCertTypes();
  const requiredCerts = (project.requiredCerts ?? [])
    .map((cid) => certTypes.find((ct) => ct.id === cid))
    .filter(Boolean);

  const cfg = statusConfig[project.status] ?? statusConfig.active;
  const daysToStart = daysUntil(project.startDate);
  const isStarted = daysToStart <= 0;
  const daysToEnd = daysUntil(project.endDate);

  // Onboarding summary
  let totalPending = 0;
  let totalComplete = 0;
  if (shiftPrep) {
    for (const ws of Object.values(shiftPrep.workerStatus)) {
      for (const cs of Object.values(ws)) {
        if (cs.status === "complete") totalComplete++;
        else totalPending++;
      }
    }
  }

  // Movement summary
  const tbdDeployments = deployments.filter(deploymentHasTBD);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-100 transition-colors">
        ← Projects
      </Link>

      {/* Header card */}
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.classes}`}>
                {cfg.label}
              </span>
            </div>
            <div className="text-slate-500 mt-1">{project.client}</div>
            <div className="text-sm text-slate-500 mt-0.5">{project.location}</div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-slate-200">
              {isStarted
                ? daysToEnd > 0 ? `${daysToEnd}d remaining` : "Complete"
                : `Starts in ${daysToStart}d`}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </div>
          </div>
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-slate-500 border-t border-slate-800 pt-4">{project.description}</p>
        )}

        {/* Status chips */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {shiftPrep && (
            totalPending > 0 ? (
              <span className="text-xs font-medium bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                ⚠ {totalPending} onboarding item{totalPending !== 1 ? "s" : ""} pending
              </span>
            ) : (
              <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                ✓ Onboarding clear
              </span>
            )
          )}
          {tbdDeployments.length > 0 ? (
            <span className="text-xs font-medium bg-red-100 text-red-800 px-3 py-1 rounded-full">
              ✗ {tbdDeployments.length} movement TBD
            </span>
          ) : deployments.length > 0 ? (
            <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              ✓ Movement sorted
            </span>
          ) : null}
          {supervisor && (
            <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
              Supervisor: {supervisor.name}
            </span>
          )}
        </div>
      </div>

      {/* Cert compliance matrix */}
      {requiredCerts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Certification Requirements</h2>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Header row */}
            <div className="grid border-b border-stone-100" style={{ gridTemplateColumns: `200px repeat(${workers.length}, 1fr)` }}>
              <div className="px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Cert / Training</div>
              {workers.map((w) => (
                <div key={w!.id} className="px-3 py-3 text-xs font-semibold text-stone-700 text-center border-l border-stone-100 truncate">{w!.name.split(" ")[0]}</div>
              ))}
            </div>
            {/* Cert rows */}
            {requiredCerts.map((ct, i) => (
              <div key={ct!.id} className={`grid border-b border-stone-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}`} style={{ gridTemplateColumns: `200px repeat(${workers.length}, 1fr)` }}>
                <div className="px-4 py-3 text-sm text-stone-700 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ct!.category === "compliance" ? "bg-blue-400" : ct!.category === "safety" ? "bg-amber-400" : "bg-stone-300"}`} />
                  {ct!.label}
                </div>
                {workers.map((w) => {
                  const certs = getCertificationsForWorker(w!.id);
                  const match = certs.find((c) => c.certTypeId === ct!.id);
                  const expired = match && isCertExpired(match);
                  const expiring = match && !expired && isCertExpiringSoon(match);
                  return (
                    <div key={w!.id} className="border-l border-stone-100 flex items-center justify-center py-3">
                      {!match ? (
                        <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Missing</span>
                      ) : expired ? (
                        <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Expired</span>
                      ) : expiring ? (
                        <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Expiring</span>
                      ) : (
                        <span className="text-lg">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Staff section */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Staff on this project
        </h2>

        {workers.length === 0 ? (
          <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700/50 p-6 text-center text-sm text-slate-500">
            No workers assigned yet.
          </div>
        ) : (
          <div className="space-y-4">
            {workers.map((worker) => {
              if (!worker) return null;
              const workerStatus = shiftPrep?.workerStatus[worker.id] ?? {};
              const deployment = deployments.find((d) => d.workerId === worker.id);
              const hasTBD = deployment ? deploymentHasTBD(deployment) : deployments.length === 0 ? false : true;

              const itemsPending = Object.values(workerStatus).filter(
                (cs) => cs.status === "pending" || cs.status === "expired"
              ).length;
              const itemsTotal = Object.values(workerStatus).length;

              return (
                <div key={worker.id} className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
                  {/* Worker header */}
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
                    <div className={`${groupColors[worker.group] ?? "bg-gray-400"} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}>
                      <span className="text-white text-sm font-semibold">{initials(worker.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/people/${worker.id}`} className="font-semibold text-slate-100 hover:text-slate-100 hover:underline">
                        {worker.name}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">{worker.role}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                      {deployment && (
                        <span className="text-xs text-slate-500">
                          {formatDate(deployment.shiftStart)} → {formatDate(deployment.shiftEnd)}
                        </span>
                      )}
                      {itemsTotal > 0 && (
                        itemsPending > 0 ? (
                          <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {itemsTotal - itemsPending}/{itemsTotal} onboarding done
                          </span>
                        ) : (
                          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            ✓ Onboarding clear
                          </span>
                        )
                      )}
                      {hasTBD && (
                        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Movement TBD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Onboarding checklist */}
                  {shiftPrep && shiftPrep.requirements.length > 0 && (
                    <div className="px-5 py-4 border-b border-slate-800">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Onboarding</div>
                      <OnboardingChecklist
                        projectId={project.id}
                        projectName={project.name}
                        shiftStart={deployment?.shiftStart ?? project.startDate}
                        workerId={worker.id}
                        requirements={shiftPrep.requirements}
                        workerStatus={workerStatus}
                      />
                    </div>
                  )}

                  {/* Movement plan */}
                  {deployment && (
                    <div className="px-5 py-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Movement</div>
                      <MovementPlan deployment={deployment} workerName={worker.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
