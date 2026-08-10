import type { Dispatch, SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateBr, normalizePhone } from "@/lib/agenda/agendaUtils";

type MessageTemplate = {
  type?: string | null;
  content?: string | null;
};

type UseAgendaReminderActionsParams = {
  getPatientByAppointment: (appointment: any) => any;
  messageTemplates: MessageTemplate[];
  getPatientDebt: (patientId?: string | null) => number;
  formatCurrency: (value: number) => string;
  loadData: () => Promise<unknown>;
  setSelectedAppointmentDetails: Dispatch<SetStateAction<any | null>>;
};

export function useAgendaReminderActions({
  getPatientByAppointment,
  messageTemplates,
  getPatientDebt,
  formatCurrency,
  loadData,
  setSelectedAppointmentDetails,
}: UseAgendaReminderActionsParams) {
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
    const sentAt = new Date().toISOString();
    const { error } = await supabase
      .from("appointments")
      .update({ reminder_sent_at: sentAt })
      .eq("id", appointmentId);

    if (error) {
      alert("Erro ao marcar lembrete como enviado: " + error.message);
      return;
    }

    setSelectedAppointmentDetails((prev: any) =>
      prev && prev.id === appointmentId
        ? { ...prev, reminder_sent_at: sentAt }
        : prev
    );

    await loadData();
  };

  return {
    buildWhatsappHref,
    hasReminderPhone,
    markReminderAsSent,
  };
}
