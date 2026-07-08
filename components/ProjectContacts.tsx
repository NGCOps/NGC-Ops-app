"use client";

import { useState, useTransition } from "react";
import { upsertProjectContact, deleteProjectContact } from "@/app/actions/updateProjectContact";
import type { ProjectContact } from "@/lib/data";

const inputCls = "w-full text-sm bg-white border border-stone-200 text-stone-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 placeholder:text-stone-300";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function ContactPill({ projectId, contact, onDelete, onUpdate, startExpanded }: {
  projectId: string;
  contact: ProjectContact;
  onDelete: () => void;
  onUpdate: (updated: ProjectContact) => void;
  startExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(startExpanded ?? false);
  const [form, setForm] = useState({ ...contact });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await upsertProjectContact(projectId, form);
      onUpdate(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProjectContact(projectId, contact.id);
      onDelete();
    });
  }

  return (
    <div className={expanded ? "w-full sm:w-72" : ""}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 bg-white border border-stone-200 rounded-full px-3 py-1.5 hover:border-stone-300 hover:bg-stone-50 transition-all text-sm font-medium text-stone-700 w-full sm:w-auto"
      >
        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {initials(contact.name)}
        </span>
        <span className="truncate">{contact.name || "New contact"}</span>
        {contact.role && <span className="text-stone-400 font-normal truncate">· {contact.role}</span>}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Role</label>
              <input className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Site Contact, Project Manager…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@client.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Phone</label>
              <input type="tel" className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(250) 555-0100" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={isPending || !form.name}
                className="bg-[#1e3829] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2d5240] disabled:opacity-50 transition-colors">
                {isPending ? "Saving…" : "Save"}
              </button>
              {saved && <span className="text-xs text-emerald-600 font-medium">Saved ✓</span>}
            </div>
            <button onClick={handleDelete} disabled={isPending} className="text-xs text-stone-400 hover:text-red-500 transition-colors">
              Remove contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectContacts({ projectId, contacts }: { projectId: string; contacts: ProjectContact[] }) {
  const [list, setList] = useState<ProjectContact[]>(contacts);
  const existingIds = useState(() => new Set(contacts.map((c) => c.id)))[0];

  function addContact() {
    const newContact: ProjectContact = {
      id: `${projectId}-contact-${crypto.randomUUID().slice(0, 8)}`,
      name: "", role: "", email: "", phone: "",
    };
    setList((prev) => [...prev, newContact]);
  }

  return (
    <div className="flex flex-wrap gap-2 items-start">
      {list.length === 0 && (
        <p className="text-sm text-stone-400 italic">No contacts on file yet.</p>
      )}
      {list.map((contact) => (
        <ContactPill
          key={contact.id}
          projectId={projectId}
          contact={contact}
          startExpanded={!existingIds.has(contact.id)}
          onDelete={() => setList((prev) => prev.filter((c) => c.id !== contact.id))}
          onUpdate={(updated) => setList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
        />
      ))}
      <button
        onClick={addContact}
        className="flex items-center gap-2 bg-white border border-dashed border-stone-300 rounded-full px-3 py-1.5 hover:border-stone-400 hover:bg-stone-50 transition-all text-sm font-medium text-stone-400 hover:text-stone-600"
      >
        + Add contact
      </button>
    </div>
  );
}
