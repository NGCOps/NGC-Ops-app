import {
  getPeople, getShiftPrep,
} from "@/lib/data";
import { dbGetProjects, dbGetCertTypes, dbGetAllCertifications } from "@/lib/db-data";
import type { Certification } from "@/lib/data";
import Link from "next/link";
import { clientColor } from "@/lib/colors";
import AddProjectModal from "@/components/AddProjectModal";
import RequiredCertsButton from "@/components/RequiredCertsButton";

export const dynamic = "force-dynamic";

function fmtShort(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
function daysUntil(d: string) {
  const t = new Date(d + "T12:00:00").getTime();
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t - n.getTime()) / 86400000);
}

export default async function ProjectsPage() {
  const [projects, certTypes, allCerts] = await Promise.all([
    dbGetProjects(), dbGetCertTypes(), dbGetAllCertifications(),
  ]);
  const people = getPeople();
  const shiftPreps = getShiftPrep();

  const certsByWorker: Record<string, Certification[]> = {};
  for (const c of allCerts) {
    (certsByWorker[c.workerId] ??= []).push(c);
  }

  const today = new Date(); today.setHours(0,0,0,0);

  const active = projects.filter((p) => p.status === "active" && new Date(p.endDate + "T12:00:00") >= today);
  const upcoming = projects.filter((p) => p.status === "upcoming");
  const complete = projects.filter((p) => p.status === "complete" || new Date(p.endDate + "T12:00:00") < today);

  function ProjectCard({ project }: { project: typeof projects[0] }) {
    const col = clientColor(project.client || "");
    const workers = project.workerIds.map((id) => people.find((p) => p.id === id)).filter(Boolean);
    const daysToStart = daysUntil(project.startDate);
    const daysToEnd = daysUntil(project.endDate);
    const isStarted = daysToStart <= 0;
    const statusLabel = isStarted ? `${daysToEnd}d left` : `Starts in ${daysToStart}d`;

    const sp = shiftPreps.find((s) => s.projectId === project.id);
    let onboardingPending = 0;
    if (sp) {
      for (const ws of Object.values(sp.workerStatus))
        for (const cs of Object.values(ws))
          if (cs.status === "pending" || cs.status === "expired") onboardingPending++;
    }

    const requiredCertTypes = (project.requiredCerts ?? [])
      .map((cid) => certTypes.find((ct) => ct.id === cid))
      .filter(Boolean) as typeof certTypes;

    return (
      <Link href={`/projects/${project.id}`}>
        <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col gap-2 hover:bg-stone-50 hover:border-stone-300 transition-all cursor-pointer h-full" style={{ borderLeftWidth: "4px", borderLeftColor: col.border }}>
          <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-stone-900 text-sm leading-snug">{project.name}</div>
              <div className="text-xs text-stone-500 mt-0.5 truncate">{project.client}</div>
            </div>
            <span
              title={project.requiredCerts?.length ? `${project.name} — cert requirements defined` : `${project.name} — no special certs required`}
              className="mt-0.5 shrink-0 w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: project.requiredCerts?.length ? col.border : "#22c55e" }}
            />
          </div>
          <div className="flex items-end justify-between mt-1">
            <div className="text-xs text-stone-400">{fmtShort(project.startDate)} → {fmtShort(project.endDate)}</div>
            <div className="text-right">
              <div className="text-xs font-semibold" style={{ color: col.bg }}>{statusLabel}</div>
              <div className="text-xs text-stone-400">{workers.length} worker{workers.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          {(onboardingPending > 0 || requiredCertTypes.length > 0) && (
            <div className="flex items-start gap-1.5 flex-wrap pt-2 border-t border-stone-100">
              {onboardingPending > 0 && (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-200">⚠ {onboardingPending} onboarding</span>
              )}
              {requiredCertTypes.length > 0 && (
                <RequiredCertsButton requiredCerts={requiredCertTypes} workers={workers as { id: string; name: string }[]} certsByWorker={certsByWorker} />
              )}
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Projects</h1>
          <p className="text-sm text-stone-400 mt-1">{active.length} active</p>
        </div>
        <AddProjectModal />
      </div>

      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Active</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-300 uppercase tracking-widest mb-3">Past / Complete</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {complete.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
