"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/agenda/agendaUtils";

type QuickPatientForm = {
  name: string;
  phone: string;
  cpf: string;
  email: string;
};

type UseAgendaQuickPatientParams = {
  search: string;
  setSearch: (value: string) => void;
  setPatients: Dispatch<SetStateAction<any[]>>;
  setSelectedPatient: (patient: any) => void;
};

const EMPTY_FORM: QuickPatientForm = {
  name: "",
  phone: "",
  cpf: "",
  email: "",
};

export function useAgendaQuickPatient({
  search,
  setSearch,
  setPatients,
  setSelectedPatient,
}: UseAgendaQuickPatientParams) {
  const [showQuickPatientForm, setShowQuickPatientForm] = useState(false);
  const [savingQuickPatient, setSavingQuickPatient] = useState(false);
  const [quickPatientForm, setQuickPatientForm] = useState<QuickPatientForm>(EMPTY_FORM);

  const updateQuickPatientField = (field: string, value: string) => {
    setQuickPatientForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openQuickPatientForm = () => {
    setShowQuickPatientForm(true);
    setQuickPatientForm((current) => ({
      ...current,
      name: current.name || search,
    }));
  };

  const closeQuickPatientForm = () => {
    if (savingQuickPatient) return;
    setShowQuickPatientForm(false);
  };

  const resetQuickPatientForm = () => {
    setShowQuickPatientForm(false);
    setQuickPatientForm(EMPTY_FORM);
  };

  const saveQuickPatient = async () => {
    const name = quickPatientForm.name.trim();

    if (!name) {
      alert("Informe o nome do paciente.");
      return;
    }

    try {
      setSavingQuickPatient(true);

      const payload = {
        name,
        phone: normalizePhone(quickPatientForm.phone) || null,
        cpf: String(quickPatientForm.cpf || "").replace(/\D/g, "") || null,
        email: quickPatientForm.email.trim() || null,
      };

      const { data, error } = await supabase
        .from("patients")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        alert("Erro ao cadastrar paciente: " + error.message);
        return;
      }

      if (data) {
        setPatients((current) =>
          [...current, data].sort((a, b) =>
            String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR")
          )
        );
        setSelectedPatient(data);
        setSearch(data.name || name);
      }

      resetQuickPatientForm();
    } catch (error: any) {
      alert(
        "Erro inesperado ao cadastrar paciente: " +
          (error?.message || "erro desconhecido")
      );
    } finally {
      setSavingQuickPatient(false);
    }
  };

  return {
    showQuickPatientForm,
    savingQuickPatient,
    quickPatientForm,
    setQuickPatientForm,
    setShowQuickPatientForm,
    updateQuickPatientField,
    openQuickPatientForm,
    closeQuickPatientForm,
    saveQuickPatient,
    resetQuickPatientForm,
  };
}
