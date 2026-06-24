"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddProjectModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", client: "", location: "", description: "",
    startDate: "", endDate: "", status: "upcoming",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", client: "", location: "", description: "", startDate: "", endDate: "", status: "upcoming" });
      router.refresh();
    }
  }

  const labelCls = "block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1";
  const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-white/10 text-white placeholder:text-white/30 border border-white/10 focus:outline-none focus:border-white/40";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/15 text-white hover:bg-white/25 transition-colors"
      >
        + Add Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#1e3829" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Project</h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className={labelCls}>Project Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Brucejack EM" required />
              </div>
              <div>
                <label className={labelCls}>Client</label>
                <input className={inputCls} value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="e.g. ERM / Newmont" />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Brucejack Mine, BC" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Start Date *</label>
                  <input type="date" className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>End Date *</label>
                  <input type="date" className={inputCls} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional notes about the project..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white text-[#1e3829] hover:bg-white/90 transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
