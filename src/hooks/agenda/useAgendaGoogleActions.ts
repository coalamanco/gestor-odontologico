"use client";

import { supabase } from "@/lib/supabase";

type UseAgendaGoogleActionsParams = {
  loadData: () => Promise<unknown>;
};

export function useAgendaGoogleActions({ loadData }: UseAgendaGoogleActionsParams) {
  const connectGoogleCalendar = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Usuário não autenticado.");
        return;
      }

      window.location.href = `/api/google/calendar/connect?userId=${user.id}`;
    } catch (error) {
      console.error("Erro ao conectar Google Agenda:", error);
      alert("Erro ao conectar Google Agenda.");
    }
  };

  const syncExistingGoogleAppointments = async () => {
    const ok = window.confirm(
      "Deseja sincronizar as consultas existentes com o Google Agenda? Isso pode levar alguns segundos."
    );

    if (!ok) return;

    try {
      const response = await fetch("/api/google/calendar/sync-existing", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Erro ao sincronizar consultas antigas:", result);
        alert(
          result?.error ||
            result?.details ||
            "Erro ao sincronizar consultas antigas com Google Agenda."
        );
        return;
      }

      alert(
        `Sincronização concluída. Criados: ${result?.created || 0}. Vinculados: ${result?.linked || 0}. Ignorados: ${result?.skipped || 0}. Erros: ${result?.errors || 0}.`
      );

      await loadData();
    } catch (error) {
      console.error("Erro inesperado ao sincronizar consultas antigas:", error);
      alert("Erro inesperado ao sincronizar consultas antigas.");
    }
  };

  return {
    connectGoogleCalendar,
    syncExistingGoogleAppointments,
  };
}
