import { supabase } from "@/lib/supabase";
import {
  END_HOUR,
  START_HOUR,
  parseHourValue,
  parsePositiveNumber,
} from "@/lib/agenda/agendaUtils";

export type AgendaClinicSettings = {
  start_hour: number;
  end_hour: number;
  max_patients_day: number;
};

export type AgendaPageData = {
  patients: any[];
  professionals: any[];
  appointments: any[];
  scheduleBlocks: any[];
  financialRecords: any[];
  messageTemplates: any[];
  clinicSettings: AgendaClinicSettings;
};

const DEFAULT_CLINIC_SETTINGS: AgendaClinicSettings = {
  start_hour: START_HOUR,
  end_hour: END_HOUR,
  max_patients_day: 15,
};

export async function loadAgendaPageData(): Promise<AgendaPageData> {
  const [
    patientsResult,
    professionalsResult,
    appointmentsResult,
    blocksResult,
    financialRecordsResult,
    templatesResult,
    settingsResult,
  ] = await Promise.all([
    supabase.from("patients").select("*").order("name"),
    supabase
      .from("professionals")
      .select("id, name, cro, specialty, active")
      .order("name"),
    supabase
      .from("appointments")
      .select("*")
      .order("date")
      .order("start_time"),
    supabase
      .from("schedule_blocks")
      .select("*")
      .order("date")
      .order("start_time"),
    supabase.from("financial_records").select("*"),
    supabase
      .from("message_templates")
      .select("id, type, title, content, active")
      .eq("active", true),
    supabase
      .from("clinic_settings")
      .select("start_hour, end_hour, max_patients_day")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const results = [
    patientsResult,
    professionalsResult,
    appointmentsResult,
    blocksResult,
    financialRecordsResult,
    templatesResult,
    settingsResult,
  ];

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw firstError;
  }

  const rawSettings = settingsResult.data;
  const startHour = parseHourValue(rawSettings?.start_hour, START_HOUR);
  let endHour = parseHourValue(rawSettings?.end_hour, END_HOUR);

  if (endHour <= startHour) {
    endHour = END_HOUR;
  }

  return {
    patients: patientsResult.data ?? [],
    professionals: professionalsResult.data ?? [],
    appointments: appointmentsResult.data ?? [],
    scheduleBlocks: blocksResult.data ?? [],
    financialRecords: financialRecordsResult.data ?? [],
    messageTemplates: templatesResult.data ?? [],
    clinicSettings: rawSettings
      ? {
          start_hour: startHour,
          end_hour: endHour,
          max_patients_day: parsePositiveNumber(
            rawSettings.max_patients_day,
            DEFAULT_CLINIC_SETTINGS.max_patients_day
          ),
        }
      : DEFAULT_CLINIC_SETTINGS,
  };
}
