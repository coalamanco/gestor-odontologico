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
    <section className="relative overflow-hidden rounded-[28px] border border-[#bfe9e8] bg-gradient-to-r from-[#239d9a] via-[#46c1bf] to-[#9be4e1] px-4 shadow-[0_10px_28px_rgba(35,157,154,0.12)] md:px-6">
      <div className="absolute -right-16 -top-24 h-44 w-44 rounded-full bg-white/18" />
      <div className="absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-white/10" />

      <div className="relative z-10 flex min-h-[72px] flex-col justify-center gap-3 py-3 md:min-h-[72px] md:flex-row md:items-center md:justify-between md:py-0">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/18 text-white shadow-sm backdrop-blur">
              <Icon size={22} />
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <div className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/95">
                {eyebrow}
              </div>
            )}

            <h1 className="truncate text-[15px] font-black uppercase tracking-[0.12em] text-white md:text-[16px]">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-0.5 max-w-2xl truncate text-[11px] font-semibold text-cyan-50/90">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
