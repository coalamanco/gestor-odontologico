"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user && pathname !== "/login") {
        router.replace("/login");
        return;
      }

      if (data.user && pathname === "/login") {
        router.replace("/");
        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7ffff] text-slate-500">
        Verificando acesso...
      </div>
    );
  }

  return <>{children}</>;
}