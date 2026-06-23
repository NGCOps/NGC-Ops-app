import Link from "next/link";
import {
  getProjects, getPeople, getShiftPrep, getDeployments, deploymentHasTBD,
  getCertificationsForWorker, isCertExpired, isCertExpiringSoon,
} from "@/lib/data";
import type { Deployment } from "@/lib/data";
import OutstandingSection from "@/components/OutstandingSection";
import { projectColor } from "@/lib/colors";

const LEG_STATUS_COLOR: Record<string, string> = {
  confirmed: "#10b981",
  complete:  "#d6d3d1",
  tbd:       "#ef4444",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function toDate(s: string) { return new Date(s + "T12:00:00"); }

function fmt(d: string) {
  return toDate(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function daysUntil(d: string) {
  const t = toDate(d).getTime();
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t - n.getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Schedule Gantt ──────────────────────────────────────────────────────────

function ScheduleGantt({ deployments, projects, people }: {
  deployments: Deployment[];
  projects: ReturnType<typeof getProjects>;
  people: ReturnType<typeof getPeople>;
}) {
  if (deployments.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const allDates: Date[] = [today];
  for (const dep of deployments) {
    allDates.push(toDate(dep.shiftStart), toDate(dep.shiftEnd));
    for (const leg of dep.legs) if (leg.date) allDates.push(toDate(leg.date));
    if (dep.hotel.checkIn) allDates.push(toDate(dep.hotel.checkIn));
    if (dep.hotel.checkOut) allDates.push(toDate(dep.hotel.checkOut));
  }
  const rangeStart = addDays(new Date(Math.min(...allDates.map((d) => d.getTime()))), -2);
  const rangeEnd   = addDays(new Date(Math.max(...allDates.map((d) => d.getTime()))), 3);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  function pct(d: Date | string): number {
    const ms = (typeof d === "string" ? toDate(d) : d).getTime();
    return Math.max(0, Math.min(100, ((ms - rangeStart.getTime()) / totalMs) * 100));
  }

  const ticks: { label: string; p: number }[] = [];
  const totalDays = totalMs / 86400000;
  const step = totalDays > 28 ? 7 : totalDays > 14 ? 3 : 2;
  const cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    ticks.push({ label: cur.toLocaleDateString("en-CA", { month: "short", day: "numeric" }), p: pct(cur) });
    cur.setDate(cur.getDate() + step);
  }

  const todayPct = pct(today);
  const workerIds = [...new Set(deployments.map((d) => d.workerId))];

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100">
        <h2 className="font-semibold text-stone-800 text-sm">Schedule</h2>
        <div className="flex gap-4 mt-2 flex-wrap">
          {[...new Map(deployments.map((d) => [d.projectId, projects.find((p) => p.id === d.projectId)])).entries()]
            .filter(([, p]) => p)
            .map(([id, p]) => {
              const col = projectColor(id);
              return (
                <div key={id} className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: col.border }} />
                  <span className="text-[10px] text-stone-400">{p!.name}</span>
                </div>
              );
            })}
          {[
            { color: "#7c3aed", label: "Hotel" },
            { color: "#10b981", label: "Transport confirmed" },
            { color: "#ef4444", label: "Transport TBD" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] text-stone-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="relative h-5 ml-28 mb-2 border-b border-stone-100">
            {ticks.map((t, i) => (
              <span key={i} className="absolute text-[10px] text-stone-400 -translate-x-1/2 bottom-1" style={{ left: `${t.p}%` }}>
                {t.label}
              </span>
            ))}
            <span className="absolute text-[10px] text-amber-500 font-semibold -translate-x-1/2 bottom-1" style={{ left: `${todayPct}%` }}>
              ▼
            </span>
          </div>

          <div className="space-y-3">
            {workerIds.map((workerId) => {
              const worker = people.find((p) => p.id === workerId);
              const workerDeps = deployments.filter((d) => d.workerId === workerId);

              return (
                <div key={workerId} className="flex items-center gap-3">
                  <Link href={`/people/${workerId}`} className="w-28 shrink-0 flex items-center gap-1.5 group">
                    <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">{initials(worker?.name ?? workerId)}</span>
                    </div>
                    <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900 truncate leading-tight">
                      {worker?.name?.split(" ")[0] ?? workerId}
                      {worker?.name?.split(" ")[1] ? (
                        <><br /><span className="text-stone-400 font-normal">{worker.name.split(" ")[1]}</span></>
                      ) : null}
                    </span>
                  </Link>

                  <div className="relative flex-1" style={{ height: "54px" }}>
                    <div className="absolute inset-y-2 left-0 right-0 rounded" style={{ backgroundColor: "#ede8e0" }} />

                    {todayPct >= 0 && todayPct <= 100 && (
                      <div className="absolute inset-y-0 w-px z-20" style={{ left: `${todayPct}%`, backgroundColor: "#f59e0b" }} />
                    )}

                    {workerDeps.map((dep) => {
                      const col = projectColor(dep.projectId);
                      const project = projects.find((p) => p.id === dep.projectId);
                      const sL = pct(dep.shiftStart);
                      const sR = pct(dep.shiftEnd);
                      const sW = Math.max(sR - sL, 0.5);

                      const hotelL = dep.hotel.needed && dep.hotel.checkIn ? pct(dep.hotel.checkIn) : null;
                      const hotelR = dep.hotel.needed && dep.hotel.checkOut ? pct(dep.hotel.checkOut) : null;

                      const shiftMidMs = (toDate(dep.shiftStart).getTime() + toDate(dep.shiftEnd).getTime()) / 2;
                      const outLegs = dep.legs.filter((l) => !l.date || toDate(l.date).getTime() <= shiftMidMs);
                      const retLegs = dep.legs.filter((l) => l.date && toDate(l.date).getTime() > shiftMidMs);

                      const outStatus = outLegs.length === 0 ? null
                        : outLegs.some((l) => l.status === "tbd") ? "tbd"
                        : outLegs.every((l) => l.status === "complete") ? "complete"
                        : "confirmed";
                      const retStatus = retLegs.length === 0 ? null
                        : retLegs.some((l) => l.status === "tbd") ? "tbd"
                        : retLegs.every((l) => l.status === "complete") ? "complete"
                        : "confirmed";

                      return (
                        <Link key={dep.id} href={`/projects/${dep.projectId}`} className="block">
                          <div
                            className="absolute rounded flex items-center overflow-hidden"
                            style={{
                              top: "6px", height: "28px",
                              left: `${sL}%`, width: `${sW}%`,
                              backgroundColor: col.bg,
                              border: `1px solid ${col.border}`,
                              opacity: 0.9,
                            }}
                            title={`${project?.name}: ${fmt(dep.shiftStart)} → ${fmt(dep.shiftEnd)}`}
                          >
                            <span className="text-[10px] font-semibold px-1.5 truncate" style={{ color: col.text }}>
                              {project?.name}
                            </span>
                            {outStatus && (
                              <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l" style={{ backgroundColor: LEG_STATUS_COLOR[outStatus] }} />
                            )}
                            {retStatus && (
                              <div className="absolute right-0 top-0 bottom-0 w-2 rounded-r" style={{ backgroundColor: LEG_STATUS_COLOR[retStatus] }} />
                            )}
                          </div>

                          {hotelL !== null && hotelR !== null && (
                            <div
                              className="absolute rounded-sm"
                              style={{
                                bottom: "6px", height: "6px",
                                left: `${hotelL}%`,
                                width: `${Math.max(hotelR - hotelL, 0.5)}%`,
                                backgroundColor: "#7c3aed",
                                opacity: 0.85,
                              }}
                              title={`Hotel: ${dep.hotel.name || "TBD"} (${dep.hotel.checkIn} → ${dep.hotel.checkOut})`}
                            />
                          )}

                          {dep.legs.filter((l) => l.date).map((leg) => (
                            <div
                              key={leg.id}
                              className="absolute rounded-full z-10"
                              style={{
                                top: "8px", width: "8px", height: "8px",
                                left: `calc(${pct(leg.date)}% - 4px)`,
                                backgroundColor: LEG_STATUS_COLOR[leg.status],
                                border: "2px solid rgba(255,255,255,0.6)",
                              }}
                              title={`${leg.from} → ${leg.to} (${leg.status})`}
                            />
                          ))}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeProjects
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .map((p) => {
              const col = projectColor(p.id);
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
                  <div
                    className="rounded-xl border border-stone-200 p-4 hover:bg-stone-50 transition-colors cursor-pointer bg-white"
                    style={{ borderLeftWidth: "4px", borderLeftColor: col.border }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-stone-900">{p.name}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{p.client}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-stone-700">
                          {isStarted ? `${daysLeft}d left` : `${daysToStart}d away`}
                        </div>
                        <div className="text-[10px] text-stone-400">{fmt(p.startDate)} → {fmt(p.endDate)}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {p.workerIds.length > 0 && (
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                          {p.workerIds.length} worker{p.workerIds.length !== 1 ? "s" : ""}
                        </span>
                      )}
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
