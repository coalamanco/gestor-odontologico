"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PremiumPageHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
};

export default function PremiumPageHeader({
  title,
  eyebrow,
  subtitle,
  icon: Icon,
  actions,
}: PremiumPageHeaderProps) {
  return (
    <section className="premium-header relative z-[70] overflow-hidden px-5 md:px-7">
      <div className="pointer-events-none absolute -right-14 -top-24 h-52 w-52 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute -bottom-28 left-12 h-48 w-48 rounded-full bg-white/10" />

      <div className="relative z-10 flex min-h-[76px] flex-col justify-center gap-3 py-3 md:flex-row md:items-center md:justify-between md:py-0">
        <div className="flex min-w-0 items-center gap-4">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] border border-white/25 bg-white/18 text-white shadow-sm backdrop-blur">
              <Icon size={24} />
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <div className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50/95">
                {eyebrow}
              </div>
            )}

            <h1 className="truncate text-[20px] font-black leading-tight text-white md:text-[23px]">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 max-w-4xl truncate text-[12px] font-semibold text-cyan-50/90 md:text-[13px]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
