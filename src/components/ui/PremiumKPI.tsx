"use client";

import type { LucideIcon } from "lucide-react";

type PremiumKPIProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  loading?: boolean;
  iconClassName?: string;
};

export default function PremiumKPI({
  title,
  value,
  subtitle,
  icon: Icon,
  loading = false,
  iconClassName = "bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]",
}: PremiumKPIProps) {
  return (
    <div className="premium-kpi group relative min-h-[162px] overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--clinic-primary-soft)] opacity-80 transition duration-300 group-hover:scale-110" />
      <div className="absolute -bottom-16 -left-12 h-28 w-28 rounded-full bg-[var(--clinic-primary-softer)] opacity-70" />

      <div className="relative flex h-full items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="premium-kpi-label text-[11px] tracking-[0.14em]">
            {title}
          </p>

          <h2 className="mt-4 text-[28px] font-black leading-none tracking-[-0.04em] text-[var(--clinic-text)] md:text-[30px]">
            {loading ? "..." : value}
          </h2>

          {subtitle && (
            <p className="mt-4 max-w-[92%] text-[13px] font-semibold leading-5 text-[var(--clinic-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`
            flex h-16 w-16 shrink-0 items-center justify-center
            rounded-[24px] text-white shadow-xl
            transition duration-300 group-hover:scale-105
            ${iconClassName}
          `}
        >
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}
