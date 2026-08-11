import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { pad } from "@/lib/agenda/agendaUtils";

type AgendaDay = {
  date: string;
};

type UseAgendaPageEffectsParams = {
  days: AgendaDay[];
  showModal: boolean;
  selectedAppointmentDetails: any | null;
  selectedAgendaProfessionalId: string;
  clinicStartHour: number;
  openNew: (date?: string, time?: string) => void;
  setWeekBaseDate: (date: Date) => void;
  refreshFinancialData: () => void | Promise<void>;
};

export function useAgendaPageEffects({
  days,
  showModal,
  selectedAppointmentDetails,
  selectedAgendaProfessionalId,
  clinicStartHour,
  openNew,
  setWeekBaseDate,
  refreshFinancialData,
}: UseAgendaPageEffectsParams) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        showModal ||
        selectedAppointmentDetails
      ) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNew(days[0]?.date, `${pad(clinicStartHour)}:00`);
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        setWeekBaseDate(new Date());
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    days,
    showModal,
    selectedAppointmentDetails,
    selectedAgendaProfessionalId,
    clinicStartHour,
    openNew,
    setWeekBaseDate,
  ]);

  useEffect(() => {
    const handleFocus = () => {
      refreshFinancialData();
    };

    window.addEventListener("focus", handleFocus);

    const channel = supabase
      .channel("agenda-financial-records-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_records",
        },
        () => {
          refreshFinancialData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_transactions",
        },
        () => {
          refreshFinancialData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
    };
  }, [refreshFinancialData]);
}
