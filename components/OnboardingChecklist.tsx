"use client";

import { useState, useTransition } from "react";
import { updateCertStatus } from "@/app/actions/updateCert";
import type { Requirement, WorkerCertStatus, CertStatus } from "@/lib/data";

interface Props {
  projectId: string;
  projectName: string;
  shiftStart: string;
  workerId: string;
  requirements: Requirement[];
  workerStatus: Record<string, WorkerCertStatus>;
}

const statusOptions: { value: CertStatus; label: string; activeClasses: string }[] = [
  { value: "complete", label: "Complete", activeClasses: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { value: "pending",  label: "Pending",  activeClasses: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  { value: "expired",  label: "Expired",  activeClasses: "bg-red-500/20 text-red-400 border-red-500/40" },
  { value: "na",       label: "N/A",      activeClasses: "bg-slate-700 text-slate-400 border-slate-600" },
];

const statusDot: Record<CertStatus, string> = {
  complete: "bg-emerald-500",
  pending:  "bg-amber-500",
  expired:  "bg-red-500",
  na:       "bg-slate-600",
};

const statusBadge: Record<CertStatus, string> = {
  complete: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  expired:  "bg-red-500/15 text-red-400 border-red-500/30",
  na:       "bg-slate-700 text-slate-400 border-slate-600",
};

const inputCls = "w-full text-sm bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder:text-slate-600";

function deadlineInfo(req: Requirement, shiftStart: string) {
  if (!req.daysBeforeStart || !shiftStart) return null;
  const start = new Date(shiftStart + "T12:00:00");
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - req.daysBeforeStart);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((deadline.getTime() - today.getTime()) / 86400000);
  return {
    date: deadline.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    urgent: daysLeft <= 7 && daysLeft >= 0,
    overdue: daysLeft < 0,
  };
}

function CertRow({ req, cert, shiftStart, projectId, workerId }: {
  req: Requirement; cert: WorkerCertStatus | undefined;
  shiftStart: string; projectId: string; workerId: string;
}) {
  const initial = cert ?? { status: "pending" as CertStatus, expiry: null, completedDate: null, notes: "" };
  const [status, setStatus] = useState<CertStatus>(initial.status);
  const [notes, setNotes] = useState(initial.notes);
  const [expiry, setExpiry] = useState(initial.expiry ?? "");
  const [completedDate, setCompletedDate] = useState(initial.completedDate ?? "");
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const deadline = deadlineInfo(req, shiftStart);

  function save() {
    startTransition(async () => {
      await updateCertStatus(projectId, workerId, req.id, status, notes, expiry, completedDate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className={`rounded-lg border transition-colors ${
      status === "complete" ? "border-slate-700/40 bg-slate-800/30" :
      status === "expired"  ? "border-red-500/20 bg-red-500/5" :
      "border-amber-500/20 bg-amber-500/5"
    }`}>
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[status]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${status === "complete" ? "text-slate-500" : "text-slate-200"}`}>
              {req.label}
            </span>
            {deadline && status !== "complete" && status !== "na" && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                deadline.overdue ? "bg-red-500/20 text-red-400" :
                deadline.urgent  ? "bg-amber-500/20 text-amber-400" :
                "bg-blue-500/15 text-blue-400"
              }`}>
                {deadline.overdue ? `Overdue — was due ${deadline.date}` :
                 deadline.urgent  ? `Due ${deadline.date} — soon` :
                 `Due by ${deadline.date}`}
              </span>
            )}
          </div>
          {req.note && !expanded && (
            <div className="text-xs text-slate-600 mt-0.5 truncate">{req.note}</div>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${statusBadge[status]}`}>
          {statusOptions.find((s) => s.value === status)?.label}
        </span>
        <span className="text-slate-600 text-sm shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
          {req.note && <p className="text-xs text-slate-500">{req.note}</p>}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    status === opt.value
                      ? `${opt.activeClasses} ring-1 ring-offset-1 ring-offset-slate-900 ring-current`
                      : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Completed Date</label>
              <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Expiry Date</label>
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Scheduled for June 20..."
              className={inputCls + " resize-none"}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={isPending}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingChecklist({ projectId, projectName, shiftStart, workerId, requirements, workerStatus }: Props) {
  const pending = requirements.filter((r) => {
    const s = workerStatus[r.id]?.status;
    return s === "pending" || s === "expired" || !s;
  });
  const complete = requirements.filter((r) => {
    const s = workerStatus[r.id]?.status;
    return s === "complete" || s === "na";
  });

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Onboarding Checklist</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          pending.length === 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
        }`}>
          {complete.length}/{requirements.length} complete
        </span>
      </div>
      <div className="space-y-1.5">
        {pending.map((req) => (
          <CertRow key={req.id} req={req} cert={workerStatus[req.id]} shiftStart={shiftStart} projectId={projectId} workerId={workerId} />
        ))}
        {complete.map((req) => (
          <CertRow key={req.id} req={req} cert={workerStatus[req.id]} shiftStart={shiftStart} projectId={projectId} workerId={workerId} />
        ))}
      </div>
    </div>
  );
}
