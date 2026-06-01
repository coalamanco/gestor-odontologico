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
    <div className="premium-kpi group relative min-h-[132px] overflow-hidden">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--clinic-primary-soft)] opacity-70 transition group-hover:scale-110" />

      <div className="relative flex h-full items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="premium-kpi-label">{title}</p>

          <h2 className="mt-3 premium-kpi-value">
            {loading ? "..." : value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-[12px] font-semibold text-[var(--clinic-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`
            flex h-14 w-14 shrink-0 items-center justify-center
            rounded-[20px] text-white shadow-lg
            ${iconClassName}
          `}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
