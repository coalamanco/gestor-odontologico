"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAgendaData } from "@/hooks/agenda/useAgendaData";
import { useAgendaReminderActions } from "@/hooks/agenda/useAgendaReminderActions";
import { useAgendaGoogleActions } from "@/hooks/agenda/useAgendaGoogleActions";
import { useAgendaBlockActions } from "@/hooks/agenda/useAgendaBlockActions";
import { useAgendaQuickPatient } from "@/hooks/agenda/useAgendaQuickPatient";
import { useAgendaNavigation } from "@/hooks/agenda/useAgendaNavigation";
import { useAgendaDerivedData } from "@/hooks/agenda/useAgendaDerivedData";
import { useAgendaAppointmentForm } from "@/hooks/agenda/useAgendaAppointmentForm";
import { useAgendaAppointmentActions } from "@/hooks/agenda/useAgendaAppointmentActions";
import { useAgendaResizeActions } from "@/hooks/agenda/useAgendaResizeActions";
import { useAgendaDragActions } from "@/hooks/agenda/useAgendaDragActions";
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
  START_HOUR,
  END_HOUR,
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

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedBlockDetails, setSelectedBlockDetails] = useState<any | null>(null);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] =
    useState<any | null>(null);

  const {
    showModal,
    setShowModal,
    editingId,
    setEditingId,
    search,
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
    savingAppointment,
    setSavingAppointment,
    filteredPatients,
    resetAppointmentForm,
  } = useAgendaAppointmentForm({ patients });

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
    resetAppointmentForm();
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

  const {
    selectedAgendaProfessional,
    filteredAppointmentsByProfessional,
    selectedProfessionalInitials,
    selectedProfessionalColor,
    getAppointmentStyle,
    filteredScheduleBlocksByProfessional,
    getScheduleBlocksForSlot,
    getScheduleBlockHeight,
    agendaAlerts,
  } = useAgendaDerivedData({
    activeProfessionals,
    appointments,
    scheduleBlocks,
    selectedAgendaProfessionalId,
    clinicSettings,
    hasDebt,
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


  const {
    updateAppointmentStatus,
    handleDeleteAppointment,
    isSlotAvailable,
    openSmartReschedule,
    updateAppointment,
    handleSave,
    openNew,
    openEdit,
  } = useAgendaAppointmentActions({
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
    showModal,
    setShowModal,
    editingId,
    setEditingId,
    search,
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
  });

  const { handleDropOnCell } = useAgendaDragActions({
    draggingId,
    draggingIdRef,
    setDraggingId,
    appointments,
    isSlotAvailable,
    updateAppointment,
    suppressNextClickRef,
  });

  useAgendaResizeActions({
    resizingId,
    setResizingId,
    resizeStartY,
    resizeStartDuration,
    resizeCurrentDurationRef,
    isResizingRef,
    suppressNextClickRef,
    appointments,
    setAppointments,
    clinicSettings,
    isSlotAvailable,
    loadData,
    updateAppointment,
  });

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
