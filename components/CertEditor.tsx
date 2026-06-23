"use client";

import { useState, useTransition } from "react";
import { upsertCertification, deleteCertification } from "@/app/actions/updateCertRecord";
import type { Certification, CertType, CertSource } from "@/lib/data";

const sourceOptions: { value: CertSource; label: string }[] = [
  { value: "sharepoint", label: "SharePoint" },
  { value: "workhub",    label: "WorkHub" },
  { value: "email",      label: "Email" },
  { value: "paper",      label: "Paper / Physical" },
  { value: "other",      label: "Other" },
];

const inputCls = "w-full text-sm bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder:text-slate-600";

interface Props {
  workerId: string;
  certTypes: CertType[];
  existing: Certification[];
}

function certStatus(cert: Certification): "valid" | "expiring" | "expired" | "no-expiry" {
  if (!cert.expiryDate) return "no-expiry";
  const exp = new Date(cert.expiryDate + "T12:00:00");
  const now = new Date();
  if (exp < now) return "expired";
  const soon = new Date(); soon.setDate(soon.getDate() + 60);
  if (exp <= soon) return "expiring";
  return "valid";
}

const statusStyle: Record<string, string> = {
  valid:        "bg-emerald-500/15 text-emerald-400",
  expiring:     "bg-amber-500/15 text-amber-400",
  expired:      "bg-red-500/15 text-red-400",
  "no-expiry":  "bg-slate-700 text-slate-400",
};

const statusDot: Record<string, string> = {
  valid: "bg-emerald-500", expiring: "bg-amber-500", expired: "bg-red-500", "no-expiry": "bg-slate-600",
};

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function CertRow({ cert, certType, workerId, onDelete }: {
  cert: Certification; certType: CertType | undefined; workerId: string; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ ...cert });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const status = certStatus(cert);

  function save() {
    startTransition(async () => {
      await upsertCertification(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCertification(cert.id, workerId);
      onDelete();
    });
  }

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/30">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[status]}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-200">{certType?.label ?? cert.certTypeId}</span>
          {cert.expiryDate && (
            <span className="text-xs text-slate-500 ml-2">
              {status === "expired" ? "Expired " : "Expires "}{formatDate(cert.expiryDate)}
            </span>
          )}
          {cert.source && <span className="text-xs text-slate-600 ml-2">· {cert.source}</span>}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusStyle[status]}`}>
          {status === "no-expiry" ? "No expiry" : status === "expiring" ? "Expiring soon" : status === "expired" ? "Expired" : "Valid"}
        </span>
        <span className="text-slate-600 text-sm shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Issued Date</label>
              <input type="date" value={form.issuedDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, issuedDate: e.target.value || null }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Expiry Date</label>
              <input type="date" value={form.expiryDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value || null }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Source</label>
              <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as CertSource }))}
                className={inputCls}>
                {sourceOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Document Ref</label>
              <input value={form.documentRef} onChange={(e) => setForm((f) => ({ ...f, documentRef: e.target.value }))} placeholder="File name or SharePoint path" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={isPending}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isPending ? "Saving…" : "Save"}
              </button>
              {saved && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
            </div>
            <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-500 hover:text-red-400 transition-colors">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertEditor({ workerId, certTypes, existing }: Props) {
  const [certs, setCerts] = useState<Certification[]>(existing);
  const [addingType, setAddingType] = useState("");
  const [isPending, startTransition] = useTransition();

  const usedTypeIds = new Set(certs.map((c) => c.certTypeId));
  const availableTypes = certTypes.filter((t) => !usedTypeIds.has(t.id));

  function addCert() {
    if (!addingType) return;
    const newCert: Certification = {
      id: `${workerId}-${addingType}-${Date.now()}`,
      workerId, certTypeId: addingType,
      issuedDate: null, expiryDate: null,
      source: "sharepoint", documentRef: "", notes: "",
    };
    setCerts((prev) => [...prev, newCert]);
    setAddingType("");
    startTransition(async () => { await upsertCertification(newCert); });
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {certs.length === 0 && (
          <div className="text-sm text-slate-600 italic px-1">No certifications on file yet.</div>
        )}
        {certs.map((cert) => (
          <CertRow key={cert.id} cert={cert} certType={certTypes.find((t) => t.id === cert.certTypeId)}
            workerId={workerId} onDelete={() => setCerts((prev) => prev.filter((c) => c.id !== cert.id))} />
        ))}
      </div>

      {availableTypes.length > 0 && (
        <div className="flex gap-2 items-center pt-1">
          <select value={addingType} onChange={(e) => setAddingType(e.target.value)}
            className="flex-1 text-sm bg-slate-800 border border-dashed border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-400">
            <option value="">+ Add certification…</option>
            {availableTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {addingType && (
            <button onClick={addCert} disabled={isPending}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0">
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
