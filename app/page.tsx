import Link from "next/link";
import {
  getProjects, getPeople, getShiftPrep, getDeployments, deploymentHasTBD,
  getCertificationsForWorker, isCertExpired, isCertExpiringSoon,
} from "@/lib/data";
import OutstandingSection from "@/components/OutstandingSection";
import ScheduleGantt from "@/components/ScheduleGantt";
import { clientColor } from "@/lib/colors";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(s: string) { return new Date(s + "T12:00:00"); }

function fmt(d: string) {
  return toDate(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function daysUntil(d: string) {
  const t = toDate(d).getTime();
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t - n.getTime()) / 86400000);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const projects = getProjects();
  const people = getPeople();
  const shiftPreps = getShiftPrep();
  const deployments = getDeployments();

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const activeProjects = projects.filter(
    (p) => p.status === "active" && new Date(p.endDate + "T12:00:00") >= today
  );
  const upcomingDeployments = deployments.filter((d) => new Date(d.shiftEnd + "T12:00:00") >= today);

  // ── To-do: Movement TBD ──────────────────────────────────────────────────
  const movementTodos: { workerName: string; workerId: string; projectName: string; projectId: string; projectStartDate: string; projectEndDate: string }[] = [];
  for (const dep of upcomingDeployments) {
    if (deploymentHasTBD(dep)) {
      const worker = people.find((p) => p.id === dep.workerId);
      const project = projects.find((p) => p.id === dep.projectId);
      movementTodos.push({
        workerId: dep.workerId,
        workerName: worker?.name ?? dep.workerId,
        projectName: project?.name ?? dep.projectId,
        projectId: dep.projectId,
        projectStartDate: project?.startDate ?? dep.shiftStart,
        projectEndDate: project?.endDate ?? dep.shiftEnd,
      });
    }
  }

  // ── To-do: Hotel not booked ───────────────────────────────────────────────
  const hotelTodos: { workerName: string; workerId: string; projectName: string; projectId: string; projectStartDate: string; projectEndDate: string }[] = [];
  for (const dep of upcomingDeployments) {
    if (dep.hotel.needed && !dep.hotel.checkIn) {
      const worker = people.find((p) => p.id === dep.workerId);
      const project = projects.find((p) => p.id === dep.projectId);
      hotelTodos.push({
        workerId: dep.workerId,
        workerName: worker?.name ?? dep.workerId,
        projectName: project?.name ?? dep.projectId,
        projectId: dep.projectId,
        projectStartDate: project?.startDate ?? dep.shiftStart,
        projectEndDate: project?.endDate ?? dep.shiftEnd,
      });
    }
  }

  // ── To-do: Onboarding ────────────────────────────────────────────────────
  type OnboardingTodo = {
    workerId: string; workerName: string;
    projectId: string; projectName: string;
    label: string; status: string;
    deadlineDate: string; category: string;
    projectStartDate: string; projectEndDate: string;
  };
  const onboardingTodos: OnboardingTodo[] = [];
  for (const sp of shiftPreps) {
    const project = projects.find((p) => p.id === sp.projectId);
    if (!project) continue;
    for (const [workerId, workerStatus] of Object.entries(sp.workerStatus)) {
      const worker = people.find((p) => p.id === workerId);
      for (const req of sp.requirements) {
        const cs = workerStatus[req.id];
        if (!cs || cs.status === "complete" || cs.status === "na") continue;
        const deadlineDate = req.daysBeforeStart
          ? (() => {
              const d = toDate(project.startDate);
              d.setDate(d.getDate() - req.daysBeforeStart);
              return d.toISOString().slice(0, 10);
            })()
          : project.startDate;
        onboardingTodos.push({
          workerId,
          workerName: worker?.name ?? workerId,
          projectId: sp.projectId,
          projectName: project.name,
          label: req.label,
          status: cs.status,
          deadlineDate,
          category: req.category,
          projectStartDate: project.startDate,
          projectEndDate: project.endDate,
        });
      }
    }
  }

  // ── To-do: Cert alerts ────────────────────────────────────────────────────
  const certTodos: { workerId: string; workerName: string; certLabel: string; expiryDate: string; isExpired: boolean }[] = [];
  for (const p of people.filter((p) => p.type === "field" || p.type === "supervisor")) {
    for (const cert of getCertificationsForWorker(p.id)) {
      if (isCertExpired(cert) || isCertExpiringSoon(cert)) {
        certTodos.push({
          workerId: p.id, workerName: p.name,
          certLabel: cert.certTypeId, expiryDate: cert.expiryDate ?? "",
          isExpired: isCertExpired(cert),
        });
      }
    }
  }

  const totalTodos = movementTodos.length + hotelTodos.length + onboardingTodos.length + certTodos.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">NGC Ops</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            Nisga&apos;a Growth Corporation
            <span className="mx-1.5 text-stone-300">·</span>
            {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        {totalTodos > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600">{totalTodos}</div>
            <div className="text-xs text-stone-400">items need attention</div>
          </div>
        )}
      </div>

      {/* Schedule Gantt */}
      {upcomingDeployments.length > 0 && (
        <ScheduleGantt
          deployments={upcomingDeployments}
          projects={projects}
          people={people}
        />
      )}

      {/* Active Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Active Projects</h2>
          <Link href="/projects" className="text-xs text-[#1e3829] hover:underline font-medium">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeProjects
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .map((p) => {
              const col = clientColor(p.client);
              const sp = shiftPreps.find((s) => s.projectId === p.id);
              const projDeps = upcomingDeployments.filter((d) => d.projectId === p.id);

              let onboardingPending = 0;
              if (sp) {
                for (const ws of Object.values(sp.workerStatus))
                  for (const cs of Object.values(ws))
                    if (cs.status === "pending" || cs.status === "expired") onboardingPending++;
              }
              const movementTBD = projDeps.filter(deploymentHasTBD).length;
              const daysToStart = daysUntil(p.startDate);
              const isStarted = daysToStart <= 0;
              const daysLeft = daysUntil(p.endDate);

              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col gap-2 hover:bg-stone-50 hover:border-stone-300 transition-all cursor-pointer h-full" style={{ borderLeftWidth: "4px", borderLeftColor: col.border }}>
                    <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 text-sm leading-snug">{p.name}</div>
                        <div className="text-xs text-stone-500 mt-0.5 truncate">{p.client}</div>
                      </div>
                      <span
                        title={p.requiredCerts?.length ? `${p.name} — cert requirements defined` : `${p.name} — no special certs required`}
                        className="mt-0.5 shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.requiredCerts?.length ? col.border : "#22c55e" }}
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-xs text-stone-400">{fmt(p.startDate)} → {fmt(p.endDate)}</div>
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: col.bg }}>
                          {isStarted ? `${daysLeft}d left` : `Starts in ${daysToStart}d`}
                        </div>
                        <div className="text-xs text-stone-400">{p.workerIds.length} worker{p.workerIds.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    {(onboardingPending > 0 || sp || movementTBD > 0 || projDeps.length > 0) && (
                      <div className="flex gap-1.5 flex-wrap pt-2 border-t border-stone-100">
                        {onboardingPending > 0 ? (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-200">⚠ {onboardingPending} onboarding</span>
                        ) : sp ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">✓ Onboarding clear</span>
                        ) : null}
                        {movementTBD > 0 ? (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-200">✗ {movementTBD} movement TBD</span>
                        ) : projDeps.length > 0 ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">✓ Movement sorted</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {/* Outstanding */}
      {totalTodos > 0 ? (
        <OutstandingSection
          movementTodos={movementTodos}
          hotelTodos={hotelTodos}
          onboardingTodos={onboardingTodos}
          certTodos={certTodos}
        />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <div className="text-emerald-700 font-semibold">All clear</div>
          <div className="text-stone-400 text-sm mt-1">No outstanding items.</div>
        </div>
      )}
    </div>
  );
}
