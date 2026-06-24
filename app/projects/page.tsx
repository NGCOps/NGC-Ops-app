import {
  getProjects, getPeople, getShiftPrep, getDeployments, deploymentHasTBD,
} from "@/lib/data";
import Link from "next/link";
import { projectColor } from "@/lib/colors";
import AddProjectModal from "@/components/AddProjectModal";

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
        <div className="rounded-xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity cursor-pointer h-full" style={{ backgroundColor: col.bg }}>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white text-sm leading-snug">{project.name}</div>
            <div className="text-xs mt-1 truncate" style={{ color: col.text }}>{project.client}</div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="text-xs" style={{ color: col.text }}>{fmtShort(project.startDate)} → {fmtShort(project.endDate)}</div>
            <div className="text-right">
              <div className="text-white text-xs font-semibold">{statusLabel}</div>
              <div className="text-xs" style={{ color: col.text }}>{workers.length} worker{workers.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen rounded-2xl p-6 space-y-8" style={{ backgroundColor: "#1e3829" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{active.length} active</p>
        </div>
        <AddProjectModal />
      </div>

      {(totalOnboardingPending > 0 || totalMovementTBD > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {totalOnboardingPending > 0 && (
            <Link href="/shift-prep">
              <div className="rounded-xl p-4 hover:opacity-90 transition-opacity" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <div className="text-2xl font-bold text-amber-400">{totalOnboardingPending}</div>
                <div className="text-sm font-medium text-white mt-0.5">Onboarding items pending</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>View onboarding →</div>
              </div>
            </Link>
          )}
          {totalMovementTBD > 0 && (
            <Link href="/logistics">
              <div className="rounded-xl p-4 hover:opacity-90 transition-opacity" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <div className="text-2xl font-bold text-red-400">{totalMovementTBD}</div>
                <div className="text-sm font-medium text-white mt-0.5">Movements unplanned</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>View movement →</div>
              </div>
            </Link>
          )}
        </div>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Active</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Past / Complete</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {complete.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
