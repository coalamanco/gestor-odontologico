import { SLOT_HEIGHT } from "@/lib/agenda/agendaUtils";

type AgendaDisplayHelpersParams = {
  financialRecords: any[];
  patients: any[];
  professionals: any[];
  router: { push: (href: string) => void };
  loadData: () => Promise<any>;
};

export function createAgendaDisplayHelpers({
  financialRecords,
  patients,
  professionals,
  router,
  loadData,
}: AgendaDisplayHelpersParams) {
  const getPatientDebt = (patientId?: string | null) => {
    if (!patientId) return 0;
    return financialRecords
      .filter((record: any) => record.patient_id === patientId)
      .reduce((acc: number, record: any) => {
        const amount = Number(record.amount || 0);
        const paid = Number(record.paid_amount || 0);
        return acc + Math.max(0, amount - paid);
      }, 0);
  };

  const hasDebt = (patientId?: string | null) => getPatientDebt(patientId) > 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const openPatientFinance = (patientId?: string | null) => {
    if (!patientId) return;
    try {
      window.localStorage.setItem("patientActiveTab", "financeiro");
    } catch {
      // localStorage pode estar indisponível em alguns ambientes
    }
    router.push(`/pacientes/${patientId}`);
  };

  const refreshFinancialData = async () => {
    try {
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar dados financeiros da agenda:", error);
    }
  };

  const getColor = (appointment: any) => {
    if (appointment.type === "compromisso") return "bg-slate-400";
    const status = String(appointment.status || "agendado");
    if (status === "confirmado") return "bg-emerald-500";
    if (status === "em_atendimento") return "bg-blue-600";
    if (status === "finalizado") return "bg-slate-600";
    if (status === "faltou") return "bg-red-600";
    if (status === "cancelado") return "bg-slate-400";
    const motivo = (appointment.title || "").toLowerCase();
    if (motivo === "retorno") return "bg-emerald-500";
    if (motivo === "tratamento") return "bg-teal-500";
    return "bg-cyan-500";
  };

  const statusLabel = (status?: string | null) => {
    if (status === "confirmado") return "Confirmado";
    if (status === "em_atendimento") return "Em atendimento";
    if (status === "finalizado") return "Finalizado";
    if (status === "faltou") return "Faltou";
    if (status === "cancelado") return "Cancelado";
    return "Agendado";
  };

  const statusBadgeClass = (status?: string | null) => {
    if (status === "confirmado") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70";
    if (status === "em_atendimento") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200/70";
    if (status === "finalizado") return "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70";
    if (status === "faltou") return "bg-red-50 text-red-700 ring-1 ring-red-200/70";
    if (status === "cancelado") return "bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200/70";
    return "bg-white/80 text-slate-600 ring-1 ring-white/70";
  };

  const appointmentTypeLabel = (appointment: any) => {
    if (appointment?.type === "compromisso") return "Compromisso";
    const raw = String(appointment?.title || "consulta").toLowerCase();
    if (raw === "retorno") return "Retorno";
    if (raw === "tratamento") return "Tratamento";
    return "Consulta";
  };

  const slotDividerClass = (timeValue: string) => {
    const minute = Number(String(timeValue || "").split(":")[1] || 0);
    if (minute === 0) return "border-b border-[#c4dddd] bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]";
    if (minute === 30) return "border-b border-[#d7eaea] bg-white";
    return "border-b border-[#edf5f5] bg-white";
  };

  const timeColumnClass = (timeValue: string) => {
    const minute = Number(String(timeValue || "").split(":")[1] || 0);
    if (minute === 0) return "bg-[#f5ffff] text-slate-600 font-semibold";
    if (minute === 30) return "bg-[#fbffff] text-slate-500 font-extrabold";
    return "bg-[#fbffff] text-slate-400 font-bold";
  };

  const getDurationHeight = (mins: number) => {
    const slots = Math.max(1, Math.ceil((Number(mins) || 30) / 15));
    return slots * SLOT_HEIGHT - 6;
  };

  const getPatientByAppointment = (appointment: any) => {
    if (!appointment?.patient_id) return null;
    return patients.find((patient) => patient.id === appointment.patient_id) || null;
  };

  const getAppointmentPatientName = (appointment: any) => {
    if (!appointment) return "";
    const patient = getPatientByAppointment(appointment);
    return patient?.name || appointment?.patient_name || appointment?.title || "Paciente";
  };

  const getProfessionalById = (professionalId?: string | null) => {
    if (!professionalId) return null;
    return professionals.find((professional) => professional.id === professionalId) || null;
  };

  const getProfessionalLabel = (professionalId?: string | null) => {
    const professional = getProfessionalById(professionalId);
    if (!professional) return "";
    const specialty = professional.specialty ? ` • ${professional.specialty}` : "";
    return `${professional.name}${specialty}`;
  };

  const activeProfessionals = professionals.filter(
    (professional) => professional.active !== false
  );

  return {
    getPatientDebt,
    hasDebt,
    formatCurrency,
    openPatientFinance,
    refreshFinancialData,
    getColor,
    statusLabel,
    statusBadgeClass,
    appointmentTypeLabel,
    slotDividerClass,
    timeColumnClass,
    getDurationHeight,
    getPatientByAppointment,
    getAppointmentPatientName,
    getProfessionalById,
    getProfessionalLabel,
    activeProfessionals,
  };
}
