"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadFinancialPageData,
  type Expense,
  type FinancialRecord,
  type PatientFinancialBalance,
  type PatientOption,
  type PaymentTransaction,
} from "@/lib/financeiro/financeiroService";

type UseFinancialDataOptions = {
  onError?: (message: string) => void;
};

export function useFinancialData(options: UseFinancialDataOptions = {}) {
  const { onError } = options;

  const [registros, setRegistros] = useState<FinancialRecord[]>([]);
  const [pagamentos, setPagamentos] = useState<PaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [saldosPorPaciente, setSaldosPorPaciente] = useState<PatientFinancialBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const reloadAll = useCallback(async () => {
    setLoading(true);

    try {
      const data = await loadFinancialPageData();
      setPatients(data.patients);
      setRegistros(data.records);
      setPagamentos(data.payments);
      setExpenses(data.expenses);
      setSaldosPorPaciente(data.patientBalances);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar o financeiro.";

      if (onError) {
        onError(message);
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  return {
    registros,
    pagamentos,
    expenses,
    patients,
    saldosPorPaciente,
    loading,
    setLoading,
    reloadAll,
  };
}
