"use client";

import { CalendarCheck } from "lucide-react";

type DashboardAgendaAppointment = {
  id: string;
  patient_name?: string | null;
  title?: string | null;
  start_time?: string | null;
  status?: string | null;
};

type DashboardAgendaHojeProps = {
  appointments: DashboardAgendaAppointment[];
};

function normalizeStatus(status?: string | null) {
  return String(status || "agendado").trim().toLowerCase();
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "confirmado") return "Confirmado";
  if (normalized === "finalizado") return "Finalizado";
  if (normalized === "faltou") return "Faltou";
  if (normalized === "cancelado" || normalized === "cancelada") return "Cancelado";
  if (normalized === "em atendimento" || normalized === "em_atendimento") {
    return "Em atendimento";
  }

  return "Agendado";
}

function getStatusClass(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "confirmado") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (normalized === "finalizado") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (normalized === "faltou" || normalized === "cancelado" || normalized === "cancelada") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (normalized === "em atendimento" || normalized === "em_atendimento") {
    return "bg-purple-50 text-purple-700 ring-purple-100";
  }

  return "bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary-dark)] ring-[var(--clinic-border)]";
}

export default function DashboardAgendaHoje({
  appointments,
}: DashboardAgendaHojeProps) {
  return (
    <section className="premium-card-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--clinic-border)] px-5 py-4">
        <div>
          <h2 className="text-[21px] font-black tracking-[-0.03em] text-[var(--clinic-text)]">
            Agenda de hoje
          </h2>

          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clinic-muted)]">
            Próximas consultas
          </p>
        </div>

        <div className="premium-dashboard-icon h-11 w-11 rounded-[16px]">
          <CalendarCheck size={20} />
        </div>
      </div>

      <div className="space-y-3 p-5">
        {appointments.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-[var(--clinic-border)] bg-[var(--clinic-surface-soft)] p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary)]">
              <CalendarCheck size={22} />
            </div>

            <p className="text-sm font-bold text-[var(--clinic-muted)]">
              Nenhuma consulta para hoje.
            </p>
          </div>
        )}

        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-[22px] border border-[var(--clinic-border)] bg-white p-4 shadow-[var(--premium-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-black text-[var(--clinic-text)]">
                  {appointment.patient_name || appointment.title || "Paciente"}
                </div>

                <div className="mt-1 text-[12px] font-semibold text-[var(--clinic-muted)]">
                  {appointment.start_time || "--:--"} •{" "}
                  {appointment.title || "Consulta"}
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ${getStatusClass(
                  appointment.status,
                )}`}
              >
                {getStatusLabel(appointment.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
