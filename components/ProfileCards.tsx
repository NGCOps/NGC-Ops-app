"use client";

import { useState } from "react";
import CertEditor from "@/components/CertEditor";
import { clientColor } from "@/lib/colors";
import { deploymentHasTBD } from "@/lib/data";
import type { Project, Deployment, CertType } from "@/lib/data";
import type { Certification } from "@/lib/data";

const legStatusColor: Record<string, string> = {
  confirmed: "bg-emerald-500",
  complete: "bg-stone-300",
  tbd: "bg-red-400",
};

interface Props {
  workerId: string;
  certTypes: CertType[];
  certs: Certification[];
  upcomingProjects: Project[];
  allProjects: Project[];
  deployments: Deployment[];
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseYMD(s: string) {
  return new Date(s + "T12:00:00");
}

// ── 30-day schedule ──────────────────────────────────────────────────────────
// Copy of the Timeline view from the Movement page (app/logistics/page.tsx),
// scoped to a single worker and bounded to a fixed next-30-days window instead
// of the full deployment range, restyled to match this page's light theme.

function Schedule({ projects, deployments }: { projects: Project[]; deployments: Deployment[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeStart = today;
  const rangeEnd = addDays(today, 30);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  function pct(d: string | Date): number {
    const ms = (typeof d === "string" ? parseYMD(d) : d).getTime();
    return Math.max(0, Math.min(100, ((ms - rangeStart.getTime()) / totalMs) * 100));
  }

  const dayLabels: { label: string; pct: number }[] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    dayLabels.push({
      label: cursor.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      pct: pct(cursor),
    });
    cursor.setDate(cursor.getDate() + 3);
  }

  const rangeStartYMD = toYMD(rangeStart);
  const rangeEndYMD = toYMD(rangeEnd);
  const inRange = deployments.filter((d) => d.shiftEnd >= rangeStartYMD && d.shiftStart <= rangeEndYMD);

  if (inRange.length === 0) {
    return <p className="text-sm text-stone-400 italic">No projects scheduled in the next 30 days.</p>;
  }

  const todayPct = pct(today);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Day axis */}
        <div className="relative h-6 mb-2 ml-28 border-b border-stone-200">
          {dayLabels.map((dl, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-stone-400 -translate-x-1/2"
              style={{ left: `${dl.pct}%` }}
            >
              {dl.label}
            </span>
          ))}
        </div>

        {/* Deployment rows */}
        <div className="space-y-2">
          {inRange.map((dep) => {
            const project = projects.find((p) => p.id === dep.projectId);
            const color = project ? clientColor(project.client) : null;
            const hasTBD = deploymentHasTBD(dep);
            const depStart = pct(dep.shiftStart);
            const depEnd = pct(dep.shiftEnd);
            const depWidth = Math.max(depEnd - depStart, 1);

            return (
              <div key={dep.id} className="flex items-center gap-2">
                <div className="w-28 shrink-0 pr-2">
                  <span className="text-xs font-medium text-stone-600 truncate block">{project?.name ?? dep.projectId}</span>
                </div>

                <div className="relative flex-1 h-8">
                  <div className="absolute inset-y-0 left-0 right-0 bg-stone-50 rounded" />

                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute inset-y-0 w-px bg-blue-400 z-10" style={{ left: `${todayPct}%` }} />
                  )}

                  <div
                    className="absolute inset-y-1 rounded flex items-center overflow-hidden border"
                    style={{
                      left: `${depStart}%`,
                      width: `${depWidth}%`,
                      backgroundColor: hasTBD ? "#fef2f2" : color?.bg,
                      borderColor: hasTBD ? "#fca5a5" : color?.border,
                    }}
                  >
                    {dep.legs.length > 0 && (
                      <div className="absolute inset-0 flex">
                        {dep.legs.map((leg, i) => (
                          <div
                            key={leg.id}
                            className={`flex-1 h-full opacity-70 ${legStatusColor[leg.status] ?? "bg-stone-300"} ${i < dep.legs.length - 1 ? "mr-px" : ""}`}
                            title={`${leg.from || "?"} → ${leg.to || "?"} (${leg.status})`}
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
        <div className="flex items-center gap-4 mt-4 ml-28 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <div className="w-3 h-2 rounded-sm bg-emerald-500" /> Confirmed
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <div className="w-3 h-2 rounded-sm bg-red-400" /> TBD
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <div className="w-3 h-2 rounded-sm bg-stone-300" /> Complete
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <div className="w-px h-3 bg-blue-400" /> Today
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Certs card ───────────────────────────────────────────────────────────────

function CertsCard({ workerId, certTypes, certs, allProjects }: {
  workerId: string;
  certTypes: CertType[];
  certs: Certification[];
  allProjects: Project[];
}) {
  const [open, setOpen] = useState(false);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const in30 = addDays(now, 30);

  const validCertIds = new Set(
    certs
      .filter((c) => !c.expiryDate || parseYMD(c.expiryDate) >= now)
      .map((c) => c.certTypeId)
  );

  const active = certs.filter((c) => !c.expiryDate || parseYMD(c.expiryDate) >= in30).length;
  const expiringSoon = certs.filter((c) => {
    if (!c.expiryDate) return false;
    const exp = parseYMD(c.expiryDate);
    return exp >= now && exp < in30;
  }).length;
  const expired = certs.filter((c) => c.expiryDate && parseYMD(c.expiryDate) < now).length;

  const neededCertIds = new Set<string>();
  for (const p of allProjects) {
    for (const cid of p.requiredCerts ?? []) {
      if (!validCertIds.has(cid)) neededCertIds.add(cid);
    }
  }
  const needed = neededCertIds.size;

  // qualification dots — one per project that requires certs
  const certProjects = allProjects.filter((p) => p.requiredCerts?.length);
  const noCertProjects = allProjects.filter((p) => !p.requiredCerts?.length);

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-800">Certifications</span>
            <div className="flex gap-1">
              {noCertProjects.length > 0 && (
                <span title={noCertProjects.map((p) => p.name).join(", ")}
                  className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
              )}
              {certProjects.map((p) => {
                const qualifies = (p.requiredCerts ?? []).every((cid) => validCertIds.has(cid));
                if (!qualifies) return null;
                return (
                  <span key={p.id} title={p.name} className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: clientColor(p.client).border }} />
                );
              })}
            </div>
          </div>
          <span className="text-stone-300 text-sm">{open ? "▲" : "▼"}</span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">{active} active</span>
          {expiringSoon > 0 && <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">{expiringSoon} expiring soon</span>}
          {needed > 0 && <span className="text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">{needed} needed</span>}
          {expired > 0 && <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{expired} expired</span>}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-stone-100 pt-3">
          <CertEditor workerId={workerId} certTypes={certTypes} existing={certs} />
        </div>
      )}
    </div>
  );
}

// ── Projects card ────────────────────────────────────────────────────────────

function ProjectsCard({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);

  if (projects.length === 0) return (
    <div className="bg-white rounded-xl border border-stone-200 px-4 py-4">
      <span className="text-sm font-semibold text-stone-800">Projects</span>
      <p className="text-xs text-stone-400 mt-1">No upcoming projects assigned.</p>
    </div>
  );

  function fmt(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-stone-800">Upcoming Projects</span>
          <span className="text-stone-300 text-sm">{open ? "▲" : "▼"}</span>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {projects.map((p) => {
            const color = clientColor(p.client);
            return (
              <span key={p.id} className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: color.bg, color: color.border, border: `1px solid ${color.border}40` }}>
                {p.name}
              </span>
            );
          })}
        </div>
      </button>
      {open && (
        <div className="border-t border-stone-100">
          {projects.map((p) => {
            const color = clientColor(p.client);
            return (
              <div key={p.id} className="px-4 py-3 border-b border-stone-50 last:border-0 flex items-center gap-3">
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color.border }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-800">{p.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{p.client} · {p.location}</div>
                </div>
                <div className="text-xs text-stone-400 text-right shrink-0">
                  <div>{fmt(p.startDate)}</div>
                  <div>→ {fmt(p.endDate)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Movement card ────────────────────────────────────────────────────────────

function MovementCard({ deployments, projects }: { deployments: Deployment[]; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const active = deployments.filter((d) => {
    const today = toYMD(new Date());
    return d.shiftEnd >= today;
  });

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-stone-800">Movement</span>
          <span className="text-stone-300 text-sm">{open ? "▲" : "▼"}</span>
        </div>
        {active.length === 0 ? (
          <p className="text-xs text-stone-400 mt-1">No movement scheduled.</p>
        ) : (
          <p className="text-xs text-stone-400 mt-1">{active.length} deployment{active.length !== 1 ? "s" : ""} scheduled</p>
        )}
      </button>
      {open && (
        <div className="border-t border-stone-100 px-4 py-3">
          {active.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No upcoming travel or movement on file.</p>
          ) : (
            <div className="space-y-3">
              {active.map((d) => {
                const project = projects.find((p) => p.id === d.projectId);
                const hasTBD = d.legs.length === 0 || d.legs.some((l) => l.status === "tbd");
                return (
                  <div key={d.id} className="text-sm text-stone-700 space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {project?.name ?? d.projectId}
                      {hasTBD && <span className="text-xs font-medium bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full">TBD</span>}
                    </div>
                    <div className="text-xs text-stone-400">{d.shiftStart} → {d.shiftEnd}</div>
                    {d.legs.filter((l) => l.status !== "tbd").map((leg, i) => (
                      <div key={i} className="text-xs text-stone-400">
                        {leg.date}: {leg.from} → {leg.to} ({leg.type})
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function ProfileCards({ workerId, certTypes, certs, upcomingProjects, allProjects, deployments }: Props) {
  return (
    <div className="space-y-6">
      {/* 30-day schedule */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Next 30 Days</h2>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <Schedule projects={allProjects} deployments={deployments} />
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Summary</h2>
        <div className="space-y-3">
          <CertsCard workerId={workerId} certTypes={certTypes} certs={certs} allProjects={allProjects} />
          <ProjectsCard projects={upcomingProjects} />
          <MovementCard deployments={deployments} projects={allProjects} />
        </div>
      </section>
    </div>
  );
}
