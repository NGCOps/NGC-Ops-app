"use client";

import { useState } from "react";
import CertEditor from "@/components/CertEditor";
import ScheduleGantt from "@/components/ScheduleGantt";
import { clientColor } from "@/lib/colors";
import { getPeople } from "@/lib/data";
import type { Project, Deployment, CertType } from "@/lib/data";
import type { Certification } from "@/lib/data";

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
          <CertEditor workerId={workerId} certTypes={certTypes} existing={certs} allProjects={allProjects} />
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
  const today = toYMD(new Date());
  const in30 = toYMD(addDays(new Date(), 30));
  const next30Deployments = deployments.filter((d) => d.shiftEnd >= today && d.shiftStart <= in30);

  return (
    <div className="space-y-6">
      {/* 30-day schedule — same ScheduleGantt used on the dashboard, scoped to this person */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Next 30 Days</h2>
        {next30Deployments.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-400 italic">No projects scheduled in the next 30 days.</p>
          </div>
        ) : (
          <ScheduleGantt deployments={next30Deployments} projects={allProjects} people={getPeople()} />
        )}
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
