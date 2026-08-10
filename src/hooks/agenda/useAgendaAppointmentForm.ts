"use client";

import { useMemo, useState } from "react";
import type { AppointmentStatus, ConsultaMotivo, MainType } from "@/lib/agenda/agendaUtils";

type PatientLike = {
  id?: string | null;
  name?: string | null;
  [key: string]: any;
};

type UseAgendaAppointmentFormParams = {
  patients: PatientLike[];
};

export function useAgendaAppointmentForm({ patients }: UseAgendaAppointmentFormParams) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [mainType, setMainType] = useState<MainType>("consulta");
  const [consultaMotivo, setConsultaMotivo] = useState<ConsultaMotivo>("consulta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [appointmentStatus, setAppointmentStatus] =
    useState<AppointmentStatus>("agendado");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderBeforeHours, setReminderBeforeHours] = useState("24");
  const [savingAppointment, setSavingAppointment] = useState(false);

  const filteredPatients = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return [];

    const startsWith = patients.filter((patient) =>
      (patient.name || "").toLowerCase().startsWith(term)
    );

    const includes = patients.filter((patient) =>
      (patient.name || "").toLowerCase().includes(term) &&
      !(patient.name || "").toLowerCase().startsWith(term)
    );

    return [...startsWith, ...includes].slice(0, 8);
  }, [search, patients]);

  const resetAppointmentForm = () => {
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
  };

  return {
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
  };
}
