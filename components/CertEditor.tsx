"use client";

import { useState, useTransition, useRef } from "react";
import { upsertCertification, deleteCertification } from "@/app/actions/updateCertRecord";
import type { Certification, CertType, CertSource, Project } from "@/lib/data";

const sourceOptions: { value: CertSource; label: string }[] = [
  { value: "sharepoint", label: "SharePoint" },
  { value: "workhub",    label: "WorkHub" },
  { value: "email",      label: "Email" },
  { value: "paper",      label: "Paper / Physical" },
  { value: "other",      label: "Other" },
];

const inputCls = "w-full text-sm bg-white border border-stone-200 text-stone-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 placeholder:text-stone-300";

interface Props {
  workerId: string;
  certTypes: CertType[];
  existing: Certification[];
  allProjects?: Project[];
}

function certStatus(cert: Certification): "valid" | "expiring" | "expired" | "no-expiry" {
  if (!cert.expiryDate) return "valid";
  const exp = new Date(cert.expiryDate + "T12:00:00");
  const now = new Date();
  if (exp < now) return "expired";
  const soon = new Date(); soon.setDate(soon.getDate() + 60);
  if (exp <= soon) return "expiring";
  return "valid";
}

const statusStyle: Record<string, string> = {
  valid:        "bg-emerald-50 text-emerald-700 border border-emerald-200",
  expiring:     "bg-amber-50 text-amber-700 border border-amber-200",
  expired:      "bg-red-50 text-red-700 border border-red-200",
  "no-expiry":  "bg-stone-100 text-stone-500 border border-stone-200",
};

const statusDot: Record<string, string> = {
  valid: "bg-emerald-500", expiring: "bg-amber-400", expired: "bg-red-500", "no-expiry": "bg-stone-300",
};

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function isUrl(s: string) {
  return s?.startsWith("http://") || s?.startsWith("https://");
}

function isImage(docRef: string) {
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(docRef);
}

function CertRow({ cert, certType, workerId, onDelete, onUpdate, expanded, onToggle }: {
  cert: Certification;
  certType: CertType | undefined;
  workerId: string;
  onDelete: () => void;
  onUpdate: (updated: Certification) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [form, setForm] = useState({ ...cert });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const status = certStatus(cert);

  function save(updated = form) {
    startTransition(async () => {
      await upsertCertification(updated);
      onUpdate(updated);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("certId", cert.id);
      const res = await fetch("/api/upload-cert", { method: "POST", body: fd });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.url) {
        const updated = { ...form, documentRef: data.url };
        setForm(updated);
        save(updated);
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors rounded-lg">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[status]}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-stone-800">{certType?.label ?? cert.certTypeId}</span>
          {cert.expiryDate && (
            <span className="text-xs text-stone-400 ml-2">
              {status === "expired" ? "Expired " : "Expires "}{formatDate(cert.expiryDate)}
            </span>
          )}
          {cert.source && <span className="text-xs text-stone-300 ml-2">· {cert.source}</span>}
        </div>
        {isUrl(form.documentRef) && (
          <span className="text-xs text-stone-400 shrink-0">📎 doc</span>
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusStyle[status]}`}>
          {status === "expiring" ? "Expiring soon" : status === "expired" ? "Expired" : "Valid"}
        </span>
        <span className="text-stone-300 text-sm shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-stone-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Issued Date</label>
              <input type="date" value={form.issuedDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, issuedDate: e.target.value || null }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Expiry Date</label>
              <input type="date" value={form.expiryDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value || null }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Source</label>
              <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as CertSource }))} className={inputCls}>
                {sourceOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Document</label>
              {isUrl(form.documentRef) ? (
                <div className="space-y-2">
                  {isImage(form.documentRef) && (
                    <a href={form.documentRef} target="_blank" rel="noopener noreferrer">
                      <img src={form.documentRef} alt="Cert document"
                        className="rounded-lg border border-stone-200 max-h-40 object-contain bg-stone-50 w-full" />
                    </a>
                  )}
                  <div className="flex items-center gap-2">
                    <a href={form.documentRef} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-sm text-[#1e3829] underline truncate">
                      {isImage(form.documentRef) ? "Open full size ↗" : "View document ↗"}
                    </a>
                    <button onClick={() => { const u = { ...form, documentRef: "" }; setForm(u); save(u); }}
                      className="text-xs text-stone-400 hover:text-red-500 transition-colors shrink-0">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload}
                    className="hidden" id={`upload-${cert.id}`} />
                  <label htmlFor={`upload-${cert.id}`}
                    className="flex-1 text-center text-sm border border-dashed border-stone-300 rounded-lg px-3 py-2 text-stone-400 hover:border-stone-400 hover:text-stone-600 cursor-pointer transition-colors">
                    {uploading ? "Uploading…" : "Upload file"}
                  </label>
                  {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button onClick={() => save()} disabled={isPending}
                className="bg-[#1e3829] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2d5240] disabled:opacity-50 transition-colors">
                {isPending ? "Saving…" : "Save"}
              </button>
              {saved && <span className="text-xs text-emerald-600 font-medium">Saved ✓</span>}
            </div>
            <button onClick={handleDelete} disabled={isPending} className="text-xs text-stone-400 hover:text-red-500 transition-colors">
              Remove cert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertEditor({ workerId, certTypes, existing, allProjects }: Props) {
  const [certs, setCerts] = useState<Certification[]>(existing);
  const [addingType, setAddingType] = useState("");
  const [isPending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const usedTypeIds = new Set(certs.map((c) => c.certTypeId));
  const availableTypes = certTypes.filter((t) => !usedTypeIds.has(t.id));

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const validCertIds = new Set(
    certs.filter((c) => !c.expiryDate || new Date(c.expiryDate + "T12:00:00") >= now).map((c) => c.certTypeId)
  );
  const certProjects = (allProjects ?? []).filter((p) => p.requiredCerts?.length);
  const neededCertIds = [...new Set(
    certProjects.flatMap((p) => (p.requiredCerts ?? []).filter((cid) => !validCertIds.has(cid)))
  )];

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Needed certs that are already on file (just expired) get their existing row
  // expanded for editing instead of creating a second entry for the same cert type.
  function addCertForType(certTypeId: string) {
    const already = certs.find((c) => c.certTypeId === certTypeId);
    if (already) {
      setExpandedIds((prev) => new Set(prev).add(already.id));
      return;
    }
    const newCert: Certification = {
      id: `${workerId}-${certTypeId}`,
      workerId, certTypeId,
      issuedDate: null, expiryDate: null,
      source: "sharepoint", documentRef: "", notes: "",
    };
    setCerts((prev) => [...prev, newCert]);
    setExpandedIds((prev) => new Set(prev).add(newCert.id));
    startTransition(async () => { await upsertCertification(newCert); });
  }

  function addCert() {
    if (!addingType) return;
    addCertForType(addingType);
    setAddingType("");
  }

  return (
    <div className="space-y-4">
      {neededCertIds.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Needed — click to add</div>
          <div className="space-y-1.5">
            {neededCertIds.map((cid) => {
              const label = certTypes.find((t) => t.id === cid)?.label ?? cid;
              const forProjects = certProjects.filter((p) => (p.requiredCerts ?? []).includes(cid));
              return (
                <button
                  key={cid}
                  onClick={() => addCertForType(cid)}
                  disabled={isPending}
                  className="w-full flex items-center justify-between gap-3 text-sm bg-blue-50/60 border border-blue-100 hover:bg-blue-100 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
                >
                  <span className="text-stone-700 font-medium">+ {label}</span>
                  <span className="text-xs text-stone-500 text-right shrink-0">
                    {forProjects.map((p) => p.name).join(", ")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="space-y-1.5">
          {certs.length === 0 && (
            <div className="text-sm text-stone-400 italic px-1">No certifications on file yet.</div>
          )}
          {certs.map((cert) => (
            <CertRow
              key={cert.id}
              cert={cert}
              certType={certTypes.find((t) => t.id === cert.certTypeId)}
              workerId={workerId}
              expanded={expandedIds.has(cert.id)}
              onToggle={() => toggleExpanded(cert.id)}
              onDelete={() => setCerts((prev) => prev.filter((c) => c.id !== cert.id))}
              onUpdate={(updated) => setCerts((prev) => prev.map((c) => c.id === updated.id ? updated : c))}
            />
          ))}
        </div>

        {availableTypes.length > 0 && (
          <div className="flex gap-2 items-center pt-2">
            <select value={addingType} onChange={(e) => setAddingType(e.target.value)}
              className="flex-1 text-sm bg-white border border-dashed border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-200 text-stone-400">
              <option value="">+ Add certification…</option>
              {availableTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {addingType && (
              <button onClick={addCert} disabled={isPending}
                className="bg-[#1e3829] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2d5240] disabled:opacity-50 transition-colors shrink-0">
                Add
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
