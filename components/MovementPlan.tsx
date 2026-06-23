"use client";

import { useState, useTransition } from "react";
import { updateLeg, deleteLeg, updateHotel } from "@/app/actions/updateDeployment";
import type { Deployment, Leg, LegType, LegStatus, Hotel } from "@/lib/data";

const legTypeOptions: { value: LegType; label: string; icon: string }[] = [
  { value: "self",             label: "Self (own transport)",      icon: "🚘" },
  { value: "ngc-drive",        label: "NGC Drive (Jennifer / Mike)", icon: "🚙" },
  { value: "external-carpool", label: "External Carpool",           icon: "🤝" },
  { value: "flight",           label: "Flight",                     icon: "✈️" },
  { value: "bus",              label: "Bus / Shuttle",              icon: "🚌" },
  { value: "other",            label: "Other",                      icon: "🚐" },
];

const legStatusConfig: Record<LegStatus, { label: string; badge: string; dot: string }> = {
  tbd:       { label: "TBD",       badge: "bg-red-500/15 text-red-400",       dot: "bg-red-500" },
  confirmed: { label: "Confirmed", badge: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-500" },
  complete:  { label: "Complete",  badge: "bg-slate-700 text-slate-400",        dot: "bg-slate-500" },
};

const inputCls = "w-full text-sm bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder:text-slate-600";

function LegRow({ leg, deploymentId, workerId, onDelete }: {
  leg: Leg; deploymentId: string; workerId: string; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(leg.status === "tbd");
  const [form, setForm] = useState({ ...leg });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const typeOpt = legTypeOptions.find((t) => t.value === form.type) ?? legTypeOptions[0];
  const statusCfg = legStatusConfig[form.status];

  function save() {
    startTransition(async () => {
      await updateLeg(deploymentId, workerId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteLeg(deploymentId, leg.id, workerId);
      onDelete();
    });
  }

  return (
    <div className={`rounded-lg border transition-colors ${
      form.status === "tbd"      ? "border-red-500/20 bg-red-500/5" :
      form.status === "complete" ? "border-slate-700/40 bg-slate-800/30" :
      "border-emerald-500/20 bg-emerald-500/5"
    }`}>
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
        <span className="text-sm font-medium mr-1">{typeOpt.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-200">{form.from || "?"} → {form.to || "?"}</span>
          {form.date && <span className="text-xs text-slate-500 ml-2">{form.date}{form.time ? ` at ${form.time}` : ""}</span>}
          {form.driverName && <span className="text-xs text-slate-500 ml-2">· {form.driverName}</span>}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusCfg.badge}`}>{statusCfg.label}</span>
        <span className="text-slate-600 text-sm shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Type</label>
              <div className="flex flex-wrap gap-2">
                {legTypeOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      form.type === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}>
                    <span>{opt.icon}</span>{opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">From</label>
              <input value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} placeholder="e.g. Terrace, BC" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">To</label>
              <input value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} placeholder="e.g. Fort St. John, BC" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Time</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className={inputCls} />
            </div>
            {(form.type === "ngc-drive" || form.type === "external-carpool") && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Driver / Pickup contact</label>
                <input value={form.driverName} onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))} placeholder="e.g. Jennifer Carter" className={inputCls} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
            <div className="flex gap-2">
              {(["tbd", "confirmed", "complete"] as LegStatus[]).map((s) => {
                const cfg = legStatusConfig[s];
                return (
                  <button key={s} onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      form.status === s ? `${cfg.badge} border-current ring-1 ring-offset-1 ring-offset-slate-900 ring-current` : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
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
              Remove leg
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HotelBlock({ hotel, deploymentId, workerId }: { hotel: Hotel; deploymentId: string; workerId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ ...hotel });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateHotel(deploymentId, workerId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const booked = form.needed && !!form.name;

  return (
    <div className={`rounded-lg border ${
      !form.needed ? "border-slate-700/40 bg-slate-800/20" :
      !booked      ? "border-amber-500/20 bg-amber-500/5" :
      "border-emerald-500/20 bg-emerald-500/5"
    }`}>
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-base">🏨</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-200">
            {!form.needed ? "No hotel needed" : booked ? form.name : "Hotel — not yet booked"}
          </span>
          {booked && form.confirmationNumber && (
            <span className="text-xs text-slate-500 ml-2">Conf# {form.confirmationNumber}</span>
          )}
        </div>
        {form.needed && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${booked ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
            {booked ? "Booked" : "TBD"}
          </span>
        )}
        <span className="text-slate-600 text-sm shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-300">Hotel needed?</label>
            <button onClick={() => setForm((f) => ({ ...f, needed: !f.needed }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.needed ? "bg-blue-600" : "bg-slate-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.needed ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {form.needed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Hotel Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Quality Inn Fort St. John" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Confirmation #</label>
                <input value={form.confirmationNumber} onChange={(e) => setForm((f) => ({ ...f, confirmationNumber: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Booked By</label>
                <input value={form.bookedBy} onChange={(e) => setForm((f) => ({ ...f, bookedBy: e.target.value }))} placeholder="e.g. Jennifer" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Check-in</label>
                <input type="date" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Check-out</label>
                <input type="date" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={isPending}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isPending ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MovementPlan({ deployment, workerName }: { deployment: Deployment; workerName: string }) {
  const [legs, setLegs] = useState<Leg[]>(deployment.legs);
  const [isPending, startTransition] = useTransition();

  const tbdCount = legs.filter((l) => l.status === "tbd").length + (legs.length === 0 ? 1 : 0);

  function addLeg() {
    const newLeg: Leg = {
      id: `leg-${Date.now()}`,
      order: legs.length + 1,
      type: "self", from: "", to: "", date: "", time: "",
      arrangedBy: "", driverName: "", notes: "", status: "tbd",
    };
    setLegs((prev) => [...prev, newLeg]);
    startTransition(async () => {
      const { updateLeg } = await import("@/app/actions/updateDeployment");
      await updateLeg(deployment.id, deployment.workerId, newLeg);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Movement Plan</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tbdCount === 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {tbdCount === 0 ? "All sorted" : `${tbdCount} leg${tbdCount !== 1 ? "s" : ""} TBD`}
        </span>
      </div>

      {legs.length === 0 && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          No legs added yet — movement not planned.
        </div>
      )}

      <div className="space-y-1.5">
        {legs.map((leg) => (
          <LegRow key={leg.id} leg={leg} deploymentId={deployment.id} workerId={deployment.workerId}
            onDelete={() => setLegs((prev) => prev.filter((l) => l.id !== leg.id))} />
        ))}
      </div>

      <button onClick={addLeg} disabled={isPending}
        className="w-full text-xs text-blue-400 border border-dashed border-blue-500/30 rounded-lg py-2 hover:bg-blue-500/5 transition-colors font-medium">
        + Add leg
      </button>

      <HotelBlock hotel={deployment.hotel} deploymentId={deployment.id} workerId={deployment.workerId} />
    </div>
  );
}
