"use client";

import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-3 pb-28 md:space-y-4 md:pb-10">
        {children}
      </div>
    </div>
  );
}
