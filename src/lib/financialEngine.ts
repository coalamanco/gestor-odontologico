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
    description?: string | null;
  };
  
  export type FinancialVisualStatus =
    | "pago"
    | "parcial"
    | "pendente"
    | "em_atraso"
    | "cancelado";
  
  export type FinancialRecordAnalysis = {
    total: number;
    paid: number;
    balance: number;
    overdueBalance: number;
    dueTodayBalance: number;
    futureBalance: number;
    dueDate: string | null;
    visualStatus: FinancialVisualStatus;
    overdue: boolean;
    daysOverdue: number;
    isPaid: boolean;
    isCanceled: boolean;
    isGroupedInstallmentPlan: boolean;
  };
  
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
  
  function addMonths(date: Date, months: number) {
    const copy = new Date(date);
    copy.setMonth(copy.getMonth() + months);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  
  function roundedMoney(value: number) {
    return Math.max(0, Number(value.toFixed(2)));
  }
  
  function looksLikeIndividualInstallmentRecord(record: FinancialEngineRecord) {
    const installments = Math.max(1, Number(record.installments || 1));
    if (installments <= 1) return true;
  
    const description = String(record.description || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  
    // Quando o sistema já criou uma linha por parcela, a descrição normalmente traz
    // "Parcela 1/10". Nesse caso, a linha inteira vence na data daquela parcela.
    if (/parcela\s*\d+\s*\/\s*\d+/.test(description)) return true;
  
    // Parcelas 2, 3, 4... quase sempre representam linhas individuais.
    const installmentNumber = Number(record.installment_number || 0);
    if (installmentNumber > 1) return true;
  
    return false;
  }
  
  function getGroupedInstallmentSchedule(record: FinancialEngineRecord) {
    const total = getFinancialRecordTotal(record);
    const paid = getFinancialRecordPaid(record);
    const balance = getFinancialRecordBalance(record);
    const installments = Math.max(1, Number(record.installments || 1));
    const firstDueDate = getFinancialDateStart(getFinancialRecordDueDate(record));
    const today = getBrazilTodayStart();
  
    if (!firstDueDate || installments <= 1 || balance <= 0) {
      return null;
    }
  
    const baseInstallmentValue = Number((total / installments).toFixed(2));
    const dueInstallments = Array.from({ length: installments }).filter((_, index) => {
      const dueDate = addMonths(firstDueDate, index);
      return dueDate < today;
    }).length;
  
    const dueTodayInstallments = Array.from({ length: installments }).filter((_, index) => {
      const dueDate = addMonths(firstDueDate, index);
      return dueDate.getTime() === today.getTime();
    }).length;
  
    let scheduledOverdueTotal = 0;
    let scheduledDueTodayTotal = 0;
  
    for (let index = 0; index < installments; index += 1) {
      const isLast = index === installments - 1;
      const installmentValue = isLast
        ? Number((total - baseInstallmentValue * (installments - 1)).toFixed(2))
        : baseInstallmentValue;
  
      const dueDate = addMonths(firstDueDate, index);
  
      if (dueDate < today) scheduledOverdueTotal += installmentValue;
      if (dueDate.getTime() === today.getTime()) scheduledDueTodayTotal += installmentValue;
    }
  
    const overdueBalance = roundedMoney(Math.min(balance, scheduledOverdueTotal - paid));
    const paidAfterOverdue = Math.max(0, paid - scheduledOverdueTotal);
    const dueTodayBalance = roundedMoney(
      Math.min(Math.max(0, balance - overdueBalance), scheduledDueTodayTotal - paidAfterOverdue),
    );
    const futureBalance = roundedMoney(balance - overdueBalance - dueTodayBalance);
  
    return {
      overdueBalance,
      dueTodayBalance,
      futureBalance,
      dueInstallments,
      dueTodayInstallments,
    };
  }
  
  export function getFinancialRecordOverdueBalance(record: FinancialEngineRecord) {
    if (isFinancialCanceledStatus(record.status)) return 0;
    if (isFinancialPaidStatus(record.status) && getFinancialRecordBalance(record) <= 0) return 0;
  
    const balance = getFinancialRecordBalance(record);
    if (balance <= 0) return 0;
  
    const installments = Math.max(1, Number(record.installments || 1));
    if (installments > 1 && !looksLikeIndividualInstallmentRecord(record)) {
      return getGroupedInstallmentSchedule(record)?.overdueBalance || 0;
    }
  
    const dueDate = getFinancialDateStart(getFinancialRecordDueDate(record));
    if (!dueDate) return 0;
  
    return dueDate < getBrazilTodayStart() ? balance : 0;
  }
  
  export function getFinancialRecordDueTodayBalance(record: FinancialEngineRecord) {
    if (isFinancialCanceledStatus(record.status)) return 0;
  
    const balance = getFinancialRecordBalance(record);
    if (balance <= 0) return 0;
  
    const installments = Math.max(1, Number(record.installments || 1));
    if (installments > 1 && !looksLikeIndividualInstallmentRecord(record)) {
      return getGroupedInstallmentSchedule(record)?.dueTodayBalance || 0;
    }
  
    const dueDate = getFinancialDateStart(getFinancialRecordDueDate(record));
    if (!dueDate) return 0;
  
    return dueDate.getTime() === getBrazilTodayStart().getTime() ? balance : 0;
  }
  
  export function getFinancialRecordFutureBalance(record: FinancialEngineRecord) {
    if (isFinancialCanceledStatus(record.status)) return 0;
  
    const balance = getFinancialRecordBalance(record);
    if (balance <= 0) return 0;
  
    const installments = Math.max(1, Number(record.installments || 1));
    if (installments > 1 && !looksLikeIndividualInstallmentRecord(record)) {
      return getGroupedInstallmentSchedule(record)?.futureBalance || 0;
    }
  
    const dueDate = getFinancialDateStart(getFinancialRecordDueDate(record));
    if (!dueDate) return balance;
  
    return dueDate > getBrazilTodayStart() ? balance : 0;
  }
  
  export function isFinancialRecordPaid(record: FinancialEngineRecord) {
    return getFinancialRecordBalance(record) <= 0 || isFinancialPaidStatus(record.status);
  }
  
  export function isFinancialRecordOverdue(record: FinancialEngineRecord) {
    return getFinancialRecordOverdueBalance(record) > 0;
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
    if (getFinancialRecordBalance(record) <= 0 || isFinancialPaidStatus(record.status)) return "pago";
    if (getFinancialRecordOverdueBalance(record) > 0) return "em_atraso";
    if (
      getFinancialRecordPaid(record) > 0 ||
      normalizeFinancialStatus(record.status) === "parcial"
    ) {
      return "parcial";
    }
  
    return "pendente";
  }
  
  export function getFinancialRecordAnalysis(record: FinancialEngineRecord): FinancialRecordAnalysis {
    const total = getFinancialRecordTotal(record);
    const paid = getFinancialRecordPaid(record);
    const balance = getFinancialRecordBalance(record);
    const overdueBalance = getFinancialRecordOverdueBalance(record);
    const dueTodayBalance = getFinancialRecordDueTodayBalance(record);
    const futureBalance = getFinancialRecordFutureBalance(record);
    const dueDate = getFinancialRecordDueDate(record);
    const visualStatus = getFinancialRecordVisualStatus(record);
    const overdue = overdueBalance > 0;
    const daysOverdue = overdue ? getFinancialRecordDaysOverdue(record) : 0;
  
    return {
      total,
      paid,
      balance,
      overdueBalance,
      dueTodayBalance,
      futureBalance,
      dueDate,
      visualStatus,
      overdue,
      daysOverdue,
      isPaid: visualStatus === "pago",
      isCanceled: visualStatus === "cancelado",
      isGroupedInstallmentPlan:
        Math.max(1, Number(record.installments || 1)) > 1 &&
        !looksLikeIndividualInstallmentRecord(record),
    };
  }
  
  export function getFinancialRecordsSummary(records: FinancialEngineRecord[]) {
    return records.reduce(
      (summary, record) => {
        const analysis = getFinancialRecordAnalysis(record);
  
        summary.total += analysis.total;
        summary.paid += analysis.paid;
        summary.balance += analysis.balance;
        summary.overdueBalance += analysis.overdueBalance;
        summary.dueTodayBalance += analysis.dueTodayBalance;
        summary.futureBalance += analysis.futureBalance;
  
        if (analysis.overdue) summary.overdueRecords += 1;
        if (analysis.balance > 0) summary.openRecords += 1;
  
        return summary;
      },
      {
        total: 0,
        paid: 0,
        balance: 0,
        overdueBalance: 0,
        dueTodayBalance: 0,
        futureBalance: 0,
        overdueRecords: 0,
        openRecords: 0,
      },
    );
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
  