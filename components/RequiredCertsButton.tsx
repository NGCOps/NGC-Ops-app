"use client";

import { useState } from "react";
import type { CertType, Certification } from "@/lib/data";

type Status = "valid" | "expiring" | "expired" | "missing";

function statusOf(cert: Certification | null | undefined): Status {
  if (!cert) return "missing";
  if (!cert.expiryDate) return "valid";
  const exp = new Date(cert.expiryDate + "T12:00:00");
  const now = new Date();
  if (exp < now) return "expired";
  const soon = new Date(); soon.setDate(soon.getDate() + 60);
  if (exp <= soon) return "expiring";
  return "valid";
}

const dotColor: Record<Status, string> = {
  valid: "bg-emerald-500",
  expiring: "bg-amber-400",
  expired: "bg-red-500",
  missing: "bg-red-300",
};

interface Worker {
  id: string;
  name: string;
}

export default function RequiredCertsButton({ requiredCerts, workers, certsByWorker }: {
  requiredCerts: CertType[];
  workers: Worker[];
  certsByWorker: Record<string, Certification[]>;
}) {
  const [open, setOpen] = useState(false);

  if (requiredCerts.length === 0) return null;

  const fullyQualifiedCount = requiredCerts.filter((ct) =>
    workers.length > 0 && workers.every((w) => statusOf(certsByWorker[w.id]?.find((c) => c.certTypeId === ct.id)) === "valid")
  ).length;
  const allQualified = fullyQualifiedCount === requiredCerts.length;

  return (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
          allQualified
            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
        }`}
      >
        {requiredCerts.length} cert{requiredCerts.length !== 1 ? "s" : ""} required
        <span className="text-stone-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 bg-white border border-stone-200 rounded-lg p-3 space-y-2 text-left">
          {requiredCerts.map((ct) => {
            const statuses = workers.map((w) => ({
              worker: w,
              status: statusOf(certsByWorker[w.id]?.find((c) => c.certTypeId === ct.id)),
            }));
            const qualified = statuses.filter((s) => s.status === "valid").length;
            return (
              <div key={ct.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-700 truncate">{ct.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {statuses.length === 0 ? (
                    <span className="text-[10px] text-stone-300 italic">no workers</span>
                  ) : (
                    <>
                      {statuses.map((s) => (
                        <span
                          key={s.worker.id}
                          title={`${s.worker.name}: ${s.status}`}
                          className={`w-2 h-2 rounded-full ${dotColor[s.status]}`}
                        />
                      ))}
                      <span className="text-[10px] text-stone-400 ml-1">{qualified}/{workers.length}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
