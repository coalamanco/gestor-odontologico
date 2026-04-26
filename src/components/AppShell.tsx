"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user && !isLoginPage) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      if (data.user && isLoginPage) {
        router.replace("/");
        setChecking(false);
        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [pathname, router, isLoginPage]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7ffff] text-slate-500">
        Verificando acesso...
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-h-0 bg-slate-50">
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      </main>
    </div>
  );
}