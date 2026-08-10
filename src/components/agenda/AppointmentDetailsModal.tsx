"use client";

import React from "react";
import type { AppointmentStatus } from "@/lib/agenda/agendaUtils";

type Props = {
  appointment: any | null;
  onClose: () => void;
  getColor: (appointment: any) => string;
  getAppointmentStyle: (appointment: any) => React.CSSProperties;
  getAppointmentPatientName: (appointment: any) => string;
  formatDateBr: (date: string) => string;
  getProfessionalLabel: (professionalId?: string | null) => string;
  hasDebt: (patientId?: string | null) => boolean;
  openPatientFinance: (patientId?: string | null) => void;
  formatCurrency: (value: number) => string;
  getPatientDebt: (patientId?: string | null) => number;
  updateAppointmentStatus: (appointmentId: string, nextStatus: AppointmentStatus) => void | Promise<void>;
  openPatientRecord: (patientId: string) => void;
  openSmartReschedule: (appointment: any) => void;
  onEdit: (appointment: any) => void;
  onDelete: (appointmentId: string) => void | Promise<void>;
  hasReminderPhone: (appointment: any) => boolean;
  buildWhatsappHref: (appointment: any, type?: string) => string;
  markReminderAsSent: (appointmentId: string) => void | Promise<void>;
};

export function AppointmentDetailsModal({
  appointment,
  onClose,
  getColor,
  getAppointmentStyle,
  getAppointmentPatientName,
  formatDateBr,
  getProfessionalLabel,
  hasDebt,
  openPatientFinance,
  formatCurrency,
  getPatientDebt,
  updateAppointmentStatus,
  openPatientRecord,
  openSmartReschedule,
  onEdit,
  onDelete,
  hasReminderPhone,
  buildWhatsappHref,
  markReminderAsSent,
}: Props) {
  if (!appointment) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-[560px] rounded-[18px] overflow-hidden bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] border border-[#c2dddd]">
        <div
          className={`${!appointment.professional_id ? getColor(appointment) : ""} text-white p-5 shadow-inner`}
          style={getAppointmentStyle(appointment)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold leading-tight">
                {getAppointmentPatientName(appointment)}
              </h2>

              <p className="mt-1 text-sm opacity-95">
                {formatDateBr(appointment.date)} • {appointment.start_time} • {appointment.duration || 30} min
              </p>

              <p className="mt-1 text-sm opacity-95">
                {appointment.type === "compromisso" ? "Compromisso" : appointment.title || "Consulta"}
              </p>

              {appointment.professional_id && (
                <p className="mt-1 text-sm font-bold opacity-95">
                  Profissional: {getProfessionalLabel(appointment.professional_id)}
                </p>
              )}

              {hasDebt(appointment.patient_id) && (
                <button
                  type="button"
                  onClick={() => openPatientFinance(appointment.patient_id)}
                  className="mt-3 inline-flex items-center rounded-full bg-black/10 px-3 py-1 text-[12px] font-medium uppercase tracking-widest text-white hover:bg-white/30"
                  title="Abrir financeiro do paciente"
                >
                  💰 Débito: {formatCurrency(getPatientDebt(appointment.patient_id))}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/10 hover:bg-white/30 text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {appointment.type !== "compromisso" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Status da consulta
              </label>
              <select
                value={appointment.status || "agendado"}
                onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value as AppointmentStatus)}
                className="w-full rounded-xl border border-[#d4e8e8] bg-white p-3 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-[#239d9a] focus:ring-2 focus:ring-[#239d9a]/10"
              >
                <option value="agendado">Agendada</option>
                <option value="confirmado">Confirmada</option>
                <option value="em_atendimento">Em atendimento</option>
                <option value="finalizado">Finalizada</option>
                <option value="faltou">Faltou</option>
                <option value="cancelado">Cancelada</option>
              </select>
            </div>
          )}

          {appointment.description && (
            <div className="rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3">
              <div className="text-[12px] font-medium uppercase tracking-widest text-slate-400 mb-1">
                Descrição
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{appointment.description}</div>
            </div>
          )}

          {appointment.type !== "compromisso" && (
            <div className="rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-700">Lembrete</div>
                  <div className="text-xs text-slate-500">
                    {appointment.reminder_sent_at
                      ? "Lembrete marcado como enviado"
                      : appointment.reminder_enabled
                        ? `Pendente para ${appointment.reminder_before_hours || 24}h antes`
                        : "Lembrete desativado"}
                  </div>
                </div>

                {appointment.reminder_sent_at ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-[12px] font-medium uppercase tracking-widest text-green-700">
                    Enviado
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-[12px] font-medium uppercase tracking-widest text-yellow-700">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {appointment.patient_id && (
              <button
                type="button"
                onClick={() => openPatientRecord(appointment.patient_id)}
                className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
              >
                Abrir prontuário
              </button>
            )}

            {appointment.type !== "compromisso" && (
              <button
                type="button"
                onClick={() => openSmartReschedule(appointment)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                Reagendar inteligente
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(appointment)}
              className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => onDelete(appointment.id)}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700 hover:bg-red-100"
            >
              Excluir agendamento
            </button>

            {appointment.type !== "compromisso" &&
              hasReminderPhone(appointment) &&
              !appointment.reminder_sent_at && (
                <a
                  href={buildWhatsappHref(appointment, "confirmacao")}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => markReminderAsSent(appointment.id)}
                  className="sm:col-span-2 rounded-xl bg-[#1fb36e] px-4 py-3 text-center text-[13px] font-semibold text-white hover:bg-[#18975d]"
                >
                  Confirmar por WhatsApp
                </a>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
