"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarDays, Clock, MessageCircle, RefreshCw, Search, UserCheck, Users } from "lucide-react";

type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "finalizado"
  | "faltou"
  | "cancelado";

type Appointment = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  professional_id?: string | null;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  date?: string | null;
  start_time?: string | null;
  duration?: number | null;
  status?: AppointmentStatus | string | null;
  reminder_sent_at?: string | null;
};

type Professional = {
  id: string;
  name: string;
  specialty?: string | null;
  active?: boolean | null;
};

type Patient = {
  id: string;
  name?: string | null;
  phone?: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDateBr(dateString?: string | null) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function normalizePhone(value?: string | null) {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

function statusLabel(status?: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "em_atendimento") return "Em atendimento";
  if (status === "finalizado") return "Finalizado";
  if (status === "faltou") return "Faltou";
  if (status === "cancelado") return "Cancelado";
  return "Agendado";
}

function statusClass(status?: string | null) {
  if (status === "confirmado") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "em_atendimento") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "finalizado") return "bg-slate-50 text-slate-600 ring-slate-200";
  if (status === "faltou") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "cancelado") return "bg-zinc-50 text-zinc-600 ring-zinc-200";
  return "bg-cyan-50 text-cyan-700 ring-cyan-200";
}

function nextStatusButton(status?: string | null) {
  if (!status || status === "agendado") {
    return { label: "Confirmar chegada", status: "confirmado" as AppointmentStatus };
  }

  if (status === "confirmado") {
    return { label: "Colocar em atendimento", status: "em_atendimento" as AppointmentStatus };
  }

  if (status === "em_atendimento") {
    return { label: "Finalizar", status: "finalizado" as AppointmentStatus };
  }

  return null;
}

export default function RecepcaoPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const today = formatToday();

  const loadData = async () => {
    try {
      setLoading(true);

      const [{ data: appointmentData }, { data: professionalData }, { data: patientData }] =
        await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .eq("date", today)
            .order("start_time"),
          supabase
            .from("professionals")
            .select("id, name, specialty, active")
            .order("name"),
          supabase
            .from("patients")
            .select("id, name, phone"),
        ]);

      setAppointments((appointmentData || []) as Appointment[]);
      setProfessionals((professionalData || []) as Professional[]);
      setPatients((patientData || []) as Patient[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeProfessionals = useMemo(() => {
    return professionals.filter((professional) => professional.active !== false);
  }, [professionals]);

  const getProfessionalName = (professionalId?: string | null) => {
    if (!professionalId) return "Sem profissional";
    const professional = professionals.find((item) => item.id === professionalId);
    return professional?.name || "Profissional";
  };

  const getPatient = (appointment: Appointment) => {
    if (!appointment.patient_id) return null;
    return patients.find((patient) => patient.id === appointment.patient_id) || null;
  };

  const buildWhatsappLink = (appointment: Appointment) => {
    const patient = getPatient(appointment);
    const phoneDigits = normalizePhone(patient?.phone);

    if (!phoneDigits) return "#";

    const phone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;

    const patientName =
      patient?.name || appointment.patient_name || "paciente";

    const message =
      `Olá, ${patientName}! Tudo bem?\n\n` +
      `Estamos falando do consultório. Sua consulta de hoje está agendada para ${appointment.start_time || ""}.\n\n` +
      `Qualquer dúvida, estamos à disposição.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments
      .filter((appointment) => appointment.type !== "compromisso")
      .filter((appointment) => {
        if (!selectedProfessionalId) return true;
        return appointment.professional_id === selectedProfessionalId;
      })
      .filter((appointment) => {
        if (!term) return true;

        const patientName = String(appointment.patient_name || "").toLowerCase();
        const professionalName = getProfessionalName(appointment.professional_id).toLowerCase();
        const title = String(appointment.title || "").toLowerCase();

        return (
          patientName.includes(term) ||
          professionalName.includes(term) ||
          title.includes(term)
        );
      });
  }, [appointments, selectedProfessionalId, search, professionals]);

  const summary = useMemo(() => {
    return {
      total: filteredAppointments.length,
      agendado: filteredAppointments.filter((item) => !item.status || item.status === "agendado").length,
      confirmado: filteredAppointments.filter((item) => item.status === "confirmado").length,
      emAtendimento: filteredAppointments.filter((item) => item.status === "em_atendimento").length,
      finalizado: filteredAppointments.filter((item) => item.status === "finalizado").length,
      faltou: filteredAppointments.filter((item) => item.status === "faltou").length,
    };
  }, [filteredAppointments]);

  const updateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      setUpdatingId(appointmentId);

      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) {
        alert("Erro ao atualizar status: " + error.message);
        return;
      }

      setAppointments((previous) =>
        previous.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="rounded-[24px] border border-[#d4e8e8] bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f8f7] text-[#239d9a]">
                  <Users size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-800">
                    Recepção
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#239d9a]">
                    Hoje • {formatDateBr(today)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#d4e8e8] bg-white px-3">
                <Search size={16} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar paciente..."
                  className="h-full w-full min-w-[190px] bg-transparent text-sm font-semibold text-slate-700 outline-none"
                />
              </div>

              <select
                value={selectedProfessionalId}
                onChange={(event) => setSelectedProfessionalId(event.target.value)}
                className="h-10 rounded-xl border border-[#d4e8e8] bg-white px-3 text-sm font-bold text-slate-700 outline-none"
              >
                <option value="">Todos os profissionais</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadData}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#239d9a] px-4 text-sm font-black text-white shadow-sm hover:opacity-90"
              >
                <RefreshCw size={15} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-[#d4e8e8] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Consultas
            </p>
            <p className="mt-1 text-3xl font-black text-slate-800">{summary.total}</p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
              Agendados
            </p>
            <p className="mt-1 text-3xl font-black text-cyan-800">{summary.agendado}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Confirmados
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-800">{summary.confirmado}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
              Atendimento
            </p>
            <p className="mt-1 text-3xl font-black text-blue-800">{summary.emAtendimento}</p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">
              Faltas
            </p>
            <p className="mt-1 text-3xl font-black text-red-800">{summary.faltou}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#d4e8e8] bg-white shadow-sm">
          <div className="border-b border-[#e0eeee] bg-[#fbfefe] px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <CalendarDays size={17} className="text-[#239d9a]" />
              Pacientes do dia
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">
              Carregando recepção...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eefafa] text-[#239d9a]">
                <UserCheck size={22} />
              </div>
              <p className="mt-3 text-sm font-black text-slate-700">
                Nenhuma consulta encontrada para hoje.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Verifique o filtro de profissional ou a busca.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef4f4]">
              {filteredAppointments.map((appointment) => {
                const nextButton = nextStatusButton(appointment.status);
                const patient = getPatient(appointment);
                const hasPhone = Boolean(normalizePhone(patient?.phone));

                return (
                  <div
                    key={appointment.id}
                    className="grid gap-3 px-5 py-4 transition hover:bg-[#fbffff] lg:grid-cols-[100px_1fr_180px_260px]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eefafa] text-[#239d9a]">
                        <Clock size={17} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-800">
                          {appointment.start_time || "--:--"}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {appointment.duration || 30} min
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-800">
                        {appointment.patient_name || "Paciente não informado"}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {appointment.title || "consulta"} • {getProfessionalName(appointment.professional_id)}
                      </p>
                      {appointment.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {appointment.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${statusClass(
                          appointment.status
                        )}`}
                      >
                        {statusLabel(appointment.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                      {nextButton && (
                        <button
                          type="button"
                          disabled={updatingId === appointment.id}
                          onClick={() => updateStatus(appointment.id, nextButton.status)}
                          className="rounded-xl bg-[#239d9a] px-3 py-2 text-xs font-black text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                        >
                          {updatingId === appointment.id ? "Salvando..." : nextButton.label}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={updatingId === appointment.id}
                        onClick={() => updateStatus(appointment.id, "faltou")}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Faltou
                      </button>

                      {hasPhone && (
                        <a
                          href={buildWhatsappLink(appointment)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
