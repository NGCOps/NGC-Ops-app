"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upsertCertification } from "@/app/actions/updateCertRecord";
import type { Certification, CertType } from "@/lib/data";

interface Worker {
  id: string;
  name: string;
}

interface CertCell {
  cert: Certification | null;
  workerId: string;
  workerName: string;
  certType: CertType;
}

function statusOf(cert: Certification | null): "missing" | "expired" | "expiring" | "valid" | "no-expiry" {
  if (!cert) return "missing";
  if (!cert.expiryDate) return "no-expiry";
  const exp = new Date(cert.expiryDate + "T12:00:00");
  const now = new Date();
  if (exp < now) return "expired";
  const soon = new Date(); soon.setDate(soon.getDate() + 60);
  if (exp <= soon) return "expiring";
  return "valid";
}

function StatusChip({ status }: { status: ReturnType<typeof statusOf> }) {
  if (status === "missing") return <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Missing</span>;
  if (status === "expired") return <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Expired</span>;
  if (status === "expiring") return <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Expiring</span>;
  return <span className="text-lg text-emerald-600">✓</span>;
}

function CertModal({ cell, onClose }: { cell: CertCell; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    issuedDate: cell.cert?.issuedDate ?? "",
    expiryDate: cell.cert?.expiryDate ?? "",
    notes: cell.cert?.notes ?? "",
    documentRef: cell.cert?.documentRef ?? "",
    source: cell.cert?.source ?? "email",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function save() {
    startTransition(async () => {
      const record: Certification = {
        id: cell.cert?.id ?? `${cell.workerId}-${cell.certType.id}-${Date.now()}`,
        workerId: cell.workerId,
        certTypeId: cell.certType.id,
        issuedDate: form.issuedDate || null,
        expiryDate: form.expiryDate || null,
        notes: form.notes,
        documentRef: form.documentRef,
        source: (form.source as Certification["source"]),
      };
      await upsertCertification(record);
      setSaved(true);
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 800);
    });
  }

  const labelCls = "block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1";
  const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 text-stone-900 focus:outline-none focus:border-stone-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-stone-900">{cell.certType.label}</div>
            <div className="text-sm text-stone-500 mt-0.5">{cell.workerName}</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none mt-0.5">×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Issued</label>
              <input type="date" className={inputCls} value={form.issuedDate ?? ""} onChange={(e) => set("issuedDate", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Expiry</label>
              <input type="date" className={inputCls} value={form.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <select className={inputCls} value={form.source} onChange={(e) => set("source", e.target.value)}>
              <option value="email">Email</option>
              <option value="sharepoint">SharePoint</option>
              <option value="workhub">WorkHub</option>
              <option value="paper">Paper / Physical</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Document Ref</label>
            <input className={inputCls} value={form.documentRef} onChange={(e) => set("documentRef", e.target.value)} placeholder="File name or cert #" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + " resize-none"} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-stone-500 border border-stone-200 hover:border-stone-300 transition-colors">Cancel</button>
          <button onClick={save} disabled={isPending} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#1e3829] text-white hover:bg-[#2d5a3d] disabled:opacity-50 transition-colors">
            {saved ? "Saved ✓" : isPending ? "Saving…" : "Save"}
          </button>
        </div>

        {cell.certType.notes && (
          <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">{cell.certType.notes}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  workers: Worker[];
  requiredCerts: CertType[];
  certsByWorker: Record<string, Certification[]>;
}

export default function CertMatrix({ workers, requiredCerts, certsByWorker }: Props) {
  const [activeCell, setActiveCell] = useState<CertCell | null>(null);

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide text-left w-48">Cert / Training</th>
              {workers.map((w) => (
                <th key={w.id} className="px-3 py-3 text-center border-l border-stone-100">
                  <Link href={`/people/${w.id}`} className="text-xs font-semibold text-[#1e3829] hover:underline">
                    {w.name.split(" ")[0]}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requiredCerts.map((ct, i) => (
              <tr key={ct.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                <td className="px-4 py-3 text-sm text-stone-700 border-b border-stone-50">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ct.category === "compliance" ? "bg-blue-400" : ct.category === "safety" ? "bg-amber-400" : "bg-stone-300"}`} />
                    {ct.label}
                  </div>
                </td>
                {workers.map((w) => {
                  const cert = certsByWorker[w.id]?.find((c) => c.certTypeId === ct.id) ?? null;
                  const status = statusOf(cert);
                  return (
                    <td key={w.id} className="px-3 py-3 text-center border-l border-b border-stone-100">
                      <button
                        onClick={() => setActiveCell({ cert, workerId: w.id, workerName: w.name, certType: ct })}
                        className="hover:opacity-70 transition-opacity cursor-pointer"
                        title={`Update ${ct.label} for ${w.name}`}
                      >
                        <StatusChip status={status} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeCell && <CertModal cell={activeCell} onClose={() => setActiveCell(null)} />}
    </>
  );
}
