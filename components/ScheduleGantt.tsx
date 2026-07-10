"use client";

import { useState } from "react";
import Link from "next/link";
import { projectColor } from "@/lib/colors";
import type { Deployment, Project, Person } from "@/lib/data";

const LEG_STATUS_COLOR: Record<string, string> = {
  confirmed: "#10b981",
  complete:  "#d6d3d1",
  tbd:       "#ef4444",
};

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function toDate(s: string) { return new Date(s + "T12:00:00"); }

function fmt(d: string) {
  return toDate(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ScheduleGantt({ deployments, projects, people }: {
  deployments: Deployment[];
  projects: Project[];
  people: Person[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (deployments.length === 0) return null;

  function toggleProject(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filteredDeployments = selected.size === 0 ? deployments : deployments.filter((d) => selected.has(d.projectId));

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
  const workerIds = [...new Set(filteredDeployments.map((d) => d.workerId))];

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-stone-800 text-sm">Schedule</h2>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-[10px] text-stone-400 hover:text-stone-600 underline">
              Clear filter
            </button>
          )}
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {[...new Map(deployments.map((d) => [d.projectId, projects.find((p) => p.id === d.projectId)])).entries()]
            .filter(([, p]) => p)
            .map(([id, p]) => {
              const col = projectColor(id);
              const active = selected.size === 0 || selected.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleProject(id)}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ opacity: active ? 1 : 0.35 }}
                  title={selected.has(id) ? `Showing only ${p!.name} — click to remove` : `Filter to ${p!.name}`}
                >
                  <div className="w-3 h-2 rounded-sm shrink-0" style={{ backgroundColor: col.border }} />
                  <span className="text-[10px] text-stone-500">{p!.name}</span>
                </button>
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

          {workerIds.length === 0 && (
            <p className="text-sm text-stone-400 italic px-1">No deployments match this filter.</p>
          )}

          <div className="space-y-3">
            {workerIds.map((workerId) => {
              const worker = people.find((p) => p.id === workerId);
              const workerDeps = filteredDeployments.filter((d) => d.workerId === workerId);

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
