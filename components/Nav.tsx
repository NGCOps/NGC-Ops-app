"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/people", label: "People" },
  { href: "/shift-prep", label: "Onboarding" },
  { href: "/logistics", label: "Movement" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-[#1e3829] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d5a3d] flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-semibold text-white text-sm hidden sm:block">NGC Ops</span>
          </div>

          <nav className="flex items-center gap-0.5">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white/90"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
