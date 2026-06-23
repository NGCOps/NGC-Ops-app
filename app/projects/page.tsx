import {
  getProjects, getPeople, getShiftPrep, getDeployments, deploymentHasTBD,
} from "@/lib/data";
import Link from "next/link";
import { projectColor } from "@/lib/colors";

function fmt(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
function daysUntil(d: string) {
  const t = new Date(d + "T12:00:00").getTime();
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t - n.getTime()) / 86400000);
}

export default function ProjectsPage() {
  const projects = getProjects();
  const people = getPeople();
  const shiftPreps = getShiftPrep();
  const deployments = getDeployments();

  const today = new Date(); today.setHours(0,0,0,0);

  const active = projects.filter((p) => p.status === "active" && new Date(p.endDate + "T12:00:00") >= today);
  const upcoming = projects.filter((p) => p.status === "upcoming");
  const complete = projects.filter((p) => p.status === "complete" || new Date(p.endDate + "T12:00:00") < today);

  let totalOnboardingPending = 0, totalMovementTBD = 0;
  for (const sp of shiftPreps)
    for (const ws of Object.values(sp.workerStatus))
      for (const cs of Object.values(ws))
        if (cs.status === "pending" || cs.status === "expired") totalOnboardingPending++;

  const upcomingDeps = deployments.filter((d) => new Date(d.shiftEnd + "T12:00:00") >= today);
  totalMovementTBD = upcomingDeps.filter(deploymentHasTBD).length;

  function ProjectCard({ project }: { project: typeof projects[0] }) {
    const col = projectColor(project.id);
    const workers = project.workerIds.map((id) => people.find((p) => p.id === id)).filter(Boolean);
    const daysToStart = daysUntil(project.startDate);
    const daysToEnd = daysUntil(project.endDate);
    const isStarted = daysToStart <= 0;
    const statusLabel = isStarted ? `${daysToEnd}d left` : `Starts in ${daysToStart}d`;

    return (
      <Link href={`/projects/${project.id}`}>
        <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 hover:border-stone-300 hover:bg-stone-50 transition-all cursor-pointer" style={{ borderLeftWidth: "4px", borderLeftColor: col.border }}>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-stone-900">{project.name}</div>
            <div className="text-sm text-stone-500 truncate">{project.client}</div>
            <div className="text-xs text-stone-400 mt-0.5">{fmtShort(project.startDate)} → {fmtShort(project.endDate)}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-stone-600">{statusLabel}</div>
            <div className="text-xs text-stone-400 mt-0.5">{workers.length} worker{workers.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="text-stone-300 shrink-0">›</div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Projects</h1>
        <p className="text-sm text-stone-400 mt-1">{active.length} active</p>
      </div>

      {(totalOnboardingPending > 0 || totalMovementTBD > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {totalOnboardingPending > 0 && (
            <Link href="/shift-prep">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100/50 transition-colors">
                <div className="text-2xl font-bold text-amber-600">{totalOnboardingPending}</div>
                <div className="text-sm font-medium text-amber-700 mt-0.5">Onboarding items pending</div>
                <div className="text-xs text-stone-400 mt-1">View onboarding →</div>
              </div>
            </Link>
          )}
          {totalMovementTBD > 0 && (
            <Link href="/logistics">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100/50 transition-colors">
                <div className="text-2xl font-bold text-red-600">{totalMovementTBD}</div>
                <div className="text-sm font-medium text-red-700 mt-0.5">Movements unplanned</div>
                <div className="text-xs text-stone-400 mt-1">View movement →</div>
              </div>
            </Link>
          )}
        </div>
      )}

      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Active</h2>
        <div className="space-y-3">
          {active.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-300 uppercase tracking-widest mb-3">Past / Complete</h2>
          <div className="space-y-2">
            {complete.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="bg-white rounded-lg border border-stone-100 px-5 py-3 flex items-center justify-between opacity-50 hover:opacity-70 transition-opacity">
                  <div>
                    <span className="font-medium text-stone-700 text-sm">{project.name}</span>
                    <span className="text-stone-400 text-sm ml-2">· {project.client}</span>
                  </div>
                  <span className="text-xs text-stone-400">{fmt(project.startDate)} → {fmt(project.endDate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
