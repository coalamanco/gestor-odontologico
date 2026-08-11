"use client";

import { useRef, type MutableRefObject } from "react";
import { supabase } from "@/lib/supabase";
import {
  addDays,
  formatDate,
  formatDateBr,
  pad,
  timeToMinutes,
  type AppointmentStatus,
  type ConsultaMotivo,
} from "@/lib/agenda/agendaUtils";

type UseAgendaAppointmentActionsParams = {
  patients: any[];
  appointments: any[];
  setAppointments: (updater: any) => void;
  scheduleBlocks: any[];
  clinicSettings: any;
  hours: string[];
  loadData: () => Promise<any>;
  selectedAgendaProfessionalId: string;
  draggingId: string | null;
  isResizingRef: MutableRefObject<boolean>;
  suppressNextClickRef: MutableRefObject<boolean>;
  setSelectedAppointmentDetails: (value: any) => void;
  resetForm: () => void;
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  editingId: string | null;
  setEditingId: (value: string | null) => void;
  search: string;
  setSearch: (value: string) => void;
  selectedPatient: any;
  setSelectedPatient: (value: any) => void;
  selectedProfessionalId: string;
  setSelectedProfessionalId: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  mainType: string;
  setMainType: (value: any) => void;
  consultaMotivo: string;
  setConsultaMotivo: (value: ConsultaMotivo) => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  appointmentStatus: AppointmentStatus;
  setAppointmentStatus: (value: AppointmentStatus) => void;
  reminderEnabled: boolean;
  setReminderEnabled: (value: boolean) => void;
  reminderBeforeHours: string;
  setReminderBeforeHours: (value: string) => void;
  setSavingAppointment: (value: boolean) => void;
};

export function useAgendaAppointmentActions({
  patients,
  appointments,
  setAppointments,
  scheduleBlocks,
  clinicSettings,
  hours,
  loadData,
  selectedAgendaProfessionalId,
  draggingId,
  isResizingRef,
  suppressNextClickRef,
  setSelectedAppointmentDetails,
  resetForm,
  setShowModal,
  editingId,
  setEditingId,
  setSearch,
  selectedPatient,
  setSelectedPatient,
  selectedProfessionalId,
  setSelectedProfessionalId,
  date,
  setDate,
  time,
  setTime,
  mainType,
  setMainType,
  consultaMotivo,
  setConsultaMotivo,
  title,
  setTitle,
  description,
  setDescription,
  duration,
  setDuration,
  appointmentStatus,
  setAppointmentStatus,
  reminderEnabled,
  setReminderEnabled,
  reminderBeforeHours,
  setReminderBeforeHours,
  setSavingAppointment,
}: UseAgendaAppointmentActionsParams) {
  const savingAppointmentRef = useRef(false);

  const updateAppointmentStatus = async (
    appointmentId: string,
    nextStatus: AppointmentStatus
  ) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: nextStatus })
      .eq("id", appointmentId);

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    setSelectedAppointmentDetails((prev: any) =>
      prev && prev.id === appointmentId ? { ...prev, status: nextStatus } : prev
    );

    await loadData();
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const ok = window.confirm(
      "Deseja realmente excluir este agendamento? Essa ação não pode ser desfeita."
    );

    if (!ok) return;

    try {
      const response = await fetch("/api/google/calendar/delete-appointment", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Resposta completa ao excluir agendamento:", result);
        alert(JSON.stringify(result, null, 2));
        return;
      }

      if (result?.googleDeleted === false) {
        console.warn(
          "Agendamento excluído do sistema, mas o evento Google não foi encontrado.",
          result
        );
      }

      setSelectedAppointmentDetails(null);
      await loadData();
    } catch (error) {
      console.error("Erro inesperado ao excluir agendamento:", error);
      alert("Erro inesperado ao excluir agendamento.");
    }
  };

  const isSlotAvailable = (
    targetDate: string,
    targetTime: string,
    targetDuration: number,
    ignoreId?: string | null,
    targetProfessionalId?: string | null
  ) => {
    void ignoreId;

    const start = timeToMinutes(targetTime);
    const end = start + targetDuration;
    const dayStart = clinicSettings.start_hour * 60;
    const dayEnd = clinicSettings.end_hour * 60;

    if (start < dayStart || end > dayEnd) return false;

    const hasBlockingScheduleBlock = scheduleBlocks.some((block) => {
      if (block.date !== targetDate) return false;

      const blockAppliesToProfessional = !block.professional_id
        ? true
        : targetProfessionalId
          ? block.professional_id === targetProfessionalId
          : false;

      if (!blockAppliesToProfessional) return false;

      const blockStart = block.all_day
        ? dayStart
        : timeToMinutes(block.start_time || `${pad(clinicSettings.start_hour)}:00`);
      const blockEnd = block.all_day
        ? dayEnd
        : timeToMinutes(block.end_time || `${pad(clinicSettings.end_hour)}:00`);

      return start < blockEnd && end > blockStart;
    });

    return !hasBlockingScheduleBlock;
  };

  const findNextAvailableSlot = (
    fromDate = new Date(),
    targetDuration = 30,
    ignoreId?: string | null
  ) => {
    for (let dayOffset = 0; dayOffset < 45; dayOffset++) {
      const candidateDate = addDays(fromDate, dayOffset);
      const candidateDateKey = formatDate(candidateDate);
      if (candidateDate.getDay() === 0) continue;

      for (const candidateTime of hours) {
        const candidateDateTime = new Date(`${candidateDateKey}T${candidateTime}:00`);
        if (dayOffset === 0 && candidateDateTime <= new Date()) continue;

        if (
          isSlotAvailable(
            candidateDateKey,
            candidateTime,
            targetDuration,
            ignoreId,
            selectedAgendaProfessionalId
          )
        ) {
          return { date: candidateDateKey, time: candidateTime };
        }
      }
    }

    return null;
  };

  const syncGoogleCalendarEvent = async (appointmentId?: string | null) => {
    if (!appointmentId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("Google Agenda não sincronizado: usuário não autenticado.");
        return;
      }

      const response = await fetch("/api/google/calendar/update-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, userId: user.id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        console.warn("Não foi possível sincronizar alteração com Google Agenda:", result);
      }
    } catch (error) {
      console.error("Erro ao sincronizar Google Agenda:", error);
    }
  };

  const updateAppointment = async (id: string, payload: any) => {
    const previousAppointment = appointments.find((item) => item.id === id);

    setAppointments((prev: any[]) =>
      prev.map((item) => (item.id === id ? { ...item, ...payload } : item))
    );

    const { error } = await supabase.from("appointments").update(payload).eq("id", id);

    if (error) {
      if (previousAppointment) {
        setAppointments((prev: any[]) =>
          prev.map((item) => (item.id === id ? previousAppointment : item))
        );
      } else {
        await loadData();
      }

      alert("Erro ao atualizar: " + error.message);
      return false;
    }

    void syncGoogleCalendarEvent(id);
    return true;
  };

  const openNew = (selectedDate?: string, selectedTime?: string) => {
    if (isResizingRef.current || suppressNextClickRef.current || draggingId) return;

    resetForm();
    if (selectedAgendaProfessionalId) {
      setSelectedProfessionalId(selectedAgendaProfessionalId);
    }
    if (selectedDate) setDate(selectedDate);
    if (selectedTime) setTime(selectedTime);
    setShowModal(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setDate(a.date || "");
    setTime(a.start_time || "08:00");
    setDuration(String(a.duration || 30));
    setDescription(a.description || "");
    setAppointmentStatus((a.status || "agendado") as AppointmentStatus);
    setSelectedProfessionalId(a.professional_id || "");
    setReminderEnabled(a.reminder_enabled ?? true);
    setReminderBeforeHours(String(a.reminder_before_hours ?? 24));

    if (a.type === "compromisso") {
      setMainType("compromisso");
      setTitle(a.title || "");
      setSelectedPatient(null);
      setSearch("");
    } else {
      setMainType("consulta");
      const motivo = (a.title || "consulta").toLowerCase();
      if (motivo === "retorno" || motivo === "tratamento" || motivo === "consulta") {
        setConsultaMotivo(motivo as ConsultaMotivo);
      } else {
        setConsultaMotivo("consulta");
      }

      if (a.patient_id) {
        const patient = patients.find((item) => item.id === a.patient_id);
        if (patient) {
          setSelectedPatient(patient);
          setSearch(patient.name);
        } else {
          setSelectedPatient(null);
          setSearch(a.patient_name || "");
        }
      } else {
        setSelectedPatient(null);
        setSearch(a.patient_name || "");
      }
    }

    setShowModal(true);
  };

  const openSmartReschedule = (appointment: any) => {
    const nextSlot = findNextAvailableSlot(
      new Date(),
      Number(appointment.duration || 30),
      appointment.id
    );

    if (!nextSlot) {
      alert("Não encontrei horário livre nos próximos 45 dias.");
      return;
    }

    setSelectedAppointmentDetails(null);
    openEdit(appointment);
    setDate(nextSlot.date);
    setTime(nextSlot.time);
    setAppointmentStatus("agendado");

    alert(
      `Próximo horário livre encontrado: ${formatDateBr(nextSlot.date)} às ${nextSlot.time}. Confira e clique em Salvar.`
    );
  };

  const handleSave = async () => {
    if (savingAppointmentRef.current) return;

    if (!date || !time) {
      alert("Informe a data e a hora.");
      return;
    }

    if (mainType === "consulta" && !selectedPatient) {
      alert("Selecione um paciente.");
      return;
    }

    const parsedDuration = parseInt(duration);
    if (!isSlotAvailable(date, time, parsedDuration, editingId, selectedProfessionalId)) {
      alert("Esse horário já está ocupado ou ultrapassa o fim do expediente.");
      return;
    }

    savingAppointmentRef.current = true;
    setSavingAppointment(true);

    try {
      const payload = {
        patient_id: mainType === "consulta" ? selectedPatient?.id || null : null,
        patient_name: mainType === "consulta" ? selectedPatient?.name || null : null,
        professional_id: selectedProfessionalId || null,
        type: mainType,
        title: mainType === "consulta" ? consultaMotivo : title,
        description,
        date,
        start_time: time,
        duration: parsedDuration,
        status: appointmentStatus,
        reminder_enabled: mainType === "consulta" ? reminderEnabled : false,
        reminder_before_hours:
          mainType === "consulta" ? parseInt(reminderBeforeHours) : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          alert("Erro ao editar: " + error.message);
          return;
        }

        setShowModal(false);
        resetForm();
        await loadData();

        if (String(mainType).toLowerCase() === "consulta") {
          void syncGoogleCalendarEvent(editingId);
        }
      } else {
        if (mainType === "consulta" && selectedPatient?.id) {
          let duplicateQuery = supabase
            .from("appointments")
            .select("id")
            .eq("patient_id", selectedPatient.id)
            .eq("date", date)
            .eq("start_time", time)
            .eq("type", "consulta")
            .limit(1);

          duplicateQuery = selectedProfessionalId
            ? duplicateQuery.eq("professional_id", selectedProfessionalId)
            : duplicateQuery.is("professional_id", null);

          const { data: duplicateAppointments, error: duplicateError } =
            await duplicateQuery;

          if (duplicateError) {
            alert("Erro ao verificar duplicidade: " + duplicateError.message);
            return;
          }

          if (duplicateAppointments && duplicateAppointments.length > 0) {
            alert("Este paciente já possui um agendamento neste mesmo dia e horário.");
            return;
          }
        }

        const { data: createdAppointment, error } = await supabase
          .from("appointments")
          .insert([payload])
          .select("id")
          .single();

        if (error) {
          alert("Erro ao salvar: " + error.message);
          return;
        }

        const createdAppointmentId = createdAppointment?.id;
        setShowModal(false);
        resetForm();
        await loadData();

        if (String(mainType).toLowerCase() === "consulta") {
          console.log(
            "Consulta salva. O lembrete será enviado automaticamente pelo cron-job.org no horário configurado."
          );
          void syncGoogleCalendarEvent(createdAppointmentId);
        }
      }
    } finally {
      savingAppointmentRef.current = false;
      setSavingAppointment(false);
    }
  };

  return {
    updateAppointmentStatus,
    handleDeleteAppointment,
    isSlotAvailable,
    openSmartReschedule,
    syncGoogleCalendarEvent,
    updateAppointment,
    handleSave,
    openNew,
    openEdit,
  };
}
