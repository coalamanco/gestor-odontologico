"use client";

import type { ReactNode } from "react";

type PremiumSectionProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function PremiumSection({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: PremiumSectionProps) {
  return (
    <section
      className={`
        overflow-hidden
        rounded-[28px]
        border border-[var(--clinic-border)]
        bg-white
        shadow-[0_8px_24px_rgba(35,157,154,0.05)]
        ${className}
      `}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-col gap-4 border-b border-[var(--clinic-border)] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            {title && (
              <h2 className="text-[26px] font-black tracking-[-0.03em] text-[var(--clinic-text)]">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="mt-1 text-sm text-[var(--clinic-text-soft)]">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}