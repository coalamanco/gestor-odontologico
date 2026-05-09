export type FinancialEngineRecord = {
    id?: string | null;
    amount?: number | string | null;
    paid_amount?: number | string | null;
    status?: string | null;
    due_date?: string | null;
    created_at?: string | null;
    paid_at?: string | null;
    installment_number?: number | null;
    installments?: number | null;
  };
  
  export type FinancialVisualStatus =
    | "pago"
    | "parcial"
    | "pendente"
    | "em_atraso"
    | "cancelado";
  
  export function parseFinancialMoney(value: unknown) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  
    const raw = String(value).trim();
    if (!raw) return 0;
  
    const normalized = raw
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
  
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  
  export function normalizeFinancialStatus(status?: string | null) {
    return String(status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }
  
  export function isFinancialPaidStatus(status?: string | null) {
    const normalized = normalizeFinancialStatus(status);
  
    return [
      "paid",
      "pago",
      "paga",
      "recebido",
      "recebida",
      "quitado",
      "quitada",
    ].includes(normalized);
  }
  
  export function isFinancialCanceledStatus(status?: string | null) {
    const normalized = normalizeFinancialStatus(status);
  
    return [
      "cancelado",
      "cancelada",
      "cancelled",
      "canceled",
      "estornado",
      "estornada",
    ].includes(normalized);
  }
  
  export function getBrazilTodayStart() {
    const brazilNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );
  
    brazilNow.setHours(0, 0, 0, 0);
    return brazilNow;
  }
  
  export function getFinancialDateStart(dateString?: string | null) {
    if (!dateString) return null;
  
    const date = new Date(
      String(dateString).includes("T") ? dateString : `${dateString}T12:00:00`,
    );
  
    if (Number.isNaN(date.getTime())) return null;
  
    date.setHours(0, 0, 0, 0);
    return date;
  }
  
  export function getFinancialRecordDueDate(record: FinancialEngineRecord) {
    if (record.due_date) return String(record.due_date).slice(0, 10);
    if (!record.created_at) return null;
  
    const baseDate = getFinancialDateStart(record.created_at);
    if (!baseDate) return String(record.created_at).slice(0, 10);
  
    const installmentNumber = Math.max(1, Number(record.installment_number || 1));
    baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);
  
    return baseDate.toISOString().slice(0, 10);
  }
  
  export function getFinancialRecordTotal(record: FinancialEngineRecord) {
    return Math.max(0, parseFinancialMoney(record.amount));
  }
  
  export function getFinancialRecordPaid(record: FinancialEngineRecord) {
    return Math.max(0, parseFinancialMoney(record.paid_amount));
  }
  
  export function getFinancialRecordBalance(record: FinancialEngineRecord) {
    if (isFinancialCanceledStatus(record.status)) return 0;
  
    const total = getFinancialRecordTotal(record);
    const paid = getFinancialRecordPaid(record);
    const balance = total - paid;
  
    return balance <= 0.009 ? 0 : Number(balance.toFixed(2));
  }
  
  export function isFinancialRecordPaid(record: FinancialEngineRecord) {
    return getFinancialRecordBalance(record) <= 0 || isFinancialPaidStatus(record.status);
  }
  
  export function isFinancialRecordOverdue(record: FinancialEngineRecord) {
    if (isFinancialCanceledStatus(record.status)) return false;
    if (isFinancialRecordPaid(record)) return false;
  
    const dueDate = getFinancialDateStart(getFinancialRecordDueDate(record));
    if (!dueDate) return false;
  
    return dueDate < getBrazilTodayStart();
  }
  
  export function getFinancialRecordDaysOverdue(record: FinancialEngineRecord) {
    if (!isFinancialRecordOverdue(record)) return 0;
  
    const dueDate = getFinancialDateStart(getFinancialRecordDueDate(record));
    if (!dueDate) return 0;
  
    return Math.max(
      0,
      Math.floor(
        (getBrazilTodayStart().getTime() - dueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }
  
  export function getFinancialRecordVisualStatus(
    record: FinancialEngineRecord,
  ): FinancialVisualStatus {
    if (isFinancialCanceledStatus(record.status)) return "cancelado";
    if (isFinancialRecordPaid(record)) return "pago";
    if (isFinancialRecordOverdue(record)) return "em_atraso";
    if (
      getFinancialRecordPaid(record) > 0 ||
      normalizeFinancialStatus(record.status) === "parcial"
    ) {
      return "parcial";
    }
  
    return "pendente";
  }
  
  export function getFinancialRecordAnalysis(record: FinancialEngineRecord) {
    const total = getFinancialRecordTotal(record);
    const paid = getFinancialRecordPaid(record);
    const balance = getFinancialRecordBalance(record);
    const dueDate = getFinancialRecordDueDate(record);
    const visualStatus = getFinancialRecordVisualStatus(record);
    const overdue = visualStatus === "em_atraso";
    const daysOverdue = overdue ? getFinancialRecordDaysOverdue(record) : 0;
  
    return {
      total,
      paid,
      balance,
      dueDate,
      visualStatus,
      overdue,
      daysOverdue,
      isPaid: visualStatus === "pago",
      isCanceled: visualStatus === "cancelado",
    };
  }
  
  export function labelFinancialVisualStatus(status: FinancialVisualStatus | string) {
    if (status === "pago") return "Pago";
    if (status === "parcial") return "Parcial";
    if (status === "em_atraso") return "Em atraso";
    if (status === "cancelado") return "Cancelado";
    return "Pendente";
  }
  
  // Aliases em português para compatibilidade com versões anteriores do arquivo.
  export const obterSaldoRegistroFinanceiro = getFinancialRecordBalance;
  export const obterValorPagoRegistroFinanceiro = getFinancialRecordPaid;
  export const obterValorTotalRegistroFinanceiro = getFinancialRecordTotal;
  export const obterStatusVisualRegistroFinanceiro = getFinancialRecordVisualStatus;
  export const obterAnaliseRegistroFinanceiro = getFinancialRecordAnalysis;
  export const getFinancialRecordDaysAtrasado = getFinancialRecordDaysOverdue;
  