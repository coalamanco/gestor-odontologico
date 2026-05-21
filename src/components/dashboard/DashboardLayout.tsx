"use client";

import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] px-2 pb-20 pt-1 sm:px-4 sm:pb-10 sm:pt-2">
      <div className="mx-auto max-w-7xl space-y-3 md:space-y-4">
        {children}
      </div>
    </div>
  );
}