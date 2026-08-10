"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAgendaData } from "@/hooks/agenda/useAgendaData";
import { useAgendaReminderActions } from "@/hooks/agenda/useAgendaReminderActions";
import { useAgendaGoogleActions } from "@/hooks/agenda/useAgendaGoogleActions";
import { useAgendaBlockActions } from "@/hooks/agenda/useAgendaBlockActions";
import { useAgendaQuickPatient } from "@/hooks/agenda/useAgendaQuickPatient";
import { useAgendaNavigation } from "@/hooks/agenda/useAgendaNavigation";
import { AgendaToolbar } from "@/components/agenda/AgendaToolbar";
import { AppointmentModal } from "@/components/agenda/AppointmentModal";
import { BlockModal } from "@/components/agenda/BlockModal";
import { WeekView } from "@/components/agenda/WeekView";
import { DayView } from "@/components/agenda/DayView";
import { AppointmentDetailsModal } from "@/components/agenda/AppointmentDetailsModal";
import { BlockDetailsModal } from "@/components/agenda/BlockDetailsModal";
import { useRouter } from "next/navigation";
import { createAgendaDisplayHelpers } from "@/lib/agenda/agendaDisplayHelpers";

import {
  SLOT_HEIGHT,
  START_HOUR,
  END_HOUR,
  addDays,
  formatDate,
  formatDateBr,
  getBlockColor,
  getBlockTypeLabel,
  getDefaultBlockTitle,
  getFallbackAppointmentColor,
  getHolidayInfo,
  getProfessionalColor,
  getProfessionalInitials,
  isTodayDate,
  minutesBetweenTimes,
  pad,
  parseHourValue,
  parsePositiveNumber,
  timeToMinutes,
  type AppointmentStatus,
  type ConsultaMotivo,
  type MainType,
} from "@/lib/agenda/agendaUtils";
export default function AgendaPage() {
  const router = useRouter();

  const {
    patients,
    setPatients,
    professionals,
    appointments,
    setAppointments,
    scheduleBlocks,
    financialRecords,
    messageTemplates,
    clinicSettings,
    loadData,
  } = useAgendaData();

  const { connectGoogleCalendar, syncExistingGoogleAppointments } =
    useAgendaGoogleActions({ loadData });

  const [showModal, setShowModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedBlockDetails, setSelectedBlockDetails] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] =
    useState<any | null>(null);

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");


  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");

  const [mainType, setMainType] = useState<MainType>("consulta");
  const [consultaMotivo, setConsultaMotivo] =
    useState<ConsultaMotivo>("consulta");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [appointmentStatus, setAppointmentStatus] =
    useState<AppointmentStatus>("agendado");

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderBeforeHours, setReminderBeforeHours] = useState("24");

  const [blockForm, setBlockForm] = useState({
    id: "",
    professional_id: "",
    block_type: "bloqueio",
    title: "Horário bloqueado",
    description: "",
    date: "",
    start_time: "12:00",
    end_time: "13:00",
    all_day: false,
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedAgendaProfessionalId, setSelectedAgendaProfessionalId] = useState<string>("");
  const [confirmingAllToday, setConfirmingAllToday] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const savingAppointmentRef = useRef(false);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartDuration, setResizeStartDuration] = useState(30);
  const resizeCurrentDurationRef = useRef(30);
  const isResizingRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const {
    showQuickPatientForm,
    savingQuickPatient,
    quickPatientForm,
    setQuickPatientForm,
    updateQuickPatientField,
    openQuickPatientForm,
    closeQuickPatientForm,
    saveQuickPatient,
    resetQuickPatientForm,
  } = useAgendaQuickPatient({
    search,
    setSearch,
    setPatients,
    setSelectedPatient,
  });

  const resetForm = () => {
    setEditingId(null);
    setSearch("");
    setSelectedPatient(null);
    setSelectedProfessionalId("");
    setDate("");
    setTime("08:00");
    setMainType("consulta");
    setConsultaMotivo("consulta");
    setTitle("");
    setDescription("");
    setDuration("30");
    setAppointmentStatus("agendado");
    setReminderEnabled(true);
    setReminderBeforeHours("24");
    resetQuickPatientForm();
  };


  const {
    openNewBlock,
    saveScheduleBlock,
    deleteScheduleBlock,
    editScheduleBlock,
  } = useAgendaBlockActions({
    blockForm,
    setBlockForm,
    setShowBlockModal,
    setSelectedBlockDetails,
    selectedAgendaProfessionalId,
    clinicSettings,
    loadData,
  });

  const {
    agendaScrollRef,
    now,
    weekBaseDate,
    setWeekBaseDate,
    mobileView,
    setMobileView,
    isMobileAgenda,
    showMiniCalendar,
    setShowMiniCalendar,
    miniCalendarDate,
    setMiniCalendarDate,
    showMobileAgendaSheet,
    setShowMobileAgendaSheet,
    days,
    miniCalendarDays,
    selectMiniCalendarDay,
    goToPreviousDay,
    goToNextDay,
    handleAgendaTouchStart,
    handleAgendaTouchEnd,
    hours,
    currentTimePosition,
  } = useAgendaNavigation({
    clinicSettings,
    interactionBlocked:
      showModal ||
      showBlockModal ||
      Boolean(selectedAppointmentDetails) ||
      Boolean(selectedBlockDetails),
  });

  const filteredPatients = useMemo(() => {
    const termo = search.toLowerCase().trim();
    if (!termo) return [];

    const startsWith = patients.filter((p) =>
      (p.name || "").toLowerCase().startsWith(termo)
    );

    const includes = patients.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(termo) &&
        !(p.name || "").toLowerCase().startsWith(termo)
    );

    return [...startsWith, ...includes].slice(0, 8);
  }, [search, patients]);

  const {
    getPatientDebt,
    hasDebt,
    formatCurrency,
    openPatientFinance,
    refreshFinancialData,
    getColor,
    statusLabel,
    statusBadgeClass,
    appointmentTypeLabel,
    slotDividerClass,
    timeColumnClass,
    getDurationHeight,
    getPatientByAppointment,
    getAppointmentPatientName,
    getProfessionalById,
    getProfessionalLabel,
    activeProfessionals,
  } = createAgendaDisplayHelpers({
    financialRecords,
    patients,
    professionals,
    router,
    loadData,
  });

  const getDayOccupation = (targetDate: string) => {
    const dayAppointments = filteredAppointmentsByProfessional.filter(
      (a) => a.date === targetDate && a.type !== "compromisso"
    );

    return {
      used: dayAppointments.length,
      total: clinicSettings.max_patients_day,
    };
  };

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId,
        }),
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

  const {
    buildWhatsappHref,
    hasReminderPhone,
    markReminderAsSent,
  } = useAgendaReminderActions({
    getPatientByAppointment,
    messageTemplates,
    getPatientDebt,
    formatCurrency,
    loadData,
    setSelectedAppointmentDetails,
  });

  const isSlotAvailable = (
    targetDate: string,
    targetTime: string,
    targetDuration: number,
    ignoreId?: string | null,
    targetProfessionalId?: string | null
  ) => {
    void ignoreId;

    // Permite encaixes entre consultas no mesmo horário, como no Google Agenda.
    // Agora bloqueia horários fora do expediente e horários bloqueados manualmente.
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
      const weekday = candidateDate.getDay();

      // Ignora domingos
      if (weekday === 0) continue;

      for (const candidateTime of hours) {
        const candidateDateTime = new Date(`${candidateDateKey}T${candidateTime}:00`);

        // No dia atual, não sugere horários que já passaram
        if (dayOffset === 0 && candidateDateTime <= new Date()) {
          continue;
        }

        if (
          isSlotAvailable(
            candidateDateKey,
            candidateTime,
            targetDuration,
            ignoreId,
            selectedAgendaProfessionalId
          )
        ) {
          return {
            date: candidateDateKey,
            time: candidateTime,
          };
        }
      }
    }

    return null;
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

  const syncGoogleCalendarEvent = async (appointmentId?: string | null) => {
    if (!appointmentId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("Google Agenda não sincronizado: usuário não autenticado.");
        return;
      }

      const response = await fetch("/api/google/calendar/update-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        console.warn(
          "Não foi possível sincronizar alteração com Google Agenda:",
          result
        );
      }
    } catch (error) {
      console.error("Erro ao sincronizar Google Agenda:", error);
    }
  };

  const updateAppointment = async (id: string, payload: any) => {
    // Atualização otimista: movimenta/redimensiona o card imediatamente.
    // Isso evita o efeito de "voltar" para a posição anterior enquanto a
    // sincronização com Google Agenda ainda está acontecendo.
    const previousAppointment = appointments.find((item) => item.id === id);

    setAppointments((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...payload,
            }
          : item
      )
    );

    const { error } = await supabase
      .from("appointments")
      .update(payload)
      .eq("id", id);

    if (error) {
      // Se o banco rejeitar a alteração, volta somente este agendamento ao
      // estado anterior, sem recarregar a Agenda inteira.
      if (previousAppointment) {
        setAppointments((prev) =>
          prev.map((item) =>
            item.id === id ? previousAppointment : item
          )
        );
      } else {
        await loadData();
      }

      alert("Erro ao atualizar: " + error.message);
      return false;
    }

    // A gravação local não deve esperar a API do Google. A sincronização fica
    // em segundo plano para não interferir no drag & drop ou no resize.
    void syncGoogleCalendarEvent(id);
    return true;
  };


  const handleSave = async () => {
    if (savingAppointmentRef.current) {
      return;
    }

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
        reminder_before_hours: mainType === "consulta" ? parseInt(reminderBeforeHours) : null,
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
          syncGoogleCalendarEvent(editingId);
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
            alert(
              "Este paciente já possui um agendamento neste mesmo dia e horário."
            );
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

          syncGoogleCalendarEvent(createdAppointmentId);
        }
      }
    } finally {
      savingAppointmentRef.current = false;
      setSavingAppointment(false);
    }
  };

  const openNew = (selectedDate?: string, selectedTime?: string) => {
    if (isResizingRef.current || suppressNextClickRef.current || draggingId) {
      return;
    }

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
      if (
        motivo === "retorno" ||
        motivo === "tratamento" ||
        motivo === "consulta"
      ) {
        setConsultaMotivo(motivo as ConsultaMotivo);
      } else {
        setConsultaMotivo("consulta");
      }

      if (a.patient_id) {
        const p = patients.find((x) => x.id === a.patient_id);
        if (p) {
          setSelectedPatient(p);
          setSearch(p.name);
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

  const handleDropOnCell = async (targetDate: string, targetTime: string) => {
    // Usa a ref porque ela é atualizada de forma síncrona no dragStart.
    // O state do React pode ainda não ter sido aplicado no primeiro movimento.
    const appointmentId = draggingIdRef.current || draggingId;
    if (!appointmentId) return;

    const current = appointments.find((a) => a.id === appointmentId);
    if (!current) {
      draggingIdRef.current = null;
      setDraggingId(null);
      return;
    }

    if (
      !isSlotAvailable(
        targetDate,
        targetTime,
        Number(current.duration || 30),
        appointmentId,
        current.professional_id
      )
    ) {
      alert("Esse horário está ocupado ou ultrapassa o fim do expediente.");
      draggingIdRef.current = null;
      setDraggingId(null);
      return;
    }

    await updateAppointment(appointmentId, {
      date: targetDate,
      start_time: targetTime,
    });

    draggingIdRef.current = null;
    setDraggingId(null);
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 250);
  };

  useEffect(() => {
    if (!resizingId) return;

    const finishResize = async () => {
      const currentResizeId = resizingId;
      const appt = appointments.find((a) => a.id === currentResizeId);
      const finalDuration = Math.max(
        15,
        Number(resizeCurrentDurationRef.current || appt?.duration || 30)
      );

      suppressNextClickRef.current = true;

      if (!appt) {
        setResizingId(null);
        isResizingRef.current = false;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 400);
        return;
      }

      if (
        !isSlotAvailable(
          appt.date,
          appt.start_time,
          finalDuration,
          currentResizeId,
          appt.professional_id
        )
      ) {
        await loadData();
        alert("Não foi possível ajustar: conflito com outro horário.");
        setResizingId(null);
        isResizingRef.current = false;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 400);
        return;
      }

      setResizingId(null);
      isResizingRef.current = false;

      await updateAppointment(currentResizeId, { duration: finalDuration });

      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 400);
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      const deltaY = e.clientY - resizeStartY;

      if (Math.abs(deltaY) > 2) {
        suppressNextClickRef.current = true;
      }

      const slotDelta = Math.round(deltaY / SLOT_HEIGHT);
      let nextDuration = Math.max(15, resizeStartDuration + slotDelta * 15);

      const appt = appointments.find((a) => a.id === resizingId);
      if (!appt) return;

      const start = timeToMinutes(appt.start_time);
      const maxDuration = clinicSettings.end_hour * 60 - start;
      nextDuration = Math.min(nextDuration, maxDuration);

      resizeCurrentDurationRef.current = nextDuration;

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === resizingId ? { ...a, duration: nextDuration } : a
        )
      );
    };

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      void finishResize();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    resizingId,
    resizeStartY,
    resizeStartDuration,
    appointments,
    clinicSettings.end_hour,
  ]);

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
        openNew(days[0]?.date, `${pad(clinicSettings.start_hour)}:00`);
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        setWeekBaseDate(new Date());
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [days, showModal, selectedAppointmentDetails, selectedAgendaProfessionalId, clinicSettings.start_hour]);

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
  }, []);


  const selectedAgendaProfessional = useMemo(() => {
    if (!selectedAgendaProfessionalId) return null;
    return activeProfessionals.find(
      (professional) => professional.id === selectedAgendaProfessionalId
    ) || null;
  }, [activeProfessionals, selectedAgendaProfessionalId]);

  const filteredAppointmentsByProfessional = useMemo(() => {
    if (!selectedAgendaProfessionalId) return appointments;

    return appointments.filter(
      (appointment) => appointment.professional_id === selectedAgendaProfessionalId
    );
  }, [appointments, selectedAgendaProfessionalId]);

  const selectedProfessionalInitials = useMemo(() => {
    return selectedAgendaProfessionalId
      ? getProfessionalInitials(selectedAgendaProfessional?.name)
      : "TP";
  }, [selectedAgendaProfessional, selectedAgendaProfessionalId]);

  const selectedProfessionalColor = useMemo(() => {
    return selectedAgendaProfessionalId
      ? getProfessionalColor(selectedAgendaProfessionalId)
      : "#239d9a";
  }, [selectedAgendaProfessionalId]);

  const getAppointmentStyle = (appointment: any) => {
    const backgroundColor = getFallbackAppointmentColor(
      appointment?.status,
      appointment?.type,
      appointment?.title
    );

    return { backgroundColor };
  };



  const filteredScheduleBlocksByProfessional = useMemo(() => {
    if (!selectedAgendaProfessionalId) return scheduleBlocks;

    return scheduleBlocks.filter(
      (block) => !block.professional_id || block.professional_id === selectedAgendaProfessionalId
    );
  }, [scheduleBlocks, selectedAgendaProfessionalId]);

  const getScheduleBlocksForSlot = (targetDate: string, targetTime: string) => {
    return filteredScheduleBlocksByProfessional.filter((block) => {
      if (block.date !== targetDate) return false;

      if (block.all_day) {
        return targetTime === `${pad(clinicSettings.start_hour)}:00`;
      }

      return block.start_time === targetTime;
    });
  };

  const getScheduleBlockHeight = (block: any) => {
    const durationMinutes = block.all_day
      ? (clinicSettings.end_hour - clinicSettings.start_hour) * 60
      : minutesBetweenTimes(block.start_time, block.end_time);

    const slots = Math.max(1, Math.ceil(durationMinutes / 15));
    return slots * SLOT_HEIGHT - 6;
  };

  const confirmAllTodayAppointments = async () => {
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
  };

  const agendaAlerts = useMemo(() => {
    const today = formatDate(new Date());

    const todayAppointments = filteredAppointmentsByProfessional.filter(
      (a) => a.date === today && a.type !== "compromisso"
    );

    const naoConfirmados = todayAppointments.filter(
      (a) => (a.status || "agendado") === "agendado"
    );

    const faltaram = todayAppointments.filter((a) => a.status === "faltou");

    const comDebito = todayAppointments.filter((a) => hasDebt(a.patient_id));

    return {
      naoConfirmados,
      faltaram,
      comDebito,
    };
  }, [filteredAppointmentsByProfessional, financialRecords]);

  const agendaGridProps = {
    hours: hours,
    statusFilter: statusFilter,
    filteredAppointmentsByProfessional: filteredAppointmentsByProfessional,
    clinicSettings: clinicSettings,
    agendaScrollRef: agendaScrollRef,
    handleAgendaTouchStart: handleAgendaTouchStart,
    handleAgendaTouchEnd: handleAgendaTouchEnd,
    getHolidayInfo: getHolidayInfo,
    isTodayDate: isTodayDate,
    formatDateBr: formatDateBr,
    getDayOccupation: getDayOccupation,
    slotDividerClass: slotDividerClass,
    timeColumnClass: timeColumnClass,
    isMobileAgenda: isMobileAgenda,
    isResizingRef: isResizingRef,
    suppressNextClickRef: suppressNextClickRef,
    draggingId: draggingId,
    draggingIdRef: draggingIdRef,
    setDraggingId: setDraggingId,
    openNew: openNew,
    handleDropOnCell: handleDropOnCell,
    getScheduleBlocksForSlot: getScheduleBlocksForSlot,
    getProfessionalById: getProfessionalById,
    getBlockColor: getBlockColor,
    setSelectedBlockDetails: setSelectedBlockDetails,
    getScheduleBlockHeight: getScheduleBlockHeight,
    getDefaultBlockTitle: getDefaultBlockTitle,
    setSelectedAppointmentDetails: setSelectedAppointmentDetails,
    hasDebt: hasDebt,
    getAppointmentStyle: getAppointmentStyle,
    getDurationHeight: getDurationHeight,
    getAppointmentPatientName: getAppointmentPatientName,
    getProfessionalLabel: getProfessionalLabel,
    getProfessionalInitials: getProfessionalInitials,
    appointmentTypeLabel: appointmentTypeLabel,
    statusBadgeClass: statusBadgeClass,
    statusLabel: statusLabel,
    openPatientFinance: openPatientFinance,
    formatCurrency: formatCurrency,
    getPatientDebt: getPatientDebt,
    setResizingId: setResizingId,
    setResizeStartY: setResizeStartY,
    setResizeStartDuration: setResizeStartDuration,
    resizeCurrentDurationRef: resizeCurrentDurationRef,
    currentTimePosition: currentTimePosition,
    now: now,
    pad: pad,
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#f7ffff] via-[#f4fbfb] to-[#eef8f8]">
      <AgendaToolbar
        weekBaseDate={weekBaseDate}
        setWeekBaseDate={setWeekBaseDate}
        miniCalendarDate={miniCalendarDate}
        setMiniCalendarDate={setMiniCalendarDate}
        showMiniCalendar={showMiniCalendar}
        setShowMiniCalendar={setShowMiniCalendar}
        miniCalendarDays={miniCalendarDays}
        selectMiniCalendarDay={selectMiniCalendarDay}
        activeProfessionals={activeProfessionals}
        selectedAgendaProfessionalId={selectedAgendaProfessionalId}
        setSelectedAgendaProfessionalId={setSelectedAgendaProfessionalId}
        selectedProfessionalColor={selectedProfessionalColor}
        selectedProfessionalInitials={selectedProfessionalInitials}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        days={days}
        clinicStartHour={clinicSettings.start_hour}
        openNewBlock={openNewBlock}
        syncExistingGoogleAppointments={syncExistingGoogleAppointments}
        connectGoogleCalendar={connectGoogleCalendar}
        mobileView={mobileView}
        setMobileView={setMobileView}
        showMobileAgendaSheet={showMobileAgendaSheet}
        setShowMobileAgendaSheet={setShowMobileAgendaSheet}
        goToPreviousDay={goToPreviousDay}
        goToNextDay={goToNextDay}
      />

      {isMobileAgenda && mobileView === "day" ? (
        <DayView
          {...agendaGridProps}
          day={days[0]}
        />
      ) : (
        <WeekView
          {...agendaGridProps}
          days={days}
          mobileView={mobileView}
        />
      )}

      <BlockDetailsModal
        block={selectedBlockDetails}
        onClose={() => setSelectedBlockDetails(null)}
        getBlockColor={getBlockColor}
        getDefaultBlockTitle={getDefaultBlockTitle}
        formatDateBr={formatDateBr}
        getProfessionalLabel={getProfessionalLabel}
        onEdit={editScheduleBlock}
        onDelete={deleteScheduleBlock}
      />

      <AppointmentDetailsModal
        appointment={selectedAppointmentDetails}
        onClose={() => setSelectedAppointmentDetails(null)}
        getColor={getColor}
        getAppointmentStyle={getAppointmentStyle}
        getAppointmentPatientName={getAppointmentPatientName}
        formatDateBr={formatDateBr}
        getProfessionalLabel={getProfessionalLabel}
        hasDebt={hasDebt}
        openPatientFinance={openPatientFinance}
        formatCurrency={formatCurrency}
        getPatientDebt={getPatientDebt}
        updateAppointmentStatus={updateAppointmentStatus}
        openPatientRecord={(patientId) => router.push(`/pacientes/${patientId}`)}
        openSmartReschedule={openSmartReschedule}
        onEdit={(appointment) => {
          setSelectedAppointmentDetails(null);
          openEdit(appointment);
        }}
        onDelete={handleDeleteAppointment}
        hasReminderPhone={hasReminderPhone}
        buildWhatsappHref={buildWhatsappHref}
        markReminderAsSent={markReminderAsSent}
      />

      <BlockModal
        showBlockModal={showBlockModal}
        blockForm={blockForm}
        setBlockForm={setBlockForm}
        setShowBlockModal={setShowBlockModal}
        activeProfessionals={activeProfessionals}
        saveScheduleBlock={saveScheduleBlock}
        deleteScheduleBlock={deleteScheduleBlock}
      />

      <AppointmentModal
        showModal={showModal}
        editingId={editingId}
        setShowModal={setShowModal}
        mainType={mainType}
        setMainType={setMainType}
        openQuickPatientForm={openQuickPatientForm}
        search={search}
        setSearch={setSearch}
        selectedPatient={selectedPatient}
        setSelectedPatient={setSelectedPatient}
        setQuickPatientForm={setQuickPatientForm}
        showQuickPatientForm={showQuickPatientForm}
        quickPatientForm={quickPatientForm}
        updateQuickPatientField={updateQuickPatientField}
        closeQuickPatientForm={closeQuickPatientForm}
        saveQuickPatient={saveQuickPatient}
        savingQuickPatient={savingQuickPatient}
        filteredPatients={filteredPatients}
        consultaMotivo={consultaMotivo}
        setConsultaMotivo={setConsultaMotivo}
        selectedProfessionalId={selectedProfessionalId}
        setSelectedProfessionalId={setSelectedProfessionalId}
        activeProfessionals={activeProfessionals}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        duration={duration}
        setDuration={setDuration}
        appointmentStatus={appointmentStatus}
        setAppointmentStatus={setAppointmentStatus}
        reminderEnabled={reminderEnabled}
        setReminderEnabled={setReminderEnabled}
        reminderBeforeHours={reminderBeforeHours}
        setReminderBeforeHours={setReminderBeforeHours}
        savingAppointment={savingAppointment}
        handleSave={handleSave}
      />
    </div>
  );
}
