"use client";
import { useMemo } from "react";

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
  const counts: Record<CategoryKey, number> = useMemo(() => ({
    all: movementTodos.length + hotelTodos.length + onboardingTodos.length + certTodos.length,
    movement: movementTodos.length,
    hotel: hotelTodos.length,
    certification: onboardingTodos.filter((t) => t.category === "certification").length + certTodos.length,
    compliance: onboardingTodos.filter((t) => t.category === "compliance").length,
    safety: onboardingTodos.filter((t) => t.category === "safety").length,
  }), [movementTodos, hotelTodos, onboardingTodos, certTodos]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Outstanding</h2>
        <span className="text-xs text-stone-400">{counts.all} items</span>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ key, label }) => {
          const count = counts[key];
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-500 border border-stone-200"
            >
              {label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  count > 0 ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-400"
                }`}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
