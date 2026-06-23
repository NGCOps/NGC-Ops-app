"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type CategoryKey = "all" | "movement" | "hotel" | "certification" | "compliance" | "safety";

export interface MovementTodo {
  workerId: string; workerName: string;
  projectId: string; projectName: string;
  projectStartDate: string; projectEndDate: string;
}
export interface HotelTodo {
  workerId: string; workerName: string;
  projectId: string; projectName: string;
  projectStartDate: string; projectEndDate: string;
}
export interface OnboardingTodo {
  workerId: string; workerName: string;
  projectId: string; projectName: string;
  label: string; status: string;
  deadlineDate: string; category: string;
  projectStartDate: string; projectEndDate: string;
}
export interface CertTodo {
  workerId: string; workerName: string;
  certLabel: string; expiryDate: string;
  isExpired: boolean;
}

function toDate(s: string) { return new Date(s + "T12:00:00"); }

function daysUntil(s: string) {
  const t = toDate(s).getTime();
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.ceil((t - n.getTime()) / 86400000);
}

function daysLabel(s: string) {
  const n = daysUntil(s);
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "today";
  return `in ${n}d`;
}

function projectUrgency(startDate: string, endDate: string) {
  const dStart = daysUntil(startDate);
  const dEnd = daysUntil(endDate);
  const started = dStart <= 0;

  if (started) {
    if (dEnd <= 7) return { label: `Ends in ${dEnd}d`, color: "text-red-400", dot: "bg-red-500", score: 0 };
    return { label: "In progress", color: "text-emerald-400", dot: "bg-emerald-500", score: 1 };
  }
  if (dStart <= 7) return { label: `Starts in ${dStart}d`, color: "text-red-400", dot: "bg-red-500", score: 2 };
  if (dStart <= 14) return { label: `Starts in ${dStart}d`, color: "text-amber-400", dot: "bg-amber-500", score: 3 };
  return { label: `Starts in ${dStart}d`, color: "text-stone-400", dot: "bg-stone-400", score: 4 };
}

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movement", label: "Movement" },
  { key: "hotel", label: "Hotel / Accommodation" },
  { key: "certification", label: "Certification" },
  { key: "compliance", label: "Compliance" },
  { key: "safety", label: "Safety" },
];

interface Props {
  movementTodos: MovementTodo[];
  hotelTodos: HotelTodo[];
  onboardingTodos: OnboardingTodo[];
  certTodos: CertTodo[];
}

export default function OutstandingSection({ movementTodos, hotelTodos, onboardingTodos, certTodos }: Props) {
  const [active, setActive] = useState<CategoryKey>("all");

  const counts: Record<CategoryKey, number> = useMemo(() => ({
    all: movementTodos.length + hotelTodos.length + onboardingTodos.length + certTodos.length,
    movement: movementTodos.length,
    hotel: hotelTodos.length,
    certification: onboardingTodos.filter((t) => t.category === "certification").length + certTodos.length,
    compliance: onboardingTodos.filter((t) => t.category === "compliance").length,
    safety: onboardingTodos.filter((t) => t.category === "safety").length,
  }), [movementTodos, hotelTodos, onboardingTodos, certTodos]);

  // Collect all unique projects across all todos
  const allProjectIds = useMemo(() => {
    const ids = new Map<string, { name: string; startDate: string; endDate: string }>();
    for (const t of [...movementTodos, ...hotelTodos, ...onboardingTodos]) {
      if (!ids.has(t.projectId)) ids.set(t.projectId, { name: t.projectName, startDate: t.projectStartDate, endDate: t.projectEndDate });
    }
    return [...ids.entries()]
      .map(([id, meta]) => ({ id, ...meta }))
      .sort((a, b) => projectUrgency(a.startDate, a.endDate).score - projectUrgency(b.startDate, b.endDate).score);
  }, [movementTodos, hotelTodos, onboardingTodos]);

  // Filter items by active category
  const filteredMovement = active === "all" || active === "movement" ? movementTodos : [];
  const filteredHotel = active === "all" || active === "hotel" ? hotelTodos : [];
  const filteredOnboarding = onboardingTodos.filter((t) => {
    if (active === "all") return true;
    if (active === "certification") return t.category === "certification";
    if (active === "compliance") return t.category === "compliance";
    if (active === "safety") return t.category === "safety";
    return false;
  });
  const filteredCerts = active === "all" || active === "certification" ? certTodos : [];

  const totalFiltered = filteredMovement.length + filteredHotel.length + filteredOnboarding.length + filteredCerts.length;

  // Which projects have any filtered items?
  const projectsWithItems = allProjectIds.filter((p) =>
    filteredMovement.some((t) => t.projectId === p.id) ||
    filteredHotel.some((t) => t.projectId === p.id) ||
    filteredOnboarding.some((t) => t.projectId === p.id)
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Outstanding</h2>
        <span className="text-xs text-stone-400">{counts.all} items</span>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(({ key, label }) => {
          const count = counts[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#1e3829] text-white border border-[#1e3829]"
                  : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:text-stone-700"
              }`}
            >
              {label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? count > 0 ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                    : count > 0 ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {totalFiltered === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <div className="text-emerald-700 font-semibold text-sm">All clear in this category</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Project-grouped items */}
          {projectsWithItems.map((proj) => {
            const urgency = projectUrgency(proj.startDate, proj.endDate);
            const pMovement = filteredMovement.filter((t) => t.projectId === proj.id);
            const pHotel = filteredHotel.filter((t) => t.projectId === proj.id);
            const pOnboarding = filteredOnboarding
              .filter((t) => t.projectId === proj.id)
              .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));

            const itemCount = pMovement.length + pHotel.length + pOnboarding.length;
            if (itemCount === 0) return null;

            return (
              <div key={proj.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {/* Project header */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgency.dot}`} />
                  <span className="font-semibold text-sm text-stone-800">{proj.name}</span>
                  <span className={`ml-auto text-[11px] font-medium shrink-0 ${urgency.color}`}>{urgency.label}</span>
                  <span className="text-xs bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded-full">{itemCount}</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {/* Movement */}
                  {pMovement.map((t, i) => (
                    <Link key={`m-${i}`} href="/logistics">
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors">
                        <div className="text-sm">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mr-2">Movement</span>
                          <span className="font-medium text-stone-800">{t.workerName}</span>
                          <span className="text-stone-400 ml-1.5 text-xs">no legs arranged</span>
                        </div>
                        <span className="text-xs text-red-400 font-medium shrink-0">Fix →</span>
                      </div>
                    </Link>
                  ))}

                  {/* Hotel */}
                  {pHotel.map((t, i) => (
                    <Link key={`h-${i}`} href="/logistics">
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors">
                        <div className="text-sm">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-400 mr-2">Hotel</span>
                          <span className="font-medium text-stone-800">{t.workerName}</span>
                          <span className="text-stone-400 ml-1.5 text-xs">accommodation not booked</span>
                        </div>
                        <span className="text-xs text-violet-400 font-medium shrink-0">Book →</span>
                      </div>
                    </Link>
                  ))}

                  {/* Onboarding */}
                  {pOnboarding.map((t, i) => {
                    const dl = daysUntil(t.deadlineDate);
                    const isPast = dl < 0;
                    const isUrgent = dl >= 0 && dl <= 14;
                    const categoryColor: Record<string, string> = {
                      certification: "text-blue-400",
                      compliance: "text-amber-400",
                      safety: "text-orange-400",
                    };
                    return (
                      <Link key={`o-${i}`} href="/shift-prep">
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors">
                          <div className="text-sm min-w-0 mr-4">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide mr-2 ${categoryColor[t.category] ?? "text-stone-400"}`}>
                              {t.category}
                            </span>
                            <span className="font-medium text-stone-800">{t.workerName}</span>
                            <span className="text-stone-600 ml-1.5">{t.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {t.status === "expired" && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Expired</span>
                            )}
                            <span className={`text-xs font-medium ${isPast ? "text-red-400" : isUrgent ? "text-amber-600" : "text-stone-400"}`}>
                              {daysLabel(t.deadlineDate)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Worker certs — not project-specific */}
          {filteredCerts.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                <span className="font-semibold text-sm text-stone-800">Worker Certifications</span>
                <span className="text-[11px] font-medium shrink-0 text-amber-600 ml-auto">Expiring</span>
                <span className="text-xs bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded-full">{filteredCerts.length}</span>
              </div>
              <div className="divide-y divide-stone-100">
                {filteredCerts.map((t, i) => (
                  <Link key={i} href={`/people/${t.workerId}`}>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors">
                      <div className="text-sm">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-400 mr-2">Certification</span>
                        <span className="font-medium text-stone-800">{t.workerName}</span>
                        <span className="text-stone-500 ml-1.5">{t.certLabel}</span>
                      </div>
                      <span className={`text-xs font-medium ${t.isExpired ? "text-red-400" : "text-amber-400"}`}>
                        {t.isExpired ? "Expired" : `expires ${daysLabel(t.expiryDate)}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
