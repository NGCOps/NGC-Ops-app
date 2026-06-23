import { getDeployments, getProjects, getPeople, deploymentHasTBD } from "@/lib/data";
import type { Deployment, Leg } from "@/lib/data";
import MovementPlan from "@/components/MovementPlan";
import Link from "next/link";

function fmt(d: string) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function fmtFull(d: string) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const legTypeConfig: Record<string, { label: string; icon: string }> = {
  self: { label: "Self-drive", icon: "🚘" },
  "ngc-drive": { label: "NGC Drive", icon: "🚙" },
  "external-carpool": { label: "Carpool", icon: "🤝" },
  flight: { label: "Flight", icon: "✈️" },
  bus: { label: "Bus", icon: "🚌" },
  other: { label: "Other", icon: "🚐" },
};

const legStatusColor: Record<string, string> = {
  confirmed: "bg-emerald-500",
  complete: "bg-gray-300",
  tbd: "bg-red-400",
};

const legStatusBadge: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  complete: "bg-slate-800 text-slate-500",
  tbd: "bg-red-100 text-red-700",
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateToNum(d: string): number {
  return new Date(d + "T12:00:00").getTime();
}

// Build a timeline component showing all deployments across a date range
function Timeline({ deployments, projects, people }: {
  deployments: Deployment[];
  projects: ReturnType<typeof getProjects>;
  people: ReturnType<typeof getPeople>;
}) {
  if (deployments.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate date range: 3 days before today to max end date or 5 weeks out
  const allDates = deployments.flatMap((d) => [d.shiftStart, d.shiftEnd]).filter(Boolean);
  const maxDate = allDates.reduce((max, d) => (d > max ? d : max), allDates[0]);
  const endDateRaw = new Date(maxDate + "T12:00:00");
  const rangeEnd = addDays(endDateRaw, 3);
  const rangeStart = addDays(today, -2);

  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  function pct(d: string | Date): number {
    const ms = (typeof d === "string" ? new Date(d + "T12:00:00") : d).getTime();
    return Math.max(0, Math.min(100, ((ms - rangeStart.getTime()) / totalMs) * 100));
  }

  // Build day labels
  const dayLabels: { label: string; pct: number }[] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    dayLabels.push({
      label: cursor.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      pct: pct(cursor),
    });
    cursor.setDate(cursor.getDate() + (totalMs / 86400000 > 30 ? 7 : totalMs / 86400000 > 14 ? 3 : 1));
  }

  const todayPct = pct(today);

  // Group by project
  const byProject = projects
    .map((p) => ({ project: p, deps: deployments.filter((d) => d.projectId === p.id) }))
    .filter((g) => g.deps.length > 0);

  return (
    <div className="space-y-6">
      {byProject.map(({ project, deps }) => (
        <div key={project.id} className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
            <div>
              <Link href={`/projects/${project.id}`} className="font-semibold text-slate-100 hover:text-slate-100 hover:underline">
                {project.name}
              </Link>
              <span className="text-xs text-slate-500 ml-2">{project.client} · {project.location}</span>
            </div>
            {deps.some(deploymentHasTBD) && (
              <span className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full shrink-0">
                {deps.filter(deploymentHasTBD).length} movement TBD
              </span>
            )}
          </div>

          <div className="p-4 overflow-x-auto">
            {/* Timeline grid */}
            <div className="min-w-[500px]">
              {/* Day axis */}
              <div className="relative h-6 mb-2 ml-24 border-b border-slate-800">
                {dayLabels.map((dl, i) => (
                  <span
                    key={i}
                    className="absolute text-[10px] text-slate-500 -translate-x-1/2"
                    style={{ left: `${dl.pct}%` }}
                  >
                    {dl.label}
                  </span>
                ))}
              </div>

              {/* Worker rows */}
              <div className="space-y-2">
                {deps.map((dep) => {
                  const worker = people.find((p) => p.id === dep.workerId);
                  const hasTBD = deploymentHasTBD(dep);
                  const depStart = pct(dep.shiftStart);
                  const depEnd = pct(dep.shiftEnd);
                  const depWidth = Math.max(depEnd - depStart, 1);

                  return (
                    <div key={dep.id} className="flex items-center gap-2">
                      {/* Worker label */}
                      <div className="w-24 shrink-0 flex items-center gap-1.5 pr-2">
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                          <span className="text-white text-[9px] font-bold">{initials(worker?.name ?? dep.workerId)}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-300 truncate">{worker?.name?.split(" ")[0] ?? dep.workerId}</span>
                      </div>

                      {/* Timeline bar */}
                      <div className="relative flex-1 h-8">
                        {/* Background track */}
                        <div className="absolute inset-y-0 left-0 right-0 bg-gray-50 rounded" />

                        {/* Today line */}
                        {todayPct >= 0 && todayPct <= 100 && (
                          <div
                            className="absolute inset-y-0 w-px bg-blue-400 z-10"
                            style={{ left: `${todayPct}%` }}
                          />
                        )}

                        {/* Deployment bar */}
                        <div
                          className={`absolute inset-y-1 rounded flex items-center overflow-hidden ${hasTBD ? "bg-red-100 border border-red-300" : "bg-blue-100 border border-blue-200"}`}
                          style={{ left: `${depStart}%`, width: `${depWidth}%` }}
                        >
                          {/* Legs as colored segments */}
                          {dep.legs.length > 0 && (
                            <div className="absolute inset-0 flex">
                              {dep.legs.map((leg, i) => (
                                <div
                                  key={leg.id}
                                  className={`flex-1 h-full ${legStatusColor[leg.status] ?? "bg-gray-300"} ${i < dep.legs.length - 1 ? "mr-px" : ""}`}
                                  title={`${legTypeConfig[leg.type]?.icon ?? ""} ${leg.from || "?"} → ${leg.to || "?"} (${leg.status})`}
                                />
                              ))}
                            </div>
                          )}
                          {dep.legs.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[9px] font-semibold text-red-500">NO LEGS</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 ml-24 flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-emerald-500" /> Confirmed
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-red-400" /> TBD
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-gray-300" /> Complete
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-px h-3 bg-blue-400" /> Today
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LogisticsPage() {
  const deployments = getDeployments();
  const projects = getProjects();
  const people = getPeople();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = deployments.filter((d) => new Date(d.shiftEnd + "T12:00:00") >= today);
  const past = deployments.filter((d) => new Date(d.shiftEnd + "T12:00:00") < today);

  const tbdCount = upcoming.filter(deploymentHasTBD).length;
  const activeProjects = projects.filter((p) =>
    upcoming.some((d) => d.projectId === p.id)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Movement</h1>
          <p className="text-sm text-slate-500 mt-1">People logistics — how everyone gets to and from their project</p>
        </div>
        {tbdCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <span className="text-red-500 font-bold">!</span>
            <span className="text-sm font-medium text-red-700">{tbdCount} worker{tbdCount !== 1 ? "s" : ""} with unplanned legs</span>
          </div>
        )}
      </div>

      {/* Visual timeline */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Timeline</h2>
          <Timeline deployments={upcoming} projects={activeProjects} people={people} />
        </section>
      )}

      {/* Detail cards — editable */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Movement details</h2>

        {projects
          .filter((p) => upcoming.some((d) => d.projectId === p.id))
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .map((project) => {
            const deps = upcoming.filter((d) => d.projectId === project.id);
            return (
              <div key={project.id} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/projects/${project.id}`} className="font-semibold text-slate-200 hover:underline hover:text-slate-100">
                    {project.name}
                  </Link>
                  <span className="text-xs text-slate-500">{project.client} · {project.location}</span>
                  {deps.some(deploymentHasTBD) && (
                    <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-auto">
                      {deps.filter(deploymentHasTBD).length} TBD
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {deps.map((dep) => {
                    const worker = people.find((p) => p.id === dep.workerId);
                    const hasTBD = deploymentHasTBD(dep);
                    return (
                      <div key={dep.id} className={`bg-slate-900 rounded-xl border overflow-hidden ${hasTBD ? "border-red-200" : "border-slate-700/50"}`}>
                        {/* Worker header */}
                        <div className={`px-5 py-3 border-b flex items-center gap-3 flex-wrap ${hasTBD ? "border-red-100 bg-red-50/40" : "border-slate-800 bg-slate-800/30"}`}>
                          <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{initials(worker?.name ?? dep.workerId)}</span>
                          </div>
                          <div className="flex-1">
                            <Link href={`/people/${dep.workerId}`} className="font-semibold text-slate-100 text-sm hover:underline hover:text-slate-100">
                              {worker?.name ?? dep.workerId}
                            </Link>
                            <span className="text-xs text-slate-500 ml-2">{fmtFull(dep.shiftStart)} → {fmtFull(dep.shiftEnd)}</span>
                          </div>

                          {/* Leg pill summary */}
                          {dep.legs.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {dep.legs.map((leg, i) => {
                                const lt = legTypeConfig[leg.type] ?? { icon: "🚐", label: leg.type };
                                return (
                                  <span key={leg.id} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${legStatusBadge[leg.status] ?? "bg-slate-800 text-slate-400"}`}>
                                    {i > 0 && <span className="text-slate-600 mr-0.5">›</span>}
                                    {lt.icon} {leg.from && leg.to ? `${leg.from} → ${leg.to}` : lt.label}
                                  </span>
                                );
                              })}
                              {dep.hotel.needed && (
                                <span className={`text-xs px-2 py-1 rounded-full ${dep.hotel.name ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  🏨 {dep.hotel.name ? dep.hotel.name : "Hotel TBD"}
                                </span>
                              )}
                            </div>
                          )}
                          {dep.legs.length === 0 && (
                            <span className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">No legs — arrange movement</span>
                          )}
                        </div>

                        <div className="p-4">
                          <MovementPlan deployment={dep} workerName={worker?.name ?? dep.workerId} />
                        </div>

                        {dep.notes && (
                          <div className="px-5 pb-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">{dep.notes}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Past</h2>
          <div className="space-y-2">
            {past.map((dep) => {
              const worker = people.find((p) => p.id === dep.workerId);
              const project = projects.find((p) => p.id === dep.projectId);
              return (
                <div key={dep.id} className="bg-slate-900 rounded-lg border border-slate-800 px-4 py-3 flex items-center justify-between opacity-60 text-sm">
                  <div>
                    <span className="font-medium text-slate-300">{worker?.name}</span>
                    <span className="text-slate-500 ml-2">· {project?.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">{fmtFull(dep.shiftStart)} → {fmtFull(dep.shiftEnd)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {deployments.length === 0 && (
        <div className="bg-slate-900 rounded-xl border border-dashed border-gray-300 p-10 text-center text-slate-500">
          No deployments yet.
        </div>
      )}
    </div>
  );
}
