import { getPeople, getCertTypes, isCertExpired, isCertExpiringSoon } from "@/lib/data";
import { dbGetAllCertifications, dbGetCertTypes } from "@/lib/db-data";
import type { PersonGroup } from "@/lib/data";
import CertEditor from "@/components/CertEditor";

export const dynamic = "force-dynamic";

const groups: { key: PersonGroup; label: string }[] = [
  { key: "env-tech", label: "Environmental Technicians" },
  { key: "katc-supervisor", label: "KATC Supervisors" },
  { key: "bc-parks", label: "BC Parks Staff" },
  { key: "ngc-management", label: "NGC Management" },
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

export default async function CertificationsPage() {
  const people = getPeople().filter((p) => p.active);
  const [certTypes, allCerts] = await Promise.all([dbGetCertTypes(), dbGetAllCertifications()]);

  const certsByWorker = new Map<string, typeof allCerts>();
  for (const cert of allCerts) {
    if (!certsByWorker.has(cert.workerId)) certsByWorker.set(cert.workerId, []);
    certsByWorker.get(cert.workerId)!.push(cert);
  }

  let totalExpired = 0, totalExpiring = 0, totalValid = 0;
  for (const cert of allCerts) {
    if (isCertExpired(cert)) totalExpired++;
    else if (isCertExpiringSoon(cert)) totalExpiring++;
    else totalValid++;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Certifications</h1>
          <p className="text-sm text-stone-400 mt-1">Master cert record — per worker, source-tracked</p>
        </div>
        <div className="flex gap-3">
          {totalExpired > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
              <div className="text-lg font-bold text-red-600">{totalExpired}</div>
              <div className="text-xs text-red-500">Expired</div>
            </div>
          )}
          {totalExpiring > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
              <div className="text-lg font-bold text-amber-600">{totalExpiring}</div>
              <div className="text-xs text-amber-600">Expiring soon</div>
            </div>
          )}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center">
            <div className="text-lg font-bold text-emerald-600">{totalValid}</div>
            <div className="text-xs text-emerald-600">Valid</div>
          </div>
        </div>
      </div>

      {groups.map(({ key, label }) => {
        const members = people.filter((p) => p.group === key);
        if (members.length === 0) return null;
        return (
          <section key={key}>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">{label}</h2>
            <div className="space-y-4">
              {members.map((person) => {
                const certs = certsByWorker.get(person.id) ?? [];
                const expired = certs.filter(isCertExpired).length;
                const expiring = certs.filter((c) => !isCertExpired(c) && isCertExpiringSoon(c)).length;
                return (
                  <div key={person.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
                      <div className={`${groupColors[person.group]} w-9 h-9 rounded-full flex items-center justify-center shrink-0`}>
                        <span className="text-white text-sm font-semibold">{initials(person.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-900">{person.name}</div>
                        <div className="text-xs text-stone-400">{person.role}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {expired > 0 && <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{expired} expired</span>}
                        {expiring > 0 && <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">{expiring} expiring</span>}
                        {certs.length === 0 && <span className="text-xs text-stone-300 italic">No records</span>}
                        {certs.length > 0 && !expired && !expiring && <span className="text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">{certs.length} valid</span>}
                      </div>
                    </div>
                    <div className="p-4">
                      <CertEditor workerId={person.id} certTypes={certTypes} existing={certs} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
