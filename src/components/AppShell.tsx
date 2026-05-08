"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffafa] text-slate-500">
        Verificando acesso...
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fffafa]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#fffafa]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#ead4da] bg-white/95 px-4 shadow-sm backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ead4da] bg-[#fff1f4] text-[#7a1f35] shadow-sm"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0 text-center">
            <div className="truncate text-sm font-black text-slate-800">
              Gestor Odontológico
            </div>
            <div className="truncate text-[11px] font-bold uppercase tracking-wide text-[#7a1f35]">
              Sistema ativo
            </div>
          </div>

          <div className="h-10 w-10 shrink-0" />
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}