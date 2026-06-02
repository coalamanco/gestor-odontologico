"use client";

import type { ReactNode } from "react";

type PremiumDashboardPanelProps = {
  children: ReactNode;
  className?: string;
};

export function PremiumDashboardPanel({
  children,
  className = "",
}: PremiumDashboardPanelProps) {
  return (
    <div className={`premium-dashboard-panel ${className}`}>
      {children}
    </div>
  );
}

export function PremiumDashboardCard({
  children,
  className = "",
}: PremiumDashboardPanelProps) {
  return (
    <div className={`premium-dashboard-card ${className}`}>
      {children}
    </div>
  );
}
