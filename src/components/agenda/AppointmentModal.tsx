import type { Dispatch, SetStateAction } from "react";
import type { AppointmentStatus, ConsultaMotivo, MainType } from "@/lib/agenda/agendaUtils";

type QuickPatientForm = {
  name: string;
  phone: string;
  cpf: string;
  email: string;
};

type AppointmentModalProps = {
  showModal: boolean;
  editingId: string | null;
  setShowModal: (value: boolean) => void;
  mainType: MainType;
  setMainType: (value: MainType) => void;
  openQuickPatientForm: () => void;
  search: string;
  setSearch: (value: string) => void;
  selectedPatient: any;
  setSelectedPatient: (value: any) => void;
  setQuickPatientForm: Dispatch<SetStateAction<QuickPatientForm>>;
  showQuickPatientForm: boolean;
  quickPatientForm: QuickPatientForm;
  updateQuickPatientField: (field: string, value: string) => void;
  closeQuickPatientForm: () => void;
  saveQuickPatient: () => void | Promise<void>;
  savingQuickPatient: boolean;
  filteredPatients: any[];
  consultaMotivo: ConsultaMotivo;
  setConsultaMotivo: (value: ConsultaMotivo) => void;
  selectedProfessionalId: string;
  setSelectedProfessionalId: (value: string) => void;
  activeProfessionals: any[];
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  appointmentStatus: AppointmentStatus;
  setAppointmentStatus: (value: AppointmentStatus) => void;
  reminderEnabled: boolean;
  setReminderEnabled: (value: boolean) => void;
  reminderBeforeHours: string;
  setReminderBeforeHours: (value: string) => void;
  savingAppointment: boolean;
  handleSave: () => void | Promise<void>;
};

export function AppointmentModal(props: AppointmentModalProps) {
  const {
    showModal, editingId, setShowModal, mainType, setMainType,
    openQuickPatientForm, search, setSearch, selectedPatient, setSelectedPatient,
    setQuickPatientForm, showQuickPatientForm, quickPatientForm, updateQuickPatientField,
    closeQuickPatientForm, saveQuickPatient, savingQuickPatient, filteredPatients,
    consultaMotivo, setConsultaMotivo, selectedProfessionalId, setSelectedProfessionalId,
    activeProfessionals, title, setTitle, description, setDescription, date, setDate,
    time, setTime, duration, setDuration, appointmentStatus, setAppointmentStatus,
    reminderEnabled, setReminderEnabled, reminderBeforeHours, setReminderBeforeHours,
    savingAppointment, handleSave,
  } = props;

  if (!showModal) return null;

  return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[24px] border border-[#d4e8e8] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between border-b border-[#e0eeee] bg-gradient-to-r from-white to-[#f3fbfb] px-5 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                {editingId ? "Editar agendamento" : "Novo agendamento"}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4e8e8] bg-white text-slate-500 transition hover:bg-[#f4fbfb]"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfefe] p-5">
            <div className="flex gap-2">
              <button
                onClick={() => setMainType("consulta")}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${
                  mainType === "consulta"
                    ? "bg-[#239d9a] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Consulta
              </button>

              <button
                onClick={() => setMainType("compromisso")}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${
                  mainType === "compromisso"
                    ? "bg-[#239d9a] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Compromisso
              </button>
            </div>

            {mainType === "consulta" && (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Paciente
                    </label>

                    <button
                      type="button"
                      onClick={openQuickPatientForm}
                      className="rounded-xl border border-[#b9dddd] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#239d9a] shadow-sm transition hover:bg-[#f2fcfc]"
                    >
                      + Novo paciente
                    </button>
                  </div>

                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedPatient(null);
                      setQuickPatientForm((current) => ({
                        ...current,
                        name: e.target.value,
                      }));
                    }}
                    placeholder="Buscar paciente"
                    className="w-full border border-[#c2dddd] p-3 rounded-xl"
                  />

                  {selectedPatient && (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                      Paciente selecionado: {selectedPatient.name}
                    </div>
                  )}
                </div>

                {showQuickPatientForm && (
                  <div className="rounded-[1.35rem] border border-[#c2dddd] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[13px] font-semibold text-slate-800">
                          Cadastro rápido de paciente
                        </h3>
                        <p className="text-[12px] font-medium text-slate-400">
                          Cadastre sem sair da agenda. O paciente será selecionado automaticamente.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeQuickPatientForm}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4e8e8] bg-white text-slate-500 hover:bg-[#f4fbfb]"
                      >
                        ×
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Nome completo *
                        </label>
                        <input
                          value={quickPatientForm.name}
                          onChange={(e) => updateQuickPatientField("name", e.target.value)}
                          placeholder="Nome do paciente"
                          className="w-full rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3 outline-none focus:border-[#239d9a] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          WhatsApp
                        </label>
                        <input
                          value={quickPatientForm.phone}
                          onChange={(e) => updateQuickPatientField("phone", e.target.value)}
                          placeholder="Telefone / WhatsApp"
                          className="w-full rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3 outline-none focus:border-[#239d9a] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          CPF
                        </label>
                        <input
                          value={quickPatientForm.cpf}
                          onChange={(e) => updateQuickPatientField("cpf", e.target.value)}
                          placeholder="CPF"
                          className="w-full rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3 outline-none focus:border-[#239d9a] focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={quickPatientForm.email}
                          onChange={(e) => updateQuickPatientField("email", e.target.value)}
                          placeholder="E-mail"
                          className="w-full rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3 outline-none focus:border-[#239d9a] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeQuickPatientForm}
                        disabled={savingQuickPatient}
                        className="rounded-xl border border-[#d4e8e8] bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-[#f4fbfb] disabled:opacity-60"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={saveQuickPatient}
                        disabled={savingQuickPatient}
                        className="rounded-xl bg-[#239d9a] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                      >
                        {savingQuickPatient ? "Salvando..." : "Salvar e selecionar"}
                      </button>
                    </div>
                  </div>
                )}

                {filteredPatients.length > 0 && !selectedPatient && (
                  <div className="max-h-32 overflow-auto rounded-xl border border-[#c2dddd] bg-white">
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearch(p.name);
                        }}
                        className="cursor-pointer p-3 hover:bg-[#fbffff]"
                      >
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Motivo
                  </label>
                  <select
                    value={consultaMotivo}
                    onChange={(e) =>
                      setConsultaMotivo(e.target.value as ConsultaMotivo)
                    }
                    className="w-full border border-[#c2dddd] p-3 rounded-xl"
                  >
                    <option value="consulta">Consulta</option>
                    <option value="retorno">Retorno</option>
                    <option value="tratamento">Tratamento</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Profissional responsável
              </label>
              <select
                value={selectedProfessionalId}
                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
              >
                <option value="">Sem profissional definido</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                    {professional.specialty ? ` • ${professional.specialty}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {mainType === "compromisso" && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Título
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do compromisso"
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição"
                className="w-full border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl w-full"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Duração
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border border-[#c2dddd] p-3 rounded-xl"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="75">75 min</option>
                <option value="90">90 min</option>
              </select>
            </div>

            {mainType === "consulta" && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </label>
                <select
                  value={appointmentStatus}
                  onChange={(e) =>
                    setAppointmentStatus(e.target.value as AppointmentStatus)
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                >
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="faltou">Faltou</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            )}

            {mainType === "consulta" && (
              <div className="rounded-[1.35rem] border border-[#c2dddd] bg-[#fbffff] p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-700">
                      Lembrete automático
                    </div>
                    <div className="text-xs text-slate-500">
                      Preparado para envio automático por WhatsApp
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#239d9a] peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {reminderEnabled && (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Enviar lembrete
                    </label>
                    <select
                      value={reminderBeforeHours}
                      onChange={(e) => setReminderBeforeHours(e.target.value)}
                      className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                    >
                      <option value="1">1 hora antes</option>
                      <option value="3">3 horas antes</option>
                      <option value="6">6 horas antes</option>
                      <option value="12">12 horas antes</option>
                      <option value="24">24 horas antes</option>
                      <option value="48">48 horas antes</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#c2dddd] p-4 flex justify-end gap-2 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <button
                onClick={() => {
                  if (!savingAppointment) setShowModal(false);
                }}
                className="px-4 py-2 rounded-xl border border-[#c2dddd] bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingAppointment}
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={savingAppointment}
                className="rounded-xl bg-[#239d9a] px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1f8c89] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAppointment ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
  );
}
