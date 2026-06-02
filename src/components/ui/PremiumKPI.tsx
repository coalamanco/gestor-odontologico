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
    <div className="premium-kpi group relative min-h-[138px] overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--clinic-primary-soft)] opacity-80 transition duration-300 group-hover:scale-105" />
      <div className="absolute -bottom-14 -left-10 h-24 w-24 rounded-full bg-[var(--clinic-primary-softer)] opacity-70" />

      <div className="relative flex h-full items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="premium-kpi-label text-[10px] tracking-[0.12em]">
            {title}
          </p>

          <h2 className="mt-3 text-[22px] font-black leading-none tracking-[-0.03em] text-[var(--clinic-text)] md:text-[24px]">
            {loading ? "..." : value}
          </h2>

          {subtitle && (
            <p className="mt-3 max-w-[95%] text-[12px] font-medium leading-4 text-[var(--clinic-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`
            flex h-14 w-14 shrink-0 items-center justify-center
            rounded-[20px] text-white shadow-lg
            transition duration-300 group-hover:scale-105
            ${iconClassName}
          `}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}