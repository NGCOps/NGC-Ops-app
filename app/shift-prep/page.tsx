import { getShiftPrep, getProjects, getPeople } from "@/lib/data";
import type { CertStatus } from "@/lib/data";
import Link from "next/link";

const statusConfig: Record<CertStatus, { label: string; dot: string; badge: string; icon: string }> = {
  complete: { label: "Complete", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-400", icon: "✓" },
  pending:  { label: "Pending",  dot: "bg-amber-500",   badge: "bg-amber-500/15 text-amber-400",   icon: "⏳" },
  expired:  { label: "Expired",  dot: "bg-red-500",     badge: "bg-red-500/15 text-red-400",       icon: "✗" },
  na:       { label: "N/A",      dot: "bg-slate-600",   badge: "bg-slate-700 text-slate-400",      icon: "—" },
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ShiftPrepPage() {
  const shiftPreps = getShiftPrep();
  const projects = getProjects();
  const people = getPeople();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Onboarding</h1>
        <p className="text-sm text-slate-500 mt-1">Certification and compliance tracker — per project, per worker</p>
      </div>

      {shiftPreps.length === 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-8 text-center text-slate-500">
          No onboarding records yet.
        </div>
      )}

      {shiftPreps.map((sp) => {
        const project = projects.find((p) => p.id === sp.projectId);
        const workerIds = Object.keys(sp.workerStatus);
        const workers = workerIds.map((id) => people.find((p) => p.id === id)).filter(Boolean);

        const workerReadiness = workerIds.map((wid) => {
          const statuses = Object.values(sp.workerStatus[wid]);
          const pendingCount = statuses.filter((s) => s.status === "pending" || s.status === "expired").length;
          return { wid, allClear: pendingCount === 0, pendingCount };
        });

        return (
          <div key={sp.id} className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <Link href={`/projects/${sp.projectId}`} className="font-semibold text-slate-100 hover:text-blue-400 hover:underline">
                  {project?.name ?? sp.projectId}
                </Link>
                <div className="text-sm text-slate-500 mt-0.5">{project?.client} · {project?.location}</div>
              </div>
              {workerReadiness.every((w) => w.allClear) ? (
                <span className="text-xs font-medium bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">All Clear</span>
              ) : (
                <span className="text-xs font-medium bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">
                  {workerReadiness.reduce((a, w) => a + w.pendingCount, 0)} pending
                </span>
              )}
            </div>

            {/* Requirement tags */}
            <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap gap-2">
              {sp.requirements.map((req) => (
                <span key={req.id} className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  {req.label}
                </span>
              ))}
            </div>

            {/* Worker rows */}
            <div className="divide-y divide-slate-800">
              {workers.map((worker, wi) => {
                if (!worker) return null;
                const workerCerts = sp.workerStatus[worker.id];
                const ready = workerReadiness[wi];
                return (
                  <div key={worker.id} className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Link href={`/people/${worker.id}`}>
                        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0 hover:opacity-80">
                          <span className="text-white text-xs font-semibold">{initials(worker.name)}</span>
                        </div>
                      </Link>
                      <Link href={`/people/${worker.id}`} className="font-medium text-slate-100 hover:text-blue-400 hover:underline">
                        {worker.name}
                      </Link>
                      {ready.allClear ? (
                        <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium ml-auto">Ready</span>
                      ) : (
                        <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium ml-auto">
                          {ready.pendingCount} outstanding
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sp.requirements.map((req) => {
                        const cert = workerCerts[req.id];
                        if (!cert) return null;
                        const cfg = statusConfig[cert.status];
                        const isPending = cert.status === "pending" || cert.status === "expired";
                        return (
                          <div
                            key={req.id}
                            className={`rounded-lg px-3 py-2 flex items-start gap-2 border ${
                              isPending ? "bg-amber-500/5 border-amber-500/20" : "bg-slate-800/50 border-slate-700/30"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-200 leading-tight">{req.label}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                                {cert.expiry && <span className="text-xs text-slate-600">exp. {cert.expiry}</span>}
                              </div>
                              {cert.notes && <div className="text-xs text-slate-500 mt-1">{cert.notes}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {projects.filter((p) => !shiftPreps.find((sp) => sp.projectId === p.id) && p.status === "active").length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Projects Without Onboarding Checklist</h3>
          <div className="space-y-2">
            {projects
              .filter((p) => !shiftPreps.find((sp) => sp.projectId === p.id) && p.status === "active")
              .map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="bg-slate-900/50 rounded-lg border border-dashed border-slate-700 p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-400">{p.name}</div>
                      <div className="text-sm text-slate-600">{p.client}</div>
                    </div>
                    <span className="text-xs text-slate-600">No checklist →</span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
