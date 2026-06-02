"use client";

import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-full w-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] pb-20 pt-1 sm:pb-10 sm:pt-2">
      <div className="w-full space-y-3 md:space-y-4">
        {children}
      </div>
    </div>
  );
}