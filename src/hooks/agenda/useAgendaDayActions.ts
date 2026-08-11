"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

type UseAgendaDayActionsParams = {
  filteredAppointmentsByProfessional: any[];
  maxPatientsDay: number;
  agendaAlerts: {
    naoConfirmados: any[];
  };
  setStatusFilter: (status: string) => void;
  loadData: () => Promise<any> | any;
};

export function useAgendaDayActions({
  filteredAppointmentsByProfessional,
  maxPatientsDay,
  agendaAlerts,
  setStatusFilter,
  loadData,
}: UseAgendaDayActionsParams) {
  const [confirmingAllToday, setConfirmingAllToday] = useState(false);

  const getDayOccupation = useCallback(
    (targetDate: string) => {
      const dayAppointments = filteredAppointmentsByProfessional.filter(
        (appointment) =>
          appointment.date === targetDate && appointment.type !== "compromisso"
      );

      return {
        used: dayAppointments.length,
        total: maxPatientsDay,
      };
    }, [filteredAppointmentsByProfessional, maxPatientsDay]
  );

  const confirmAllTodayAppointments = useCallback(async () => {
    const appointmentsToConfirm = agendaAlerts.naoConfirmados;

    if (appointmentsToConfirm.length === 0) {
      alert("Não há consultas agendadas para confirmar hoje.");
      return;
    }

    const ok = window.confirm(
      `Confirmar ${appointmentsToConfirm.length} consulta(s) de hoje?`
    );

    if (!ok) return;

    try {
      setConfirmingAllToday(true);

      const ids = appointmentsToConfirm.map((item) => item.id);

      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmado" })
        .in("id", ids);

      if (error) {
        alert("Erro ao confirmar consultas: " + error.message);
        return;
      }

      setStatusFilter("todos");
      await loadData();

      alert("Consultas confirmadas com sucesso.");
    } finally {
      setConfirmingAllToday(false);
    }
  }, [agendaAlerts.naoConfirmados, loadData, setStatusFilter]);

  return {
    getDayOccupation,
    confirmingAllToday,
    confirmAllTodayAppointments,
  };
}
