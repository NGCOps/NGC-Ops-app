import {
  getProject, getProjects, getPeople, getPerson,
  getDeploymentsForProject, deploymentHasTBD,
  getCertTypes, getCertificationsForWorker,
} from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";
import CertMatrix from "@/components/CertMatrix";

export function generateStaticParams() {
  const { getProjects } = require("@/lib/data");
  return getProjects().map((p: { id: string }) => ({ id: p.id }));
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active:   { label: "Active",    classes: "bg-emerald-100 text-emerald-800" },
  complete: { label: "Complete",  classes: "bg-stone-100 text-stone-500" },
  "on-hold":{ label: "On Hold",   classes: "bg-amber-100 text-amber-800" },
  upcoming: { label: "Upcoming",  classes: "bg-blue-100 text-blue-800" },
};

function formatDate(d: string) {
  if (!d) return "TBD";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function daysUntil(d: string): number {
  const target = new Date(d + "T12:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const people = getPeople();
  const deployments = getDeploymentsForProject(id);
  const supervisor = getPerson(project.supervisorId);
  const certTypes = getCertTypes();

  const workers = project.workerIds
    .map((wid) => people.find((p) => p.id === wid))
    .filter(Boolean) as NonNullable<ReturnType<typeof people.find>>[];

  const requiredCerts = (project.requiredCerts ?? [])
    .map((cid) => certTypes.find((ct) => ct.id === cid))
    .filter(Boolean) as NonNullable<ReturnType<typeof certTypes.find>>[];

  const certsByWorker: Record<string, ReturnType<typeof getCertificationsForWorker>> = {};
  for (const w of workers) {
    certsByWorker[w.id] = getCertificationsForWorker(w.id);
  }

  const tbdDeployments = deployments.filter(deploymentHasTBD);
  const cfg = statusConfig[project.status] ?? statusConfig.active;
  const daysToStart = daysUntil(project.startDate);
  const isStarted = daysToStart <= 0;
  const daysToEnd = daysUntil(project.endDate);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
        ← Projects
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-stone-900">{project.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.classes}`}>{cfg.label}</span>
            </div>
            <div className="text-stone-500 mt-1">{project.client}</div>
            <div className="text-sm text-stone-400 mt-0.5">{project.location}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-stone-700">
              {isStarted ? (daysToEnd > 0 ? `${daysToEnd}d remaining` : "Complete") : `Starts in ${daysToStart}d`}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </div>
          </div>
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-stone-500 border-t border-stone-100 pt-4">{project.description}</p>
        )}

        <div className="mt-4 flex gap-2 flex-wrap">
          {tbdDeployments.length > 0 ? (
            <span className="text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">
              ✗ {tbdDeployments.length} movement TBD
            </span>
          ) : deployments.length > 0 ? (
            <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
              ✓ Movement sorted
            </span>
          ) : null}
          {supervisor && (
            <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">
              Supervisor: {supervisor.name}
            </span>
          )}
        </div>
      </div>

      {/* Team */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Team</h2>
        <div className="flex flex-wrap gap-2">
          {workers.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No workers assigned yet.</p>
          ) : workers.map((w) => (
            <Link key={w.id} href={`/people/${w.id}`}
              className="flex items-center gap-2 bg-white border border-stone-200 rounded-full px-3 py-1.5 hover:border-stone-300 hover:bg-stone-50 transition-all text-sm font-medium text-stone-700">
              <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {w.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </span>
              {w.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Cert compliance matrix */}
      {requiredCerts.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Certification Requirements</h2>
          <CertMatrix
            workers={workers.map((w) => ({ id: w.id, name: w.name }))}
            requiredCerts={requiredCerts}
            certsByWorker={certsByWorker}
          />
          <p className="text-xs text-stone-400 mt-2">Click any cell to update a cert record.</p>
        </section>
      ) : (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Certification Requirements</h2>
          <div className="bg-white rounded-xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-400">
            No cert requirements defined for this project yet.
          </div>
        </section>
      )}
    </div>
  );
}
