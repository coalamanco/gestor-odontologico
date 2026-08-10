import { useMemo } from "react";
import {
  SLOT_HEIGHT,
  formatDate,
  getFallbackAppointmentColor,
  getProfessionalColor,
  getProfessionalInitials,
  minutesBetweenTimes,
  pad,
} from "@/lib/agenda/agendaUtils";

type UseAgendaDerivedDataParams = {
  activeProfessionals: any[];
  appointments: any[];
  scheduleBlocks: any[];
  selectedAgendaProfessionalId: string;
  clinicSettings: any;
  hasDebt: (patientId?: string | null) => boolean;
};

export function useAgendaDerivedData({
  activeProfessionals,
  appointments,
  scheduleBlocks,
  selectedAgendaProfessionalId,
  clinicSettings,
  hasDebt,
}: UseAgendaDerivedDataParams) {
  const selectedAgendaProfessional = useMemo(() => {
    if (!selectedAgendaProfessionalId) return null;

    return (
      activeProfessionals.find(
        (professional) => professional.id === selectedAgendaProfessionalId
      ) || null
    );
  }, [activeProfessionals, selectedAgendaProfessionalId]);

  const filteredAppointmentsByProfessional = useMemo(() => {
    if (!selectedAgendaProfessionalId) return appointments;

    return appointments.filter(
      (appointment) => appointment.professional_id === selectedAgendaProfessionalId
    );
  }, [appointments, selectedAgendaProfessionalId]);

  const selectedProfessionalInitials = useMemo(
    () =>
      selectedAgendaProfessionalId
        ? getProfessionalInitials(selectedAgendaProfessional?.name)
        : "TP",
    [selectedAgendaProfessional, selectedAgendaProfessionalId]
  );

  const selectedProfessionalColor = useMemo(
    () =>
      selectedAgendaProfessionalId
        ? getProfessionalColor(selectedAgendaProfessionalId)
        : "#239d9a",
    [selectedAgendaProfessionalId]
  );

  const getAppointmentStyle = (appointment: any) => ({
    backgroundColor: getFallbackAppointmentColor(
      appointment?.status,
      appointment?.type,
      appointment?.title
    ),
  });

  const filteredScheduleBlocksByProfessional = useMemo(() => {
    if (!selectedAgendaProfessionalId) return scheduleBlocks;

    return scheduleBlocks.filter(
      (block) =>
        !block.professional_id ||
        block.professional_id === selectedAgendaProfessionalId
    );
  }, [scheduleBlocks, selectedAgendaProfessionalId]);

  const getScheduleBlocksForSlot = (targetDate: string, targetTime: string) =>
    filteredScheduleBlocksByProfessional.filter((block) => {
      if (block.date !== targetDate) return false;

      if (block.all_day) {
        return targetTime === `${pad(clinicSettings.start_hour)}:00`;
      }

      return block.start_time === targetTime;
    });

  const getScheduleBlockHeight = (block: any) => {
    const durationMinutes = block.all_day
      ? (clinicSettings.end_hour - clinicSettings.start_hour) * 60
      : minutesBetweenTimes(block.start_time, block.end_time);

    const slots = Math.max(1, Math.ceil(durationMinutes / 15));
    return slots * SLOT_HEIGHT - 6;
  };

  const agendaAlerts = useMemo(() => {
    const today = formatDate(new Date());

    const todayAppointments = filteredAppointmentsByProfessional.filter(
      (appointment) =>
        appointment.date === today && appointment.type !== "compromisso"
    );

    return {
      naoConfirmados: todayAppointments.filter(
        (appointment) =>
          (appointment.status || "agendado") === "agendado"
      ),
      faltaram: todayAppointments.filter(
        (appointment) => appointment.status === "faltou"
      ),
      comDebito: todayAppointments.filter((appointment) =>
        hasDebt(appointment.patient_id)
      ),
    };
  }, [filteredAppointmentsByProfessional, hasDebt]);

  return {
    activeProfessionals,
    selectedAgendaProfessional,
    filteredAppointmentsByProfessional,
    selectedProfessionalInitials,
    selectedProfessionalColor,
    getAppointmentStyle,
    filteredScheduleBlocksByProfessional,
    getScheduleBlocksForSlot,
    getScheduleBlockHeight,
    agendaAlerts,
  };
}
