import type { Expense } from "@/lib/financeiro/financeiroService";

export type PeriodoFiltro =
  | "hoje"
  | "ontem"
  | "semana_atual"
  | "semana_passada"
  | "mes_atual"
  | "mes_passado"
  | "ultimos_30"
  | "proximos_30"
  | "custom";

export const periodoOptions: Array<{ value: PeriodoFiltro; label: string }> = [
  { value: "hoje", label: "de hoje" },
  { value: "ontem", label: "de ontem" },
  { value: "semana_atual", label: "dessa semana" },
  { value: "semana_passada", label: "da semana passada" },
  { value: "mes_atual", label: "desse mês" },
  { value: "mes_passado", label: "do mês passado" },
  { value: "ultimos_30", label: "dos últimos 30 dias" },
  { value: "proximos_30", label: "dos próximos 30 dias" },
  { value: "custom", label: "escolher período" },
];

export function parseMoney(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(",", ".")) || 0;
}

export function formatCurrency(value: unknown): string {
  return parseMoney(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function toDateOnly(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDate(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getStartOfWeek(date: Date): Date {
  const copy = toDateOnly(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function getPeriodoRange(
  periodo: PeriodoFiltro,
  dataInicio?: string,
  dataFim?: string,
): { start: Date; end: Date } {
  const now = new Date();

  if (periodo === "hoje") return { start: toDateOnly(now), end: endOfDate(now) };

  if (periodo === "ontem") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return { start: toDateOnly(yesterday), end: endOfDate(yesterday) };
  }

  if (periodo === "semana_atual") {
    const start = getStartOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end: endOfDate(end) };
  }

  if (periodo === "semana_passada") {
    const start = getStartOfWeek(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end: endOfDate(end) };
  }

  if (periodo === "mes_atual") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end: endOfDate(end) };
  }

  if (periodo === "mes_passado") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end: endOfDate(end) };
  }

  if (periodo === "ultimos_30") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { start: toDateOnly(start), end: endOfDate(now) };
  }

  if (periodo === "proximos_30") {
    const end = new Date(now);
    end.setDate(now.getDate() + 30);
    return { start: toDateOnly(now), end: endOfDate(end) };
  }

  return {
    start: dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date("1900-01-01T00:00:00"),
    end: dataFim ? new Date(`${dataFim}T23:59:59`) : new Date("2999-12-31T23:59:59"),
  };
}

export function isWithinPeriodo(
  dateString: string | null | undefined,
  periodo: PeriodoFiltro,
  dataInicio?: string,
  dataFim?: string,
): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  const { start, end } = getPeriodoRange(periodo, dataInicio, dataFim);
  return date >= start && date <= end;
}

export function isExpensePaid(expense: Expense): boolean {
  return String(expense.status || "").trim().toLowerCase() === "pago";
}

export function getExpenseDate(expense: Expense): string | null {
  return expense.payment_date || expense.created_at || null;
}

export function getPeriodoSelectionLabel(periodo: PeriodoFiltro): string {
  return periodoOptions.find((option) => option.value === periodo)?.label ?? "desse mês";
}

export function labelStatus(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pago" || normalized === "paid") return "Pago";
  if (normalized === "parcial") return "Parcial";
  if (normalized === "pendente" || normalized === "pending") return "Pendente";
  if (["cancelado", "cancelled", "canceled"].includes(normalized)) return "Cancelado";
  return normalized ? String(value) : "—";
}
