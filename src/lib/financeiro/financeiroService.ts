import { supabaseNoSchemaCache } from "@/lib/supabase";
import {
  getFinancialRecordAnalysis,
  reconcileFinancialRecordsWithTransactions,
} from "@/lib/financialEngine";

export type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  patient_treatment_id?: string | null;
  budget_id?: string | null;
  description?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  paid_at?: string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  installment_number?: number | null;
  installments?: number | null;
};

export type PaymentTransaction = {
  id: string;
  financial_record_id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  note?: string | null;
  received_at?: string | null;
  created_at?: string | null;
};

export type Expense = {
  id: string;
  description?: string | null;
  category?: string | null;
  amount?: number | string | null;
  payment_date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type PatientOption = {
  id: string;
  name: string;
};

export type PatientFinancialBalance = {
  patient_id: string;
  name: string;
  total: number;
  paid: number;
  balance: number;
  overdueBalance: number;
  dueTodayBalance: number;
  futureBalance: number;
};

export type FinancialPageData = {
  patients: PatientOption[];
  records: FinancialRecord[];
  payments: PaymentTransaction[];
  expenses: Expense[];
  patientBalances: PatientFinancialBalance[];
};

function buildPatientBalances(
  patients: PatientOption[],
  records: FinancialRecord[],
): PatientFinancialBalance[] {
  const patientNameMap = new Map(patients.map((patient) => [patient.id, patient.name]));
  const grouped = new Map<string, Omit<PatientFinancialBalance, "patient_id" | "name">>();

  for (const record of records) {
    const patientId = String(record.patient_id ?? "");
    if (!patientId) continue;

    const analysis = getFinancialRecordAnalysis(record);
    const current = grouped.get(patientId) ?? {
      total: 0,
      paid: 0,
      balance: 0,
      overdueBalance: 0,
      dueTodayBalance: 0,
      futureBalance: 0,
    };

    current.total += analysis.total;
    current.paid += analysis.paid;
    current.balance += analysis.balance;
    current.overdueBalance += analysis.overdueBalance;
    current.dueTodayBalance += analysis.dueTodayBalance;
    current.futureBalance += analysis.futureBalance;
    grouped.set(patientId, current);
  }

  return Array.from(grouped.entries())
    .map(([patient_id, values]) => ({
      patient_id,
      name: patientNameMap.get(patient_id) ?? patient_id,
      total: Number(values.total.toFixed(2)),
      paid: Number(values.paid.toFixed(2)),
      balance: Number(values.balance.toFixed(2)),
      overdueBalance: Number(values.overdueBalance.toFixed(2)),
      dueTodayBalance: Number(values.dueTodayBalance.toFixed(2)),
      futureBalance: Number(values.futureBalance.toFixed(2)),
    }))
    .sort(
      (a, b) =>
        b.overdueBalance - a.overdueBalance ||
        b.balance - a.balance ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}

export async function loadFinancialPageData(): Promise<FinancialPageData> {
  const [patientsResult, recordsResult, paymentsResult, expensesResult] = await Promise.all([
    supabaseNoSchemaCache.from("patients").select("id, name").order("name", { ascending: true }),
    supabaseNoSchemaCache
      .from("financial_records")
      .select("*")
      .order("created_at", { ascending: false })
      .order("installment_number", { ascending: true }),
    supabaseNoSchemaCache
      .from("payment_transactions")
      .select("*")
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabaseNoSchemaCache.from("expenses").select("*").order("created_at", { ascending: false }),
  ]);

  if (patientsResult.error) {
    throw new Error(`Erro ao carregar pacientes: ${patientsResult.error.message}`);
  }
  if (recordsResult.error) {
    throw new Error(`Erro ao carregar financeiro: ${recordsResult.error.message}`);
  }
  if (paymentsResult.error) {
    throw new Error(`Erro ao carregar pagamentos: ${paymentsResult.error.message}`);
  }

  const patients = (patientsResult.data || []) as PatientOption[];
  const payments = (paymentsResult.data || []) as PaymentTransaction[];
  const records = reconcileFinancialRecordsWithTransactions(
    (recordsResult.data || []) as FinancialRecord[],
    payments,
  );

  // Despesas não devem impedir o carregamento do restante do financeiro.
  const expenses = expensesResult.error ? [] : ((expensesResult.data || []) as Expense[]);
  if (expensesResult.error) {
    console.warn("Erro ao carregar despesas:", expensesResult.error.message);
  }

  return {
    patients,
    records,
    payments,
    expenses,
    patientBalances: buildPatientBalances(patients, records),
  };
}
