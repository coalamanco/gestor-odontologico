"use client";

import type { ReactNode } from "react";

type PremiumCardProps = {
  children: ReactNode;
  className?: string;
};

export function PremiumCard({
  children,
  className = "",
}: PremiumCardProps) {
  return (
    <div
      className={`
        premium-card
        p-5
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function PremiumCardSoft({
  children,
  className = "",
}: PremiumCardProps) {
  return (
    <div
      className={`
        premium-card-soft
        p-5
        ${className}
      `}
    >
      {children}
    </div>
  );
}

type PremiumCardHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
};

export function PremiumCardHeader({
  title,
  subtitle,
  icon,
}: PremiumCardHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {icon && (
        <div className="rounded-[18px] bg-[var(--clinic-primary-soft)] p-3 text-[var(--clinic-primary)]">
          {icon}
        </div>
      )}

      <div>
        <h2 className="premium-section-title">
          {title}
        </h2>

        {subtitle && (
          <p className="premium-section-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

type PremiumCardContentProps = {
  children: ReactNode;
  className?: string;
};

export function PremiumCardContent({
  children,
  className = "",
}: PremiumCardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}