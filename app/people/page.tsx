import { getPeople } from "@/lib/data";
import { dbGetProjects, dbGetAllCertifications } from "@/lib/db-data";
import { workerQualifiesFor } from "@/lib/tiers";
import { clientColor } from "@/lib/colors";
import Link from "next/link";
import type { PersonGroup } from "@/lib/data";

export const dynamic = "force-dynamic";

const groups: { key: PersonGroup; label: string; dim?: boolean }[] = [
  { key: "env-tech", label: "Environmental Technicians" },
  { key: "ngc-management", label: "NGC Management" },
  { key: "katc-supervisor", label: "KATC Forestry / Parks Supervisors" },
  { key: "bc-parks", label: "BC Parks Staff", dim: true },
];

const groupColors: Record<PersonGroup, string> = {
  "ngc-management":  "bg-blue-700",
  "katc-supervisor": "bg-violet-700",
  "bc-parks":        "bg-emerald-700",
  "env-tech":        "bg-amber-600",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default async function PeoplePage() {
  const people = getPeople().filter((p) => p.active);
  const [projects, allCerts] = await Promise.all([dbGetProjects(), dbGetAllCertifications()]);

  // Only projects with cert requirements defined can generate qualification dots
  const qualifyingProjects = projects.filter((p) => p.requiredCerts?.length);

  const certsByWorker = new Map<string, typeof allCerts>();
  for (const cert of allCerts) {
    if (!certsByWorker.has(cert.workerId)) certsByWorker.set(cert.workerId, []);
    certsByWorker.get(cert.workerId)!.push(cert);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">People</h1>
        <p className="text-sm text-stone-400 mt-1">{people.length} active team members</p>
      </div>

      {groups.map(({ key, label, dim }) => {
        const members = people.filter((p) => p.group === key);
        if (members.length === 0) return null;
        return (
          <section key={key} className={dim ? "opacity-50" : ""}>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">{label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((person) => {
                const wCerts = certsByWorker.get(person.id) ?? [];
                const qualifiedFor = qualifyingProjects.filter((p) => workerQualifiesFor(wCerts, p));
                return (
                  <Link key={person.id} href={`/people/${person.id}`}>
                    <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3 hover:border-stone-300 hover:bg-stone-50 transition-all cursor-pointer">
                      <div className={`${groupColors[person.group]} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}>
                        <span className="text-white text-sm font-semibold">{initials(person.name)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-stone-900">{person.name}</div>
                        <div className="text-sm text-stone-500 truncate">{person.role}</div>
                        {qualifiedFor.length > 0 ? (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {qualifiedFor.map((p) => (
                              <span
                                key={p.id}
                                title={p.name}
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: clientColor(p.client).border }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-stone-300 mt-1">No project certs on file</div>
                        )}
                      </div>
                      <div className="text-stone-300 shrink-0">›</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
