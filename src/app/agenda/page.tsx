"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type MainType = "consulta" | "compromisso";
type ConsultaMotivo = "consulta" | "retorno" | "tratamento";
type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "finalizado"
  | "faltou"
  | "cancelado";

const SLOT_HEIGHT = 34;
const START_HOUR = 8;
const END_HOUR = 20;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatDateBr(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function isTodayDate(dateString: string) {
  return dateString === formatDate(new Date());
}


type HolidayInfo = {
  name: string;
  scope: "nacional" | "municipal";
};

function getEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function addHoliday(holidays: Record<string, HolidayInfo>, date: Date, info: HolidayInfo) {
  holidays[formatDate(date)] = info;
}

function getHolidayMap(year: number) {
  const holidays: Record<string, HolidayInfo> = {};

  // Feriados nacionais oficiais
  holidays[`${year}-01-01`] = { name: "Confraternização Universal", scope: "nacional" };
  holidays[`${year}-04-21`] = { name: "Tiradentes", scope: "nacional" };
  holidays[`${year}-05-01`] = { name: "Dia do Trabalho", scope: "nacional" };
  holidays[`${year}-09-07`] = { name: "Independência do Brasil", scope: "nacional" };
  holidays[`${year}-10-12`] = { name: "Nossa Senhora Aparecida", scope: "nacional" };
  holidays[`${year}-11-02`] = { name: "Finados", scope: "nacional" };
  holidays[`${year}-11-15`] = { name: "Proclamação da República", scope: "nacional" };
  holidays[`${year}-11-20`] = { name: "Consciência Negra", scope: "nacional" };
  holidays[`${year}-12-25`] = { name: "Natal", scope: "nacional" };

  const easter = getEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  addHoliday(holidays, goodFriday, { name: "Sexta-feira Santa", scope: "nacional" });

  // Feriados municipais de Araranguá-SC
  holidays[`${year}-04-03`] = { name: "Aniversário de Araranguá", scope: "municipal" };
  holidays[`${year}-05-04`] = { name: "Nossa Senhora Mãe dos Homens", scope: "municipal" };

  return holidays;
}

function getHolidayInfo(dateString: string) {
  if (!dateString) return null;
  const year = Number(dateString.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return getHolidayMap(year)[dateString] || null;
}

function normalizePhone(value?: string | null) {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

function parseHourValue(value: any, fallback: number) {
  const raw = String(value ?? "").trim();

  if (!raw) return fallback;

  const hour = Number(raw.includes(":") ? raw.split(":")[0] : raw);

  if (!Number.isFinite(hour)) return fallback;
  return Math.min(23, Math.max(0, hour));
}

function parsePositiveNumber(value: any, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export default function AgendaPage() {
  const router = useRouter();

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

  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [financialRecords, setFinancialRecords] = useState<any[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState({
    start_hour: START_HOUR,
    end_hour: END_HOUR,
    max_patients_day: 15,
  });

  const agendaScrollRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
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

  const [weekBaseDate, setWeekBaseDate] = useState<Date>(new Date());

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [confirmingAllToday, setConfirmingAllToday] = useState(false);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartDuration, setResizeStartDuration] = useState(30);

  const loadData = async () => {
    const { data: p } = await supabase.from("patients").select("*").order("name");
    const { data: profs } = await supabase
      .from("professionals")
      .select("id, name, cro, specialty, active")
      .order("name");

    const { data: a } = await supabase
      .from("appointments")
      .select("*")
      .order("date")
      .order("start_time");

    const { data: f } = await supabase
      .from("financial_records")
      .select("*");

    const { data: templates } = await supabase
      .from("message_templates")
      .select("id, type, title, content, active")
      .eq("active", true);

    const { data: settings } = await supabase
      .from("clinic_settings")
      .select("start_hour, end_hour, max_patients_day")
      .eq("id", 1)
      .maybeSingle();

    if (p) setPatients(p);
    if (profs) setProfessionals(profs);
    if (a) setAppointments(a);
    if (f) setFinancialRecords(f);
    if (templates) setMessageTemplates(templates);

    if (settings) {
      const startHour = parseHourValue(settings.start_hour, START_HOUR);
      let endHour = parseHourValue(settings.end_hour, END_HOUR);

      if (endHour <= startHour) {
        endHour = END_HOUR;
      }

      setClinicSettings({
        start_hour: startHour,
        end_hour: endHour,
        max_patients_day: parsePositiveNumber(
          settings.max_patients_day,
          15
        ),
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
  };

  const days = useMemo(() => {
    const start = startOfWeek(weekBaseDate);
    const labels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

    return Array.from({ length: 6 }).map((_, i) => {
      const d = addDays(start, i);
      return {
        date: formatDate(d),
        label: labels[i],
        num: pad(d.getDate()),
      };
    });
  }, [weekBaseDate]);

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

  const hours: string[] = useMemo(() => {
    const result: string[] = [];

    for (let h = clinicSettings.start_hour; h < clinicSettings.end_hour; h++) {
      for (let m of [0, 15, 30, 45]) {
        result.push(`${pad(h)}:${pad(m)}`);
      }
    }

    return result;
  }, [clinicSettings.start_hour, clinicSettings.end_hour]);

  const currentTimePosition = useMemo(() => {
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = clinicSettings.start_hour * 60;
    const endMinutes = clinicSettings.end_hour * 60;

    if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
      return null;
    }

    return ((totalMinutes - startMinutes) / 15) * SLOT_HEIGHT;
  }, [now, clinicSettings.start_hour, clinicSettings.end_hour]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = agendaScrollRef.current;
    if (!container) return;

    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = clinicSettings.start_hour * 60;

    if (totalMinutes < startMinutes) {
      container.scrollTop = 0;
      return;
    }

    const position = ((totalMinutes - startMinutes) / 15) * SLOT_HEIGHT;
    container.scrollTop = Math.max(0, position - 160);
  }, [clinicSettings.start_hour]);

  const getPatientDebt = (patientId?: string | null) => {
    if (!patientId) return 0;

    return financialRecords
      .filter((record: any) => record.patient_id === patientId)
      .reduce((acc: number, record: any) => {
        const amount = Number(record.amount || 0);
        const paid = Number(record.paid_amount || 0);
        return acc + Math.max(0, amount - paid);
      }, 0);
  };

  const hasDebt = (patientId?: string | null) => {
    return getPatientDebt(patientId) > 0;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const openPatientFinance = (patientId?: string | null) => {
    if (!patientId) return;

    try {
      window.localStorage.setItem("patientActiveTab", "financeiro");
    } catch {
      // localStorage pode estar indisponível em alguns ambientes
    }

    router.push(`/pacientes/${patientId}`);
  };

  const refreshFinancialData = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_records")
        .select("id, patient_id, amount, paid_amount, status");

      if (error) throw error;

      setFinancialRecords(data || []);
    } catch (error) {
      console.error("Erro ao atualizar débitos da agenda:", error);
    }
  };

  const getDayOccupation = (targetDate: string) => {
    const dayAppointments = appointments.filter(
      (a) => a.date === targetDate && a.type !== "compromisso"
    );

    return {
      used: dayAppointments.length,
      total: clinicSettings.max_patients_day,
    };
  };

  const getColor = (a: any) => {
    if (a.type === "compromisso") return "bg-slate-500";

    const status = String(a.status || "agendado");

    if (status === "confirmado") return "bg-emerald-500";
    if (status === "em_atendimento") return "bg-blue-600";
    if (status === "finalizado") return "bg-slate-600";
    if (status === "faltou") return "bg-red-600";
    if (status === "cancelado") return "bg-zinc-500";

    const motivo = (a.title || "").toLowerCase();

    if (motivo === "retorno") return "bg-emerald-500";
    if (motivo === "tratamento") return "bg-teal-500";
    return "bg-cyan-500";
  };

  const statusLabel = (status?: string | null) => {
    if (status === "confirmado") return "Confirmado";
    if (status === "em_atendimento") return "Em atendimento";
    if (status === "finalizado") return "Finalizado";
    if (status === "faltou") return "Faltou";
    if (status === "cancelado") return "Cancelado";
    return "Agendado";
  };

  const statusBadgeClass = (status?: string | null) => {
    if (status === "confirmado") return "bg-emerald-100 text-emerald-700";
    if (status === "em_atendimento") return "bg-blue-100 text-blue-700";
    if (status === "finalizado") return "bg-slate-100 text-slate-700";
    if (status === "faltou") return "bg-red-100 text-red-700";
    if (status === "cancelado") return "bg-zinc-100 text-zinc-700";
    return "bg-white/85 text-slate-700";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await fetch("/api/google/calendar/delete-event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointmentId,
            userId: user.id,
          }),
        });
      }
    } catch (googleError) {
      console.error(
        "Erro ao excluir evento do Google Agenda:",
        googleError
      );
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (error) {
      alert("Erro ao excluir agendamento: " + error.message);
      return;
    }

    setSelectedAppointmentDetails(null);
    await loadData();
  };

  const getDurationHeight = (mins: number) => {
    const slots = Math.max(1, Math.ceil((Number(mins) || 30) / 15));
    return slots * SLOT_HEIGHT - 6;
  };

  const getPatientByAppointment = (appointment: any) => {
    if (!appointment?.patient_id) return null;
    return patients.find((p) => p.id === appointment.patient_id) || null;
  };

  const getProfessionalById = (professionalId?: string | null) => {
    if (!professionalId) return null;
    return professionals.find((p) => p.id === professionalId) || null;
  };

  const getProfessionalLabel = (professionalId?: string | null) => {
    const professional = getProfessionalById(professionalId);
    if (!professional) return "";

    const specialty = professional.specialty ? ` • ${professional.specialty}` : "";
    return `${professional.name}${specialty}`;
  };

  const activeProfessionals = professionals.filter(
    (professional) => professional.active !== false
  );

  const buildWhatsappHref = (appointment: any, type = "lembrete") => {
    const patient = getPatientByAppointment(appointment);
    const phoneDigits = normalizePhone(patient?.phone);

    if (!phoneDigits) return "#";

    const phone = phoneDigits.startsWith("55")
      ? phoneDigits
      : `55${phoneDigits}`;

    const patientName =
      patient?.name || appointment.patient_name || "paciente";

    const procedureName =
      appointment.type === "compromisso"
        ? appointment.title || "compromisso"
        : appointment.title || "consulta";

    const patientDebt = formatCurrency(getPatientDebt(appointment.patient_id));

    const template =
      messageTemplates.find((item) => item.type === type && item.content) ||
      messageTemplates.find((item) => item.type === "lembrete" && item.content);

    const fallbackMessage =
      `Olá, ${patientName}! Tudo bem? 😊\n\n` +
      `Passando para lembrar da sua ${procedureName} no consultório.\n\n` +
      `📅 Data: ${formatDateBr(appointment.date)}\n` +
      `⏰ Horário: ${appointment.start_time}\n\n` +
      `Por favor, confirme sua presença.\n\n` +
      `Obrigado(a)!`;

    let message = template?.content || fallbackMessage;

    message = message
      .replaceAll("{{nome}}", patientName)
      .replaceAll("{{data}}", formatDateBr(appointment.date))
      .replaceAll("{{hora}}", appointment.start_time || "")
      .replaceAll("{{valor}}", patientDebt)
      .replaceAll("{{procedimento}}", procedureName);

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const hasReminderPhone = (appointment: any) => {
    const patient = getPatientByAppointment(appointment);
    return Boolean(normalizePhone(patient?.phone));
  };

  const markReminderAsSent = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (error) {
      alert("Erro ao marcar lembrete como enviado: " + error.message);
      return;
    }

    setSelectedAppointmentDetails((prev: any) =>
      prev && prev.id === appointmentId
        ? { ...prev, reminder_sent_at: new Date().toISOString() }
        : prev
    );

    await loadData();
  };

  const isSlotAvailable = (
    targetDate: string,
    targetTime: string,
    targetDuration: number,
    ignoreId?: string | null
  ) => {
    void targetDate;
    void ignoreId;

    // Permite encaixes no mesmo horário, como no Google Agenda.
    // A validação agora bloqueia apenas horários fora do expediente.
    const start = timeToMinutes(targetTime);
    const end = start + targetDuration;

    const dayStart = clinicSettings.start_hour * 60;
    const dayEnd = clinicSettings.end_hour * 60;

    return start >= dayStart && end <= dayEnd;
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
            ignoreId
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
    const { error } = await supabase
      .from("appointments")
      .update(payload)
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar: " + error.message);
      return false;
    }

    await syncGoogleCalendarEvent(id);
    await loadData();
    return true;
  };


  const buildAutomaticWhatsappMessage = (appointmentPayload: any) => {
    const patientName =
      selectedPatient?.name || appointmentPayload.patient_name || "paciente";

    const procedureName =
      appointmentPayload.type === "compromisso"
        ? appointmentPayload.title || "compromisso"
        : appointmentPayload.title || "consulta";

    const patientDebt = formatCurrency(
      getPatientDebt(appointmentPayload.patient_id)
    );

    const template =
      messageTemplates.find(
        (item) => item.type === "confirmacao" && item.content
      ) ||
      messageTemplates.find((item) => item.type === "lembrete" && item.content);

    const fallbackMessage =
      `Olá, ${patientName}! Tudo bem? 😊\n\n` +
      `Sua ${procedureName} foi agendada no consultório.\n\n` +
      `📅 Data: ${formatDateBr(appointmentPayload.date)}\n` +
      `⏰ Horário: ${appointmentPayload.start_time}\n\n` +
      `Por favor, confirme sua presença.\n\n` +
      `Obrigado(a)!`;

    let message = template?.content || fallbackMessage;

    message = message
      .replaceAll("{{nome}}", patientName)
      .replaceAll("{{data}}", formatDateBr(appointmentPayload.date))
      .replaceAll("{{hora}}", appointmentPayload.start_time || "")
      .replaceAll("{{valor}}", patientDebt)
      .replaceAll("{{procedimento}}", procedureName);

    return message;
  };

  const sendAutomaticWhatsappConfirmation = async (
    appointmentPayload: any,
    appointmentId?: string | null
  ) => {
    const appointmentType = String(appointmentPayload?.type || "").toLowerCase();

    if (appointmentType !== "consulta") {
      console.log("WhatsApp automático ignorado: não é consulta.", {
        type: appointmentPayload?.type,
      });

      return {
        ok: false,
        reason: "not_consulta",
        message: "O envio automático só é feito para consultas.",
      };
    }

    if (!appointmentPayload.patient_id) {
      console.warn("WhatsApp automático não enviado: consulta sem paciente.");

      return {
        ok: false,
        reason: "missing_patient",
        message: "Consulta sem paciente vinculado.",
      };
    }

    try {
      console.log("Iniciando envio automático de WhatsApp.", {
        appointmentId,
        patientId: appointmentPayload.patient_id,
      });

      let patientName =
        selectedPatient?.name || appointmentPayload.patient_name || "paciente";
      let patientPhone = selectedPatient?.phone || "";

      if (!normalizePhone(patientPhone)) {
        const { data: patientFromDb, error: patientError } = await supabase
          .from("patients")
          .select("name, phone")
          .eq("id", appointmentPayload.patient_id)
          .maybeSingle();

        if (patientError) {
          console.warn(
            "WhatsApp automático não enviado: erro ao buscar paciente.",
            patientError
          );

          return {
            ok: false,
            reason: "patient_error",
            message: patientError.message || "Erro ao buscar paciente.",
          };
        }

        patientName = patientFromDb?.name || patientName;
        patientPhone = patientFromDb?.phone || "";
      }

      const phoneDigits = normalizePhone(patientPhone);

      if (!phoneDigits) {
        console.warn("WhatsApp automático não enviado: paciente sem telefone.");

        return {
          ok: false,
          reason: "missing_phone",
          message: "Paciente sem telefone/WhatsApp cadastrado.",
        };
      }

      const phone = phoneDigits.startsWith("55")
        ? phoneDigits
        : `55${phoneDigits}`;

      const message = buildAutomaticWhatsappMessage({
        ...appointmentPayload,
        patient_name: patientName,
      });

      console.log("Chamando API interna /api/whatsapp/send", {
        appointmentId,
        phone,
      });

      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          message,
        }),
      });

      const responseText = await response.text();
      let result: any = null;

      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        result = responseText;
      }

      console.log("Resposta da API WhatsApp:", {
        ok: response.ok,
        status: response.status,
        result,
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: "api_error",
          status: response.status,
          message:
            result?.error ||
            result?.message ||
            `Erro ${response.status} ao chamar API do WhatsApp.`,
          details: result,
        };
      }

      if (appointmentId) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", appointmentId);

        if (updateError) {
          console.warn(
            "WhatsApp enviado, mas não consegui marcar como avisado.",
            updateError
          );
        }
      }

      return {
        ok: true,
        reason: "sent",
        message: "WhatsApp enviado com sucesso.",
        details: result,
      };
    } catch (error: any) {
      console.warn("Erro ao enviar WhatsApp automático:", error);

      return {
        ok: false,
        reason: "unexpected_error",
        message: error?.message || "Erro inesperado ao enviar WhatsApp.",
      };
    }
  };

  const handleSave = async () => {
    if (!date || !time) {
      alert("Informe a data e a hora.");
      return;
    }

    if (mainType === "consulta" && !selectedPatient) {
      alert("Selecione um paciente.");
      return;
    }

    const parsedDuration = parseInt(duration);

    if (!isSlotAvailable(date, time, parsedDuration, editingId)) {
      alert("Esse horário já está ocupado ou ultrapassa o fim do expediente.");
      return;
    }

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

      if (String(mainType).toLowerCase() === "consulta") {
        await syncGoogleCalendarEvent(editingId);
      }
    } else {
      const { data: createdAppointment, error } = await supabase
        .from("appointments")
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        alert("Erro ao salvar: " + error.message);
        return;
      }

      if (String(mainType).toLowerCase() === "consulta") {
        console.log(
          "Consulta salva. O lembrete será enviado automaticamente pelo cron-job.org no horário configurado."
        );

        await syncGoogleCalendarEvent(createdAppointment?.id);
      }
    }

    setShowModal(false);
    resetForm();
    loadData();
  };

  const openNew = (selectedDate?: string, selectedTime?: string) => {
    resetForm();
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
    if (!draggingId) return;

    const current = appointments.find((a) => a.id === draggingId);
    if (!current) {
      setDraggingId(null);
      return;
    }

    if (
      !isSlotAvailable(
        targetDate,
        targetTime,
        Number(current.duration || 30),
        draggingId
      )
    ) {
      alert("Esse horário está ocupado ou ultrapassa o fim do expediente.");
      setDraggingId(null);
      return;
    }

    await updateAppointment(draggingId, {
      date: targetDate,
      start_time: targetTime,
    });

    setDraggingId(null);
  };

  useEffect(() => {
    if (!resizingId) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      const slotDelta = Math.round(deltaY / SLOT_HEIGHT);
      let nextDuration = Math.max(15, resizeStartDuration + slotDelta * 15);

      const appt = appointments.find((a) => a.id === resizingId);
      if (!appt) return;

      const start = timeToMinutes(appt.start_time);
      const maxDuration = clinicSettings.end_hour * 60 - start;
      nextDuration = Math.min(nextDuration, maxDuration);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === resizingId ? { ...a, duration: nextDuration } : a
        )
      );
    };

    const onMouseUp = async () => {
      const appt = appointments.find((a) => a.id === resizingId);
      if (!appt) {
        setResizingId(null);
        return;
      }

      if (
        !isSlotAvailable(
          appt.date,
          appt.start_time,
          Number(appt.duration || 30),
          resizingId
        )
      ) {
        await loadData();
        alert("Não foi possível ajustar: conflito com outro horário.");
        setResizingId(null);
        return;
      }

      await updateAppointment(resizingId, { duration: appt.duration });
      setResizingId(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizingId, resizeStartY, resizeStartDuration, appointments]);

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
  }, [days, showModal, selectedAppointmentDetails]);

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

  const agendaAlerts = useMemo(() => {
    const today = formatDate(new Date());

    const todayAppointments = appointments.filter(
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
  }, [appointments, financialRecords]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#eefafa] via-[#f8ffff] to-[#e9f4f4]">
      <div className="border-b border-[#c2dddd] bg-white/95 px-3 py-1.5 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
        <div className="grid min-h-[48px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setWeekBaseDate((prev) => addDays(prev, -7))}
              className="h-8 w-8 rounded-lg bg-[#eefafa] text-sm font-black text-[#239d9a] hover:bg-[#dff3f2]"
              title="Semana anterior"
            >
              ◀
            </button>

            <button
              onClick={() => setWeekBaseDate(new Date())}
              className="h-8 rounded-lg bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] px-3 text-sm font-black text-white shadow-sm"
            >
              Hoje
            </button>

            <button
              onClick={() => setWeekBaseDate((prev) => addDays(prev, 7))}
              className="h-8 w-8 rounded-lg bg-[#eefafa] text-sm font-black text-[#239d9a] hover:bg-[#dff3f2]"
              title="Próxima semana"
            >
              ▶
            </button>

            <div className="mx-1 hidden h-7 w-px bg-[#d9eeee] md:block" />

            <button
              type="button"
              onClick={() =>
                setWeekBaseDate((prev) => {
                  const next = new Date(prev);
                  next.setMonth(next.getMonth() - 1);
                  return next;
                })
              }
              className="hidden h-8 rounded-lg bg-white px-3 text-[11px] font-black uppercase tracking-widest text-[#239d9a] ring-1 ring-[#d9eeee] hover:bg-[#f2fcfc] md:inline-flex md:items-center"
              title="Mês anterior"
            >
              Mês -
            </button>

            <button
              type="button"
              onClick={() =>
                setWeekBaseDate((prev) => {
                  const next = new Date(prev);
                  next.setMonth(next.getMonth() + 1);
                  return next;
                })
              }
              className="hidden h-8 rounded-lg bg-white px-3 text-[11px] font-black uppercase tracking-widest text-[#239d9a] ring-1 ring-[#d9eeee] hover:bg-[#f2fcfc] md:inline-flex md:items-center"
              title="Próximo mês"
            >
              Mês +
            </button>
          </div>

          <div className="flex min-w-[280px] flex-col items-center justify-center text-center">
            <h1 className="truncate text-[30px] font-black leading-none text-slate-800 lg:text-[34px]">
              Agenda Clínica
            </h1>
            <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.35em] text-[#239d9a] lg:text-[12px]">
              {new Date(weekBaseDate).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 w-[130px] rounded-lg border border-[#c2dddd] bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
              title="Filtrar agenda por status"
            >
              <option value="todos">Todos</option>
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="finalizado">Finalizado</option>
              <option value="faltou">Faltou</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <button
              type="button"
              onClick={confirmAllTodayAppointments}
              disabled={confirmingAllToday || agendaAlerts.naoConfirmados.length === 0}
              className={`h-8 rounded-lg px-3 text-xs font-black shadow-sm ${
                agendaAlerts.naoConfirmados.length > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              title="Confirmar todas as consultas agendadas de hoje"
            >
              {confirmingAllToday
                ? "Confirmando..."
                : `Confirmar hoje${
                    agendaAlerts.naoConfirmados.length > 0
                      ? ` (${agendaAlerts.naoConfirmados.length})`
                      : ""
                  }`}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Lembretes de consulta pendentes:\n\n${appointments
                  .filter((a) => a.type !== "compromisso")
                  .filter((a) => a.reminder_enabled && !a.reminder_sent_at)
                  .filter((a) => {
                    const today = formatDate(new Date());
                    const tomorrow = formatDate(addDays(new Date(), 1));
                    return a.date === today || a.date === tomorrow;
                  })
                  .map(
                    (a) =>
                      `• ${a.patient_name || "Paciente"} - ${formatDateBr(
                        a.date
                      )} às ${a.start_time}`
                  )
                  .join("\n") || "Nenhum lembrete pendente para hoje ou amanhã."}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 items-center rounded-lg bg-[#1fb36e] px-3 text-xs font-black text-white shadow-sm hover:bg-[#199c5f] lg:inline-flex"
              title="Enviar lista de lembretes de hoje e amanhã"
            >
              Lembretes
            </a>

            <button
              type="button"
              onClick={connectGoogleCalendar}
              className="h-8 rounded-lg border border-[#c2dddd] bg-white px-4 text-xs font-black text-[#239d9a] shadow-sm hover:bg-[#f4ffff]"
              title="Conectar sua conta ao Google Agenda"
            >
              Google Agenda
            </button>

            <button
              onClick={() => openNew(days[0].date, `${pad(clinicSettings.start_hour)}:00`)}
              className="h-8 rounded-lg bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] px-4 text-xs font-black text-white shadow-sm"
            >
              Novo
            </button>
          </div>
        </div>
      </div>

      {(agendaAlerts.naoConfirmados.length > 0 ||
        agendaAlerts.faltaram.length > 0 ||
        agendaAlerts.comDebito.length > 0) && (
        <div className="px-4 pt-1">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-1">
            {agendaAlerts.naoConfirmados.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-yellow-200/70 bg-yellow-50/70 px-2 py-0.5 shadow-sm min-h-[28px]">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs">⚠️</span>
                  <span className="truncate text-[11px] font-bold text-yellow-800">
                    {agendaAlerts.naoConfirmados.length} sem confirmação
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("agendado")}
                    className="rounded-md bg-yellow-100 px-2 py-[2px] text-[9px] font-black uppercase tracking-wide text-yellow-800 hover:bg-yellow-200"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={confirmAllTodayAppointments}
                    disabled={confirmingAllToday}
                    className="rounded-md bg-emerald-600 px-2 py-[2px] text-[9px] font-black uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {confirmingAllToday ? "..." : "OK"}
                  </button>
                </div>
              </div>
            )}

            {agendaAlerts.comDebito.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 shadow-sm min-h-[28px]">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs">💰</span>
                  <span className="truncate text-[11px] font-bold text-amber-800">
                    {agendaAlerts.comDebito.length} com débito hoje
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/financeiro")}
                  className="shrink-0 rounded-md bg-amber-100 px-2 py-[2px] text-[9px] font-black uppercase tracking-wide text-amber-800 hover:bg-amber-200"
                >
                  Cobrar
                </button>
              </div>
            )}

            {agendaAlerts.faltaram.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200/70 bg-red-50/70 px-2 py-0.5 shadow-sm min-h-[28px] xl:col-span-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs">🚫</span>
                  <span className="truncate text-[11px] font-bold text-red-800">
                    {agendaAlerts.faltaram.length} falta(s) hoje
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStatusFilter("faltou")}
                  className="shrink-0 rounded-md bg-red-100 px-2 py-[2px] text-[9px] font-black uppercase tracking-wide text-red-800 hover:bg-red-200"
                >
                  Ver
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 p-3">
        <div className="bg-white/95 rounded-[28px] border border-[#c2dddd] shadow-[0_18px_55px_rgba(15,23,42,0.10)] overflow-hidden flex flex-col min-h-0 ring-1 ring-white/70">
          <div ref={agendaScrollRef} className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-[76px_repeat(6,1fr)] border-b border-[#c7e4e4] bg-white/95 backdrop-blur-md text-xs font-bold sticky top-0 z-30 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
              <div className="p-3 text-slate-400 uppercase tracking-widest">Hora</div>

              {days.map((d) => {
                const holiday = getHolidayInfo(d.date);

                return (
                  <div
                    key={d.date}
                    className={`text-center p-2.5 border-l border-[#c2dddd] leading-tight ${
                      holiday
                        ? "bg-amber-50/90"
                        : isTodayDate(d.date)
                          ? "bg-[#e9fbfa]"
                          : "bg-white/70"
                    }`}
                    title={holiday ? holiday.name : undefined}
                  >
                    <div className="text-slate-700 font-black text-xs">
                      {d.label} {formatDateBr(d.date).slice(0, 5)}
                    </div>

                    {holiday && (
                      <div className="mx-auto mt-1 max-w-[150px] truncate rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                        Feriado • {holiday.scope === "municipal" ? "Araranguá" : "Brasil"}
                      </div>
                    )}

                    <div className={`mx-auto mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-black ${
                      holiday
                        ? "bg-white text-amber-800 ring-1 ring-amber-200"
                        : isTodayDate(d.date)
                          ? "bg-[#239d9a] text-white"
                          : "bg-[#e8f7f6] text-[#239d9a]"
                    }`}>
                      {getDayOccupation(d.date).used}/{getDayOccupation(d.date).total} pacientes
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative z-0">
          {hours.map((h) => (
            <div
              key={h}
              className="grid grid-cols-[76px_repeat(6,1fr)] border-b border-[#d7ebeb] text-xs"
            >
              <div className="px-3 py-2 bg-[#fbffff] font-black text-[11px] text-slate-500 tracking-tight">{h}</div>

              {days.map((d) => {
                const ag = appointments.filter((a) => {
                  const sameSlot = a.date === d.date && a.start_time === h;

                  if (!sameSlot) return false;

                  if (statusFilter === "todos") return true;

                  return (a.status || "agendado") === statusFilter;
                });

                return (
                  <div
                    key={d.date + h}
                    className={`border-l border-[#d7ebeb] min-h-[34px] cursor-pointer relative transition-colors min-w-0 overflow-visible group ${
                      getHolidayInfo(d.date)
                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                        : "hover:bg-[#f6ffff]"
                    }`}
                    onClick={() => openNew(d.date, h)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnCell(d.date, h);
                    }}
                  >
                    {ag.map((a, index) => {
                      const overlapCount = Math.max(1, ag.length);
                      const widthPercent = 100 / overlapCount;
                      const leftPercent = index * widthPercent;

                      return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggingId(a.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointmentDetails(a);
                        }}
                        className={`${getColor(a)} ${
                          hasDebt(a.patient_id)
                            ? "ring-2 ring-amber-300 ring-offset-1"
                            : ""
                        } absolute top-1 z-[1] overflow-hidden text-white text-[10px] px-2 py-2 rounded-xl cursor-pointer shadow-[0_10px_26px_rgba(15,23,42,0.20)] border border-white/30 transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_16px_34px_rgba(15,23,42,0.24)]`}
                        style={{
                          height: `${getDurationHeight(a.duration || 30)}px`,
                          left: `calc(${leftPercent}% + 6px)`,
                          width: `calc(${widthPercent}% - 12px)`,
                        }}
                        title="Clique para ver detalhes. Arraste para remarcar. Use a barra inferior para alterar a duração."
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/55" />
                        <div className="flex items-start justify-between gap-1 pl-1">
                          <div className="min-w-0">
                            <div className="font-black truncate pr-1 leading-tight text-[11px]">
                              {a.patient_name || a.title}
                            </div>
                            <div className="opacity-90 truncate mt-0.5 pr-1 leading-tight text-[9px]">
                              {a.type === "compromisso" ? "Compromisso" : a.title}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[8px] font-black leading-none">
                            {a.start_time}
                          </span>
                        </div>

                        {a.professional_id && (
                          <div className="opacity-95 truncate mt-1 pl-1 pr-1 leading-tight text-[8px] font-bold">
                            {getProfessionalLabel(a.professional_id)}
                          </div>
                        )}

                        <div className="mt-1.5 flex items-center gap-1 flex-nowrap overflow-hidden pl-1">
                          {a.type !== "compromisso" && (
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight whitespace-nowrap leading-none ${statusBadgeClass(
                                a.status
                              )}`}
                            >
                              {statusLabel(a.status)}
                            </span>
                          )}

                          {a.reminder_enabled && !a.reminder_sent_at && (
                            <span
                              className="shrink-0 rounded-md bg-yellow-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight text-yellow-700 whitespace-nowrap leading-none"
                              title={`Lembrete pendente: ${a.reminder_before_hours || 24}h antes`}
                            >
                              Lemb.
                            </span>
                          )}

                          {a.reminder_sent_at && (
                            <span
                              className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight text-green-700 whitespace-nowrap leading-none"
                              title="Lembrete enviado"
                            >
                              Avisado
                            </span>
                          )}

                          {hasDebt(a.patient_id) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPatientFinance(a.patient_id);
                              }}
                              className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700 whitespace-nowrap leading-none hover:bg-amber-200"
                              title={`Abrir financeiro do paciente. Débito: ${formatCurrency(
                                getPatientDebt(a.patient_id)
                              )}`}
                            >
                              💰
                            </button>
                          )}
                        </div>

                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setResizingId(a.id);
                            setResizeStartY(e.clientY);
                            setResizeStartDuration(Number(a.duration || 30));
                          }}
                          className="absolute bottom-0 left-0 right-0 h-2 bg-black/15 cursor-ns-resize rounded-b-xl hover:bg-white/30 transition-colors"
                          title="Arraste para aumentar ou diminuir a duração"
                        />
                      </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}

              {currentTimePosition !== null && (
                <div
                  className="pointer-events-none absolute left-[76px] right-0 z-[9999] border-t-[3px] border-[#239d9a] drop-shadow-[0_0_6px_rgba(35,157,154,0.45)]"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <span className="absolute -top-3 left-2 rounded-full bg-[#239d9a] px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                    agora {pad(now.getHours())}:{pad(now.getMinutes())}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedAppointmentDetails && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-[560px] rounded-[28px] overflow-hidden bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] border border-[#c2dddd]">
            <div className={`${getColor(selectedAppointmentDetails)} text-white p-5 shadow-inner`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black leading-tight">
                    {selectedAppointmentDetails.patient_name ||
                      selectedAppointmentDetails.title}
                  </h2>

                  <p className="mt-1 text-sm opacity-95">
                    {formatDateBr(selectedAppointmentDetails.date)} •{" "}
                    {selectedAppointmentDetails.start_time} •{" "}
                    {selectedAppointmentDetails.duration || 30} min
                  </p>

                  <p className="mt-1 text-sm opacity-95">
                    {selectedAppointmentDetails.type === "compromisso"
                      ? "Compromisso"
                      : selectedAppointmentDetails.title || "Consulta"}
                  </p>

                  {selectedAppointmentDetails.professional_id && (
                    <p className="mt-1 text-sm font-bold opacity-95">
                      Profissional:{" "}
                      {getProfessionalLabel(selectedAppointmentDetails.professional_id)}
                    </p>
                  )}

                  {hasDebt(selectedAppointmentDetails.patient_id) && (
                    <button
                      type="button"
                      onClick={() =>
                        openPatientFinance(selectedAppointmentDetails.patient_id)
                      }
                      className="mt-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-white hover:bg-white/30"
                      title="Abrir financeiro do paciente"
                    >
                      💰 Débito:{" "}
                      {formatCurrency(
                        getPatientDebt(selectedAppointmentDetails.patient_id)
                      )}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAppointmentDetails(null)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {selectedAppointmentDetails.type !== "compromisso" && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                    Status da consulta
                  </label>
                  <select
                    value={selectedAppointmentDetails.status || "agendado"}
                    onChange={(e) =>
                      updateAppointmentStatus(
                        selectedAppointmentDetails.id,
                        e.target.value as AppointmentStatus
                      )
                    }
                    className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white text-slate-700 font-semibold"
                  >
                    <option value="agendado">Agendada</option>
                    <option value="confirmado">Confirmada</option>
                    <option value="em_atendimento">Em atendimento</option>
                    <option value="finalizado">Finalizada</option>
                    <option value="faltou">Faltou</option>
                    <option value="cancelado">Cancelada</option>
                  </select>
                </div>
              )}

              {selectedAppointmentDetails.description && (
                <div className="rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                    Descrição
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedAppointmentDetails.description}
                  </div>
                </div>
              )}

              {selectedAppointmentDetails.type !== "compromisso" && (
                <div className="rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-700">
                        Lembrete
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedAppointmentDetails.reminder_sent_at
                          ? "Lembrete marcado como enviado"
                          : selectedAppointmentDetails.reminder_enabled
                            ? `Pendente para ${selectedAppointmentDetails.reminder_before_hours || 24}h antes`
                            : "Lembrete desativado"}
                      </div>
                    </div>

                    {selectedAppointmentDetails.reminder_sent_at ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-green-700">
                        Enviado
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-yellow-700">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedAppointmentDetails.patient_id && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/pacientes/${selectedAppointmentDetails.patient_id}`
                      )
                    }
                    className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#f6ffff]"
                  >
                    Abrir prontuário
                  </button>
                )}

                {selectedAppointmentDetails.type !== "compromisso" && (
                  <button
                    type="button"
                    onClick={() => openSmartReschedule(selectedAppointmentDetails)}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 hover:bg-amber-100"
                  >
                    Reagendar inteligente
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const appointmentToEdit = selectedAppointmentDetails;
                    setSelectedAppointmentDetails(null);
                    openEdit(appointmentToEdit);
                  }}
                  className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#f6ffff]"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(selectedAppointmentDetails.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                >
                  Excluir agendamento
                </button>

                {selectedAppointmentDetails.type !== "compromisso" &&
                  hasReminderPhone(selectedAppointmentDetails) &&
                  !selectedAppointmentDetails.reminder_sent_at && (
                    <a
                      href={buildWhatsappHref(selectedAppointmentDetails, "confirmacao")}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        markReminderAsSent(selectedAppointmentDetails.id)
                      }
                      className="sm:col-span-2 rounded-xl bg-[#1fb36e] px-4 py-3 text-center text-sm font-black text-white hover:bg-[#18975d]"
                    >
                      Confirmar por WhatsApp
                    </a>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-8 z-50">
          <div className="bg-white w-full max-w-[640px] max-h-[90vh] rounded-2xl border border-[#c2dddd] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-[#c2dddd] bg-white">
              <h2 className="font-bold text-xl text-slate-800">
                {editingId ? "Editar agendamento" : "Novo agendamento"}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-full border border-[#c2dddd] text-slate-500 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMainType("consulta")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mainType === "consulta"
                    ? "bg-[#239d9a] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Consulta
              </button>

              <button
                onClick={() => setMainType("compromisso")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mainType === "compromisso"
                    ? "bg-[#239d9a] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Compromisso
              </button>
            </div>

            {mainType === "consulta" && (
              <>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600">
                    Paciente
                  </label>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedPatient(null);
                    }}
                    placeholder="Buscar paciente"
                    className="w-full border border-[#c2dddd] p-3 rounded-xl"
                  />
                </div>

                <div className="border border-[#c2dddd] rounded-xl max-h-32 overflow-auto">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearch(p.name);
                      }}
                      className="p-3 hover:bg-[#f6ffff] cursor-pointer"
                    >
                      {p.name}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600">
                    Motivo
                  </label>
                  <select
                    value={consultaMotivo}
                    onChange={(e) =>
                      setConsultaMotivo(e.target.value as ConsultaMotivo)
                    }
                    className="w-full border border-[#c2dddd] p-3 rounded-xl"
                  >
                    <option value="consulta">Consulta</option>
                    <option value="retorno">Retorno</option>
                    <option value="tratamento">Tratamento</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-600">
                Profissional responsável
              </label>
              <select
                value={selectedProfessionalId}
                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
              >
                <option value="">Sem profissional definido</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                    {professional.specialty ? ` • ${professional.specialty}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {mainType === "compromisso" && (
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600">
                  Título
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do compromisso"
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-600">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição"
                className="w-full border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600">
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-600">
                Duração
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border border-[#c2dddd] p-3 rounded-xl"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="75">75 min</option>
                <option value="90">90 min</option>
              </select>
            </div>

            {mainType === "consulta" && (
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600">
                  Status
                </label>
                <select
                  value={appointmentStatus}
                  onChange={(e) =>
                    setAppointmentStatus(e.target.value as AppointmentStatus)
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                >
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="faltou">Faltou</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            )}

            {mainType === "consulta" && (
              <div className="rounded-2xl border border-[#c2dddd] bg-[#fbffff] p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-700">
                      Lembrete automático
                    </div>
                    <div className="text-xs text-slate-500">
                      Preparado para envio automático por WhatsApp
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#239d9a] peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {reminderEnabled && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-600">
                      Enviar lembrete
                    </label>
                    <select
                      value={reminderBeforeHours}
                      onChange={(e) => setReminderBeforeHours(e.target.value)}
                      className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                    >
                      <option value="1">1 hora antes</option>
                      <option value="3">3 horas antes</option>
                      <option value="6">6 horas antes</option>
                      <option value="12">12 horas antes</option>
                      <option value="24">24 horas antes</option>
                      <option value="48">48 horas antes</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#c2dddd] p-4 flex justify-end gap-2 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-[#c2dddd] bg-white hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}