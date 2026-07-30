export type MainType = "consulta" | "compromisso";
export type ConsultaMotivo = "consulta" | "retorno" | "tratamento";
export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "finalizado"
  | "faltou"
  | "cancelado";

export const SLOT_HEIGHT = 28;
export const START_HOUR = 8;
export const END_HOUR = 20;

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

export function formatDateBr(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

export function isTodayDate(dateString: string) {
  return dateString === formatDate(new Date());
}

export function getWeekdayLabel(date: Date) {
  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return labels[date.getDay()] || "DIA";
}


export type HolidayInfo = {
  name: string;
  scope: "nacional" | "municipal";
};

export function getEasterDate(year: number) {
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

export function addHoliday(holidays: Record<string, HolidayInfo>, date: Date, info: HolidayInfo) {
  holidays[formatDate(date)] = info;
}

export function getHolidayMap(year: number) {
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

export function getHolidayInfo(dateString: string) {
  if (!dateString) return null;
  const year = Number(dateString.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return getHolidayMap(year)[dateString] || null;
}

export function normalizePhone(value?: string | null) {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

export function parseHourValue(value: any, fallback: number) {
  const raw = String(value ?? "").trim();

  if (!raw) return fallback;

  const hour = Number(raw.includes(":") ? raw.split(":")[0] : raw);

  if (!Number.isFinite(hour)) return fallback;
  return Math.min(23, Math.max(0, hour));
}

export function parsePositiveNumber(value: any, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const PROFESSIONAL_COLORS = [
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

export function getStableColorIndex(value?: string | null) {
  if (!value) return 0;

  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash % PROFESSIONAL_COLORS.length;
}

export function getProfessionalColor(professionalId?: string | null) {
  if (!professionalId) return "#239d9a";
  return PROFESSIONAL_COLORS[getStableColorIndex(professionalId)];
}

export function getProfessionalInitials(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "TP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}


export function addMinutesToTime(time: string, minutes: number) {
  const [hour, minute] = String(time || "08:00").split(":").map(Number);
  const date = new Date(2000, 0, 1, hour || 8, minute || 0, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function minutesBetweenTimes(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return 60;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60;
  return end - start;
}

export function getBlockTypeLabel(type?: string | null) {
  if (type === "almoco") return "Almoço";
  if (type === "ferias") return "Férias";
  if (type === "reuniao") return "Reunião";
  if (type === "curso") return "Curso/Congresso";
  if (type === "pessoal") return "Pessoal";
  if (type === "manutencao") return "Manutenção";
  return "Bloqueio";
}

export function getDefaultBlockTitle(type?: string | null) {
  const label = getBlockTypeLabel(type);
  return label === "Bloqueio" ? "Horário bloqueado" : label;
}

export function getBlockColor(type?: string | null) {
  if (type === "almoco") return "#78716c";
  if (type === "ferias") return "#475569";
  if (type === "reuniao") return "#4b5563";
  if (type === "curso") return "#6d28d9";
  if (type === "pessoal") return "#9f1239";
  if (type === "manutencao") return "#92400e";
  return "#6b7280";
}

export function getFallbackAppointmentColor(status?: string | null, type?: string | null, title?: string | null) {
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
