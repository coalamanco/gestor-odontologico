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

const SLOT_HEIGHT = 28;
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

function getWeekdayLabel(date: Date) {
  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return labels[date.getDay()] || "DIA";
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

const PROFESSIONAL_COLORS = [
  "#239d9a",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#16a34a",
  "#db2777",
  "#0891b2",
  "#9333ea",
  "#ca8a04",
  "#475569",
];

function getStableColorIndex(value?: string | null) {
  if (!value) return 0;

  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash % PROFESSIONAL_COLORS.length;
}

function getProfessionalColor(professionalId?: string | null) {
  if (!professionalId) return "#239d9a";
  return PROFESSIONAL_COLORS[getStableColorIndex(professionalId)];
}

function getProfessionalInitials(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "TP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}


function addMinutesToTime(time: string, minutes: number) {
  const [hour, minute] = String(time || "08:00").split(":").map(Number);
  const date = new Date(2000, 0, 1, hour || 8, minute || 0, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minutesBetweenTimes(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return 60;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60;
  return end - start;
}

function getBlockTypeLabel(type?: string | null) {
  if (type === "almoco") return "Almoço";
  if (type === "ferias") return "Férias";
  if (type === "reuniao") return "Reunião";
  if (type === "curso") return "Curso/Congresso";
  if (type === "pessoal") return "Pessoal";
  if (type === "manutencao") return "Manutenção";
  return "Bloqueio";
}

function getDefaultBlockTitle(type?: string | null) {
  const label = getBlockTypeLabel(type);
  return label === "Bloqueio" ? "Horário bloqueado" : label;
}

function getBlockColor(type?: string | null) {
  if (type === "almoco") return "#78716c";
  if (type === "ferias") return "#475569";
  if (type === "reuniao") return "#4b5563";
  if (type === "curso") return "#6d28d9";
  if (type === "pessoal") return "#9f1239";
  if (type === "manutencao") return "#92400e";
  return "#6b7280";
}

function getFallbackAppointmentColor(status?: string | null, type?: string | null, title?: string | null) {
  if (type === "compromisso") return "#64748b";

  if (status === "confirmado") return "#10b981";
  if (status === "em_atendimento") return "#2563eb";
  if (status === "finalizado") return "#64748b";
  if (status === "faltou") return "#ef4444";
  if (status === "cancelado") return "#94a3b8";

  const motivo = String(title || "").toLowerCase();

  if (motivo === "retorno") return "#10b981";
  if (motivo === "tratamento") return "#14b8a6";

  return "#0ea5a4";
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

  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [financialRecords, setFinancialRecords] = useState<any[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState({
    start_hour: START_HOUR,
    end_hour: END_HOUR,
    max_patients_day: 15,
  });

  const agendaScrollRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const [now, setNow] = useState(new Date());

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

  const [weekBaseDate, setWeekBaseDate] = useState<Date>(new Date());
  const [mobileView, setMobileView] = useState<"day" | "week">("day");
  const [isMobileAgenda, setIsMobileAgenda] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [miniCalendarDate, setMiniCalendarDate] = useState<Date>(new Date());
  const [showMobileAgendaSheet, setShowMobileAgendaSheet] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedAgendaProfessionalId, setSelectedAgendaProfessionalId] = useState<string>("");
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

    const { data: blocks } = await supabase
      .from("schedule_blocks")
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
    if (blocks) setScheduleBlocks(blocks);
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

  useEffect(() => {
    const updateMobileAgenda = () => {
      setIsMobileAgenda(window.innerWidth < 768);
    };

    updateMobileAgenda();
    window.addEventListener("resize", updateMobileAgenda);

    return () => window.removeEventListener("resize", updateMobileAgenda);
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


  const resetBlockForm = () => {
    const defaultStart = `${pad(clinicSettings.start_hour)}:00`;
    setBlockForm({
      id: "",
      professional_id: selectedAgendaProfessionalId || "",
      block_type: "bloqueio",
      title: "Horário bloqueado",
      description: "",
      date: "",
      start_time: defaultStart,
      end_time: addMinutesToTime(defaultStart, 60),
      all_day: false,
    });
  };

  const openNewBlock = (selectedDate?: string, selectedTime?: string) => {
    const nextStart = selectedTime || `${pad(clinicSettings.start_hour)}:00`;
    setBlockForm({
      id: "",
      professional_id: selectedAgendaProfessionalId || "",
      block_type: "bloqueio",
      title: "Horário bloqueado",
      description: "",
      date: selectedDate || formatDate(new Date()),
      start_time: nextStart,
      end_time: addMinutesToTime(nextStart, 60),
      all_day: false,
    });
    setShowBlockModal(true);
  };

  const saveScheduleBlock = async () => {
    if (!blockForm.date) {
      alert("Informe a data do bloqueio.");
      return;
    }

    const title = blockForm.title.trim() || getDefaultBlockTitle(blockForm.block_type);
    const startTime = blockForm.all_day
      ? `${pad(clinicSettings.start_hour)}:00`
      : blockForm.start_time;
    const endTime = blockForm.all_day
      ? `${pad(clinicSettings.end_hour)}:00`
      : blockForm.end_time;

    if (!blockForm.all_day && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      alert("O horário final precisa ser maior que o horário inicial.");
      return;
    }

    const payload = {
      professional_id: blockForm.professional_id || null,
      title,
      description: blockForm.description.trim() || null,
      block_type: blockForm.block_type,
      date: blockForm.date,
      start_time: startTime,
      end_time: endTime,
      all_day: blockForm.all_day,
      color: getBlockColor(blockForm.block_type),
    };

    const query = blockForm.id
      ? supabase.from("schedule_blocks").update(payload).eq("id", blockForm.id)
      : supabase.from("schedule_blocks").insert([payload]);

    const { error } = await query;

    if (error) {
      alert("Erro ao salvar bloqueio: " + error.message);
      return;
    }

    setShowBlockModal(false);
    resetBlockForm();
    await loadData();
  };

  const deleteScheduleBlock = async (blockId: string) => {
    const ok = window.confirm("Remover este bloqueio de horário?");
    if (!ok) return;

    const { error } = await supabase
      .from("schedule_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      alert("Erro ao remover bloqueio: " + error.message);
      return;
    }

    setSelectedBlockDetails(null);
    setShowBlockModal(false);
    await loadData();
  };

  const editScheduleBlock = (block: any) => {
    setSelectedBlockDetails(null);
    setBlockForm({
      id: block.id || "",
      professional_id: block.professional_id || "",
      block_type: block.block_type || "bloqueio",
      title: block.title || getDefaultBlockTitle(block.block_type),
      description: block.description || "",
      date: block.date || "",
      start_time: block.start_time || `${pad(clinicSettings.start_hour)}:00`,
      end_time: block.end_time || addMinutesToTime(block.start_time || `${pad(clinicSettings.start_hour)}:00`, 60),
      all_day: block.all_day === true,
    });
    setShowBlockModal(true);
  };

  const days = useMemo(() => {
    if (isMobileAgenda && mobileView === "day") {
      return [
        {
          date: formatDate(weekBaseDate),
          label: getWeekdayLabel(weekBaseDate),
          num: pad(weekBaseDate.getDate()),
        },
      ];
    }

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
  }, [weekBaseDate, isMobileAgenda, mobileView]);

  const miniCalendarDays = useMemo(() => {
    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;

    const startDate = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }).map((_, index) => {
      const current = addDays(startDate, index);
      return {
        date: current,
        dateKey: formatDate(current),
        day: current.getDate(),
        currentMonth: current.getMonth() === month,
        today: isTodayDate(formatDate(current)),
      };
    });
  }, [miniCalendarDate]);

  const selectMiniCalendarDay = (selectedDate: Date) => {
    setWeekBaseDate(selectedDate);
    setMiniCalendarDate(selectedDate);
    setShowMiniCalendar(false);
  };

  const goToPreviousDay = () => {
    setWeekBaseDate((prev) => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setWeekBaseDate((prev) => addDays(prev, 1));
  };

  const handleAgendaTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileAgenda || mobileView !== "day") return;

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleAgendaTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileAgenda || mobileView !== "day") return;
    if (showModal || showBlockModal || selectedAppointmentDetails || selectedBlockDetails) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const elapsed = Date.now() - touchStartTimeRef.current;

    const isHorizontalSwipe =
      Math.abs(deltaX) > 70 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4 &&
      elapsed < 900;

    if (!isHorizontalSwipe) return;

    if (deltaX < 0) {
      goToNextDay();
    } else {
      goToPreviousDay();
    }
  };

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
    const dayAppointments = filteredAppointmentsByProfessional.filter(
      (a) => a.date === targetDate && a.type !== "compromisso"
    );

    return {
      used: dayAppointments.length,
      total: clinicSettings.max_patients_day,
    };
  };

  const getColor = (a: any) => {
    if (a.type === "compromisso") return "bg-slate-400";

    const status = String(a.status || "agendado");

    if (status === "confirmado") return "bg-emerald-500";
    if (status === "em_atendimento") return "bg-blue-600";
    if (status === "finalizado") return "bg-slate-600";
    if (status === "faltou") return "bg-red-600";
    if (status === "cancelado") return "bg-slate-400";

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
    if (status === "confirmado") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70";
    if (status === "em_atendimento") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200/70";
    if (status === "finalizado") return "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70";
    if (status === "faltou") return "bg-red-50 text-red-700 ring-1 ring-red-200/70";
    if (status === "cancelado") return "bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200/70";
    return "bg-white/80 text-slate-600 ring-1 ring-white/70";
  };

  const appointmentTypeLabel = (appointment: any) => {
    if (appointment?.type === "compromisso") return "Compromisso";

    const raw = String(appointment?.title || "consulta").toLowerCase();

    if (raw === "retorno") return "Retorno";
    if (raw === "tratamento") return "Tratamento";

    return "Consulta";
  };

  const slotDividerClass = (timeValue: string) => {
    const minute = Number(String(timeValue || "").split(":")[1] || 0);

    if (minute === 0) {
      return "border-b border-[#b8d7d7] bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]";
    }

    if (minute === 30) {
      return "border-b border-[#cfe5e5] bg-white";
    }

    return "border-b border-[#e6f0f0] bg-white";
  };

  const timeColumnClass = (timeValue: string) => {
    const minute = Number(String(timeValue || "").split(":")[1] || 0);

    if (minute === 0) {
      return "bg-[#f1fbfb] text-slate-600 font-black";
    }

    if (minute === 30) {
      return "bg-[#f7ffff] text-slate-500 font-extrabold";
    }

    return "bg-[#fbffff] text-slate-400 font-bold";
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
        console.error("Erro ao excluir agendamento:", result);
        alert(
          result?.error ||
            result?.details ||
            "Erro ao excluir agendamento."
        );
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

    if (!isSlotAvailable(date, time, parsedDuration, editingId, selectedProfessionalId)) {
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
        draggingId,
        current.professional_id
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
          resizingId,
          appt.professional_id
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

  return (
    <div className="h-screen flex flex-col bg-[#f5f7f8]">
      <div className="hidden border-b border-[#d7e7e7] bg-white/95 px-3 py-1 shadow-sm md:block">
        <div className="grid min-h-[38px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">

            <button
              type="button"
              onClick={() => {
                setShowMiniCalendar(false);
                setWeekBaseDate(new Date());
                setMiniCalendarDate(new Date());
              }}
              className="h-7 rounded-lg bg-[#239d9a] px-3 text-xs font-black text-white shadow-sm hover:opacity-90"
            >
              Hoje
            </button>

            <div className="hidden w-[250px] items-center gap-2 rounded-xl border border-[#c2dddd] bg-white px-2 py-1 shadow-sm md:flex">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm"
                style={{ backgroundColor: selectedProfessionalColor }}
              >
                {selectedAgendaProfessionalId ? selectedProfessionalInitials : "TP"}
              </div>

              <select
                value={selectedAgendaProfessionalId}
                onChange={(e) => setSelectedAgendaProfessionalId(e.target.value)}
                className="h-7 min-w-0 flex-1 bg-transparent text-xs font-black text-slate-700 outline-none"
                title="Selecionar agenda do profissional"
              >
                <option value="">Todos os profissionais</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setMiniCalendarDate(weekBaseDate);
                  setShowMiniCalendar((prev) => !prev);
                }}
                className="h-7 rounded-lg bg-white px-3 text-[12px] font-black text-[#239d9a] ring-1 ring-[#d9eeee] hover:bg-[#f2fcfc]"
                title="Abrir mini calendário"
              >
                📅
              </button>

              {showMiniCalendar && (
                <div className="absolute left-0 top-9 z-[80] w-[292px] rounded-2xl border border-[#d4e8e8] bg-white p-3 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMiniCalendarDate((prev) => {
                          const next = new Date(prev);
                          next.setMonth(next.getMonth() - 1);
                          return next;
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eefafa] text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                      title="Mês anterior"
                    >
                      ◀
                    </button>

                    <div className="text-center">
                      <div className="text-sm font-black capitalize text-slate-800">
                        {miniCalendarDate.toLocaleDateString("pt-BR", {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        escolher dia
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setMiniCalendarDate((prev) => {
                          const next = new Date(prev);
                          next.setMonth(next.getMonth() + 1);
                          return next;
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eefafa] text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                      title="Próximo mês"
                    >
                      ▶
                    </button>
                  </div>

                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
                    {["S", "T", "Q", "Q", "S", "S", "D"].map((item, index) => (
                      <div key={`${item}-${index}`} className="py-1">
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {miniCalendarDays.map((item) => {
                      const selected = item.dateKey === formatDate(weekBaseDate);
                      const holiday = getHolidayInfo(item.dateKey);

                      return (
                        <button
                          key={item.dateKey}
                          type="button"
                          onClick={() => selectMiniCalendarDay(item.date)}
                          title={holiday?.name || formatDateBr(item.dateKey)}
                          className={`relative flex h-8 items-center justify-center rounded-lg text-xs font-black transition ${
                            selected
                              ? "bg-[#239d9a] text-white"
                              : item.today
                                ? "bg-[#e8f7f6] text-[#239d9a] ring-1 ring-[#239d9a]/20"
                                : item.currentMonth
                                  ? "text-slate-700 hover:bg-[#f2fcfc]"
                                  : "text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {item.day}
                          {holiday && (
                            <span className={`absolute bottom-1 h-1 w-1 rounded-full ${
                              selected ? "bg-white" : "bg-amber-400"
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#e0eeee] pt-3">
                    <button
                      type="button"
                      onClick={() => selectMiniCalendarDay(new Date())}
                      className="rounded-lg bg-[#eefafa] px-3 py-2 text-[11px] font-black text-[#239d9a] hover:bg-[#dff3f2]"
                    >
                      Hoje
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMiniCalendar(false)}
                      className="rounded-lg border border-[#d4e8e8] bg-white px-3 py-2 text-[11px] font-bold text-slate-500 hover:bg-[#f4fbfb]"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="flex min-w-[280px] flex-col items-center justify-center text-center">
            <h1 className="truncate text-[18px] font-black leading-none text-slate-800 lg:text-[22px]">
              Agenda Clínica
            </h1>
            <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[0.28em] text-[#239d9a] lg:text-[10px]">
              {new Date(weekBaseDate).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 w-[126px] rounded-lg border border-[#c2dddd] bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
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
              onClick={() => openNewBlock(days[0]?.date, `${pad(clinicSettings.start_hour)}:00`)}
              className="h-7 rounded-lg bg-slate-700 px-3 text-[10px] font-black text-white shadow-sm hover:bg-slate-800"
              title="Bloquear horário na agenda"
            >
              Bloquear
            </button>

            <button
              type="button"
              onClick={syncExistingGoogleAppointments}
              className="hidden h-7 rounded-lg border border-[#c2dddd] bg-white px-3 text-[10px] font-black text-[#239d9a] shadow-sm hover:bg-[#f4ffff] xl:inline-flex xl:items-center"
              title="Sincronizar consultas existentes com Google Agenda"
            >
              Sincronizar
            </button>

            <button
              type="button"
              onClick={connectGoogleCalendar}
              className="h-7 rounded-lg border border-[#c2dddd] bg-white px-3 text-[11px] font-black text-[#239d9a] shadow-sm hover:bg-[#f4ffff]"
              title="Conectar sua conta ao Google Agenda"
            >
              Google Agenda
            </button>


          </div>
        </div>
      </div>

      <div className="border-b border-[#d7e7e7] bg-white/95 px-2 py-1.5 shadow-sm md:hidden">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button type="button" onClick={() => { setShowMiniCalendar(false); setWeekBaseDate(new Date()); setMiniCalendarDate(new Date()); }} className="h-9 rounded-2xl bg-[#239d9a] px-4 text-[13px] font-black text-white shadow-sm active:scale-[0.98]">Hoje</button>
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#c2dddd] bg-white px-2 shadow-sm">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: selectedProfessionalColor }}>{selectedAgendaProfessionalId ? selectedProfessionalInitials : "TP"}</div>
            <select value={selectedAgendaProfessionalId} onChange={(e) => setSelectedAgendaProfessionalId(e.target.value)} className="h-9 min-w-0 flex-1 bg-transparent text-[13px] font-black text-slate-700 outline-none" title="Selecionar agenda do profissional">
              <option value="">Todos</option>
              {activeProfessionals.map((professional) => (<option key={professional.id} value={professional.id}>{professional.name}</option>))}
            </select>
          </div>
          <button type="button" onClick={() => { setShowMiniCalendar(false); setMiniCalendarDate(weekBaseDate); setShowMobileAgendaSheet(true); }} className="h-9 rounded-2xl border border-[#c2dddd] bg-white px-3 text-[12px] font-black text-[#239d9a] shadow-sm active:scale-[0.98]">⚙ Agenda</button>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{mobileView === "day" ? "Modo dia" : "Modo semana"}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#239d9a]">{new Date(weekBaseDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
        </div>
      </div>

      {showMobileAgendaSheet && (
        <div className="fixed inset-0 z-[90] bg-slate-900/35 md:hidden" onClick={() => setShowMobileAgendaSheet(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[28px] border border-[#d7e7e7] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-black text-slate-800">Controles da agenda</h2><p className="text-xs font-semibold text-slate-500">Ajuste a visualização sem ocupar espaço da agenda.</p></div>
              <button type="button" onClick={() => setShowMobileAgendaSheet(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600">✕</button>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#c2dddd] bg-[#fbffff] p-3">
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Profissional</label>
                <div className="flex items-center gap-2 rounded-2xl border border-[#c2dddd] bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: selectedProfessionalColor }}>{selectedAgendaProfessionalId ? selectedProfessionalInitials : "TP"}</div>
                  <select value={selectedAgendaProfessionalId} onChange={(e) => setSelectedAgendaProfessionalId(e.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-sm font-black text-slate-700 outline-none" title="Selecionar agenda do profissional">
                    <option value="">Todos os profissionais</option>
                    {activeProfessionals.map((professional) => (<option key={professional.id} value={professional.id}>{professional.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="rounded-2xl border border-[#c2dddd] bg-white p-3 shadow-sm">
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Visualização</label>
                <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#c2dddd] bg-[#f7ffff]">
                  <button type="button" onClick={() => setMobileView("day")} className={`h-10 text-sm font-black transition ${mobileView === "day" ? "bg-[#239d9a] text-white" : "text-slate-600"}`}>Dia</button>
                  <button type="button" onClick={() => setMobileView("week")} className={`h-10 text-sm font-black transition ${mobileView === "week" ? "bg-[#239d9a] text-white" : "text-slate-600"}`}>Semana</button>
                </div>
              </div>
              {mobileView === "day" && (
                <div className="rounded-2xl border border-[#c2dddd] bg-white p-3 shadow-sm">
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Navegação</label>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <button type="button" onClick={() => { goToPreviousDay(); setShowMobileAgendaSheet(false); }} className="h-10 rounded-2xl border border-[#c2dddd] bg-white px-2 text-xs font-black text-[#239d9a]">◀ Anterior</button>
                    <button type="button" onClick={() => { setWeekBaseDate(new Date()); setMiniCalendarDate(new Date()); setShowMobileAgendaSheet(false); }} className="h-10 rounded-2xl bg-[#239d9a] px-4 text-xs font-black text-white">Hoje</button>
                    <button type="button" onClick={() => { goToNextDay(); setShowMobileAgendaSheet(false); }} className="h-10 rounded-2xl border border-[#c2dddd] bg-white px-2 text-xs font-black text-[#239d9a]">Próximo ▶</button>
                  </div>
                  <button type="button" onClick={() => { setMiniCalendarDate(weekBaseDate); setShowMiniCalendar((prev) => !prev); }} className="mt-2 h-10 w-full rounded-2xl bg-[#eefafa] text-sm font-black text-[#239d9a]">📅 Escolher outro dia</button>
                  <div className="mt-2 rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-center text-[11px] font-bold text-slate-500">Dica: também pode deslizar a agenda para os lados.</div>
                </div>
              )}
              {showMiniCalendar && (
                <div className="rounded-2xl border border-[#d4e8e8] bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setMiniCalendarDate((prev) => { const next = new Date(prev); next.setMonth(next.getMonth() - 1); return next; })} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eefafa] text-xs font-black text-[#239d9a]">◀</button>
                    <div className="text-center"><div className="text-sm font-black capitalize text-slate-800">{miniCalendarDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">escolher dia</div></div>
                    <button type="button" onClick={() => setMiniCalendarDate((prev) => { const next = new Date(prev); next.setMonth(next.getMonth() + 1); return next; })} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eefafa] text-xs font-black text-[#239d9a]">▶</button>
                  </div>
                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">{["S", "T", "Q", "Q", "S", "S", "D"].map((item, index) => (<div key={`${item}-${index}`} className="py-1">{item}</div>))}</div>
                  <div className="grid grid-cols-7 gap-1">
                    {miniCalendarDays.map((item) => {
                      const selected = item.dateKey === formatDate(weekBaseDate);
                      const holiday = getHolidayInfo(item.dateKey);
                      return (
                        <button key={item.dateKey} type="button" onClick={() => { selectMiniCalendarDay(item.date); setShowMobileAgendaSheet(false); }} title={holiday?.name || formatDateBr(item.dateKey)} className={`relative flex h-9 items-center justify-center rounded-xl text-xs font-black transition ${selected ? "bg-[#239d9a] text-white" : item.today ? "bg-[#e8f7f6] text-[#239d9a] ring-1 ring-[#239d9a]/20" : item.currentMonth ? "text-slate-700 hover:bg-[#f2fcfc]" : "text-slate-300 hover:bg-slate-50"}`}>
                          {item.day}{holiday && (<span className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-amber-400"}`} />)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { openNewBlock(days[0]?.date, `${pad(clinicSettings.start_hour)}:00`); setShowMobileAgendaSheet(false); }} className="h-11 rounded-2xl bg-slate-700 px-3 text-xs font-black text-white shadow-sm">Bloquear horário</button>
                <button type="button" onClick={connectGoogleCalendar} className="h-11 rounded-2xl border border-[#c2dddd] bg-white px-3 text-xs font-black text-[#239d9a] shadow-sm">Google Agenda</button>
              </div>
              <div className="rounded-2xl border border-[#c2dddd] bg-white p-3 shadow-sm">
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Filtro de status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 w-full rounded-2xl border border-[#c2dddd] bg-white px-3 text-sm font-black text-slate-700 outline-none" title="Filtrar agenda por status">
                  <option value="todos">Todos</option><option value="agendado">Agendado</option><option value="confirmado">Confirmado</option><option value="em_atendimento">Em atendimento</option><option value="finalizado">Finalizado</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 p-1.5 md:p-2.5">
        <div
          className="bg-white rounded-[16px] border border-[#d1e5e5] shadow-sm overflow-hidden flex flex-col min-h-0"
          onTouchStart={handleAgendaTouchStart}
          onTouchEnd={handleAgendaTouchEnd}
        >
          <div ref={agendaScrollRef} className="flex-1 overflow-y-auto min-h-0">
            <div
              className="grid border-b border-[#d7e7e7] bg-white/95 backdrop-blur-md text-xs font-bold sticky top-0 z-30 shadow-sm"
              style={{
                gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))`,
              }}
            >
              <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-widest">Hora</div>

              {days.map((d) => {
                const holiday = getHolidayInfo(d.date);

                return (
                  <div
                    key={d.date}
                    className={`text-center px-2 py-2 border-l border-[#d7e7e7] leading-tight ${
                      holiday
                        ? "bg-amber-50/90"
                        : isTodayDate(d.date)
                          ? "bg-[#e9fbfa]"
                          : "bg-white/70"
                    }`}
                    title={holiday ? holiday.name : undefined}
                  >
                    <div className="text-slate-700 font-black text-[11px]">
                      {d.label} {formatDateBr(d.date).slice(0, 5)}
                    </div>

                    {holiday && (
                      <div className="mx-auto mt-1 max-w-[150px] truncate rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                        Feriado • {holiday.scope === "municipal" ? "Araranguá" : "Brasil"}
                      </div>
                    )}

                    <div className={`mx-auto mt-1 w-fit rounded-full px-2 py-0.5 text-[9px] font-black ${
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
              className={`grid text-xs ${slotDividerClass(h)}`}
              style={{
                gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))`,
              }}
            >
              <div className={`px-2 py-1 text-[9px] tracking-tight md:px-3 md:py-1.5 md:text-[10px] ${timeColumnClass(h)}`}>{h}</div>

              {days.map((d) => {
                const ag = filteredAppointmentsByProfessional.filter((a) => {
                  const sameSlot = a.date === d.date && a.start_time === h;

                  if (!sameSlot) return false;

                  if (statusFilter === "todos") return true;

                  return (a.status || "agendado") === statusFilter;
                });

                return (
                  <div
                    key={d.date + h}
                    className={`border-l border-[#dbe9e9] cursor-pointer relative transition-colors min-w-0 overflow-visible group touch-manipulation ${isMobileAgenda && mobileView === "day" ? "min-h-[28px]" : "min-h-[28px]"} ${
                      getHolidayInfo(d.date)
                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                        : "hover:bg-[#fbffff]"
                    }`}
                    onClick={() => openNew(d.date, h)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnCell(d.date, h);
                    }}
                  >
                    {getScheduleBlocksForSlot(d.date, h).map((block) => {
                      const blockProfessional = getProfessionalById(block.professional_id);
                      const blockColor = block.color || getBlockColor(block.block_type);

                      return (
                        <div
                          key={block.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBlockDetails(block);
                          }}
                          className="absolute left-[3px] right-[3px] top-0.5 z-[2] overflow-hidden rounded-lg border border-slate-300/30 px-1.5 py-0.5 text-[8px] text-white cursor-pointer opacity-70 shadow-sm md:left-[5px] md:right-[5px] md:px-2 md:py-1 md:text-[9px]"
                          style={{
                            height: `${getScheduleBlockHeight(block)}px`,
                            backgroundColor: blockColor,
                            
                          }}
                          title="Horário bloqueado. Clique para ver detalhes."
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/30" />
                          <div className="pl-1 font-black uppercase tracking-wide leading-tight truncate text-[9px]">
                            {block.title || getDefaultBlockTitle(block.block_type)}
                          </div>
                          <div className="mt-0.5 pl-1 text-[8px] font-bold opacity-90 truncate">
                            {block.all_day
                              ? "Dia inteiro"
                              : `${block.start_time} - ${block.end_time}`}
                          </div>
                          <div className="mt-0.5 pl-1 text-[7px] font-bold opacity-80 truncate">
                            {blockProfessional?.name || "Todos os profissionais"}
                          </div>
                        </div>
                      );
                    })}

                    {ag.map((a, index) => {
                      const overlapCount = Math.max(1, ag.length);
                      const widthPercent = 100 / overlapCount;
                      const leftPercent = index * widthPercent;

                      return (
                      <div
                        key={a.id}
                        draggable={!isMobileAgenda}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          if (isMobileAgenda) return;
                          setDraggingId(a.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointmentDetails(a);
                        }}
                        className={`${
                          hasDebt(a.patient_id)
                            ? "ring-1 ring-amber-200"
                            : ""
                        } absolute top-0.5 z-[1] overflow-hidden text-white text-[9px] px-1.5 py-0.5 rounded-[8px] cursor-pointer border border-white/20 shadow-sm touch-manipulation active:scale-[0.99] md:text-[10px] md:px-2 md:py-1 md:rounded-[9px]`}
                        style={{
                          ...getAppointmentStyle(a),
                          height: `${getDurationHeight(a.duration || 30)}px`,
                          left: isMobileAgenda ? `calc(${leftPercent}% + 3px)` : `calc(${leftPercent}% + 5px)`,
                          width: isMobileAgenda ? `calc(${widthPercent}% - 6px)` : `calc(${widthPercent}% - 10px)`,
                        }}
                        title={isMobileAgenda ? "Toque para ver detalhes." : "Clique para ver detalhes. Arraste para remarcar. Use a barra inferior para alterar a duração."}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/30" />
                        <div className="flex items-start justify-between gap-1 pl-1">
                          <div className="min-w-0">
                            <div className="truncate pr-1 text-[10px] font-black leading-tight tracking-tight md:text-[12px]">
                              {a.patient_name || a.title}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-white/15 px-1 py-0.5 text-[6px] font-black leading-none text-white/90 md:px-1.5 md:text-[7px]">
                            {a.start_time}
                          </span>
                        </div>

                        {a.professional_id && (
                          <div className="mt-0.5 hidden items-center gap-1 truncate pl-1 pr-1 text-[7px] font-semibold leading-tight opacity-70 md:flex">
                            <span
                              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[6px] font-black text-white ring-0"
                              title={getProfessionalLabel(a.professional_id)}
                            >
                              {getProfessionalInitials(getProfessionalById(a.professional_id)?.name)}
                            </span>
                            <span className="truncate">
                              {getProfessionalLabel(a.professional_id)}
                            </span>
                          </div>
                        )}

                        <div className="mt-1 hidden items-center gap-0.5 flex-nowrap overflow-hidden pl-1 md:flex">
                          <span
                            className="shrink-0 rounded-md bg-white/85 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tight text-slate-700 whitespace-nowrap leading-none ring-1 ring-white/70"
                            title="Tipo do agendamento"
                          >
                            {appointmentTypeLabel(a)}
                          </span>

                          {a.type !== "compromisso" && (
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tight whitespace-nowrap leading-none ${statusBadgeClass(
                                a.status
                              )}`}
                            >
                              {statusLabel(a.status)}
                            </span>
                          )}

                          {a.reminder_enabled && !a.reminder_sent_at && (
                            <span
                              className="shrink-0 rounded-md bg-yellow-50 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tight text-yellow-700 whitespace-nowrap leading-none ring-1 ring-yellow-200/70"
                              title={`Lembrete pendente: ${a.reminder_before_hours || 24}h antes`}
                            >
                              Lemb.
                            </span>
                          )}

                          {a.reminder_sent_at && (
                            <span
                              className="shrink-0 rounded-md bg-green-50 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tight text-green-700 whitespace-nowrap leading-none ring-1 ring-green-200/70"
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
                              className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[6px] font-black text-amber-700 whitespace-nowrap leading-none ring-1 ring-amber-200/70 hover:bg-amber-100"
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
                          className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize rounded-b-md bg-black/5 hover:bg-white/20"
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
                  className="pointer-events-none absolute left-[70px] right-0 z-[9999] border-t-2 border-[#239d9a]"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <span className="absolute -top-3 left-2 rounded-full bg-[#239d9a] px-2 py-0.5 text-[9px] font-black text-white">
                    agora {pad(now.getHours())}:{pad(now.getMinutes())}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedBlockDetails && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-[520px] rounded-[18px] overflow-hidden bg-white shadow-xl border border-[#c2dddd]">
            <div
              className="p-5 text-white"
              style={{ backgroundColor: selectedBlockDetails.color || getBlockColor(selectedBlockDetails.block_type) }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black leading-tight">
                    {selectedBlockDetails.title || getDefaultBlockTitle(selectedBlockDetails.block_type)}
                  </h2>
                  <p className="mt-1 text-sm opacity-95">
                    {formatDateBr(selectedBlockDetails.date)} • {selectedBlockDetails.all_day ? "Dia inteiro" : `${selectedBlockDetails.start_time} - ${selectedBlockDetails.end_time}`}
                  </p>
                  <p className="mt-1 text-sm font-bold opacity-95">
                    Profissional: {getProfessionalLabel(selectedBlockDetails.professional_id) || "Todos os profissionais"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBlockDetails(null)}
                  className="w-9 h-9 rounded-full bg-black/10 hover:bg-white/30 text-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {selectedBlockDetails.description && (
                <div className="rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedBlockDetails.description}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => editScheduleBlock(selectedBlockDetails)}
                  className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
                >
                  Editar bloqueio
                </button>

                <button
                  type="button"
                  onClick={() => deleteScheduleBlock(selectedBlockDetails.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                >
                  Remover bloqueio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAppointmentDetails && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-[560px] rounded-[18px] overflow-hidden bg-white shadow-xl border border-[#c2dddd]">
            <div
              className={`${!selectedAppointmentDetails.professional_id ? getColor(selectedAppointmentDetails) : ""} text-white p-5 shadow-inner`}
              style={getAppointmentStyle(selectedAppointmentDetails)}
            >
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
                      className="mt-3 inline-flex items-center rounded-full bg-black/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-white hover:bg-white/30"
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
                  className="w-9 h-9 rounded-full bg-black/10 hover:bg-white/30 text-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {selectedAppointmentDetails.type !== "compromisso" && (
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                    className="w-full rounded-xl border border-[#d4e8e8] bg-white p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#239d9a] focus:ring-2 focus:ring-[#239d9a]/10"
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
                    className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
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
                  className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
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

      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[24px] border border-[#d4e8e8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e0eeee] bg-gradient-to-r from-white to-[#f3fbfb] px-5 py-4">
              <h2 className="text-lg font-black tracking-tight text-slate-800">
                {blockForm.id ? "Editar bloqueio" : "Bloquear horário"}
              </h2>

              <button
                onClick={() => setShowBlockModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4e8e8] bg-white text-slate-500 transition hover:bg-[#f4fbfb]"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfefe] p-5">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Tipo de bloqueio
                </label>
                <select
                  value={blockForm.block_type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setBlockForm((prev) => ({
                      ...prev,
                      block_type: nextType,
                      title: prev.title && prev.title !== getDefaultBlockTitle(prev.block_type)
                        ? prev.title
                        : getDefaultBlockTitle(nextType),
                    }));
                  }}
                  className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                >
                  <option value="bloqueio">Bloqueio</option>
                  <option value="almoco">Almoço</option>
                  <option value="ferias">Férias</option>
                  <option value="reuniao">Reunião</option>
                  <option value="curso">Curso/Congresso</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="manutencao">Manutenção</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Título
                </label>
                <input
                  value={blockForm.title}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex.: Almoço, Férias, Reunião"
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Profissional
                </label>
                <select
                  value={blockForm.professional_id}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, professional_id: e.target.value }))}
                  className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                >
                  <option value="">Todos os profissionais</option>
                  {activeProfessionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                      {professional.specialty ? ` • ${professional.specialty}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Data
                </label>
                <input
                  type="date"
                  value={blockForm.date}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={blockForm.all_day}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, all_day: e.target.checked }))}
                />
                Bloquear o dia inteiro
              </label>

              {!blockForm.all_day && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Início
                    </label>
                    <input
                      type="time"
                      value={blockForm.start_time}
                      onChange={(e) => setBlockForm((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                        end_time: timeToMinutes(prev.end_time) <= timeToMinutes(e.target.value)
                          ? addMinutesToTime(e.target.value, 60)
                          : prev.end_time,
                      }))}
                      className="w-full border border-[#c2dddd] p-3 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Fim
                    </label>
                    <input
                      type="time"
                      value={blockForm.end_time}
                      onChange={(e) => setBlockForm((prev) => ({ ...prev, end_time: e.target.value }))}
                      className="w-full border border-[#c2dddd] p-3 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Observação
                </label>
                <textarea
                  value={blockForm.description}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Observação interna opcional"
                  className="min-h-[100px] w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>

              <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-3 text-xs text-slate-600">
                Este bloqueio impede novos agendamentos no período selecionado.
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#c2dddd] p-4 flex justify-between gap-2 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <div>
                {blockForm.id && (
                  <button
                    type="button"
                    onClick={() => deleteScheduleBlock(blockForm.id)}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-black text-red-700 hover:bg-red-100"
                  >
                    Remover
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#c2dddd] bg-white hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveScheduleBlock}
                  className="bg-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-slate-800"
                >
                  Salvar bloqueio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[24px] border border-[#d4e8e8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e0eeee] bg-gradient-to-r from-white to-[#f3fbfb] px-5 py-4">
              <h2 className="text-lg font-black tracking-tight text-slate-800">
                {editingId ? "Editar agendamento" : "Novo agendamento"}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4e8e8] bg-white text-slate-500 transition hover:bg-[#f4fbfb]"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfefe] p-5">
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
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                      className="p-3 hover:bg-[#fbffff] cursor-pointer"
                    >
                      {p.name}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
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
                className="rounded-xl bg-[#239d9a] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1f8c89]"
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
