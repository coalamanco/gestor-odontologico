"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadAgendaPageData,
  type AgendaClinicSettings,
} from "@/lib/agenda/agendaService";
import { END_HOUR, START_HOUR } from "@/lib/agenda/agendaUtils";

const DEFAULT_CLINIC_SETTINGS: AgendaClinicSettings = {
  start_hour: START_HOUR,
  end_hour: END_HOUR,
  max_patients_day: 15,
};

export function useAgendaData() {
  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [financialRecords, setFinancialRecords] = useState<any[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<AgendaClinicSettings>(
    DEFAULT_CLINIC_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await loadAgendaPageData();

      setPatients(data.patients);
      setProfessionals(data.professionals);
      setAppointments(data.appointments);
      setScheduleBlocks(data.scheduleBlocks);
      setFinancialRecords(data.financialRecords);
      setMessageTemplates(data.messageTemplates);
      setClinicSettings(data.clinicSettings);
    } catch (loadError) {
      console.error("Erro ao carregar dados da agenda:", loadError);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    patients,
    setPatients,
    professionals,
    setProfessionals,
    appointments,
    setAppointments,
    scheduleBlocks,
    setScheduleBlocks,
    financialRecords,
    setFinancialRecords,
    messageTemplates,
    setMessageTemplates,
    clinicSettings,
    setClinicSettings,
    loading,
    error,
    loadData,
  };
}
