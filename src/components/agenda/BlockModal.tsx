"use client";

import React from "react";
import {
  addMinutesToTime,
  getDefaultBlockTitle,
  timeToMinutes,
} from "@/lib/agenda/agendaUtils";

type BlockForm = {
  id: string;
  professional_id: string;
  block_type: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
};

type Professional = {
  id: string;
  name: string;
  specialty?: string | null;
};

type BlockModalProps = {
  showBlockModal: boolean;
  blockForm: BlockForm;
  setBlockForm: React.Dispatch<React.SetStateAction<BlockForm>>;
  setShowBlockModal: React.Dispatch<React.SetStateAction<boolean>>;
  activeProfessionals: Professional[];
  saveScheduleBlock: () => void | Promise<void>;
  deleteScheduleBlock: (blockId: string) => void | Promise<void>;
};

export function BlockModal({
  showBlockModal,
  blockForm,
  setBlockForm,
  setShowBlockModal,
  activeProfessionals,
  saveScheduleBlock,
  deleteScheduleBlock,
}: BlockModalProps) {
  if (!showBlockModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[24px] border border-[#d4e8e8] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-[#e0eeee] bg-gradient-to-r from-white to-[#f3fbfb] px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800">
            {blockForm.id ? "Editar bloqueio" : "Bloquear horário"}
          </h2>

          <button
            onClick={() => setShowBlockModal(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4e8e8] bg-white text-slate-500 transition hover:bg-[#f4fbfb]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfefe] p-5">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tipo de bloqueio
            </label>
            <select
              value={blockForm.block_type}
              onChange={(e) => {
                const nextType = e.target.value;
                setBlockForm((prev) => ({
                  ...prev,
                  block_type: nextType,
                  title:
                    prev.title && prev.title !== getDefaultBlockTitle(prev.block_type)
                      ? prev.title
                      : getDefaultBlockTitle(nextType),
                }));
              }}
              className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
            >
              <option value="bloqueio">Bloqueio</option>
              <option value="almoco">Almoço</option>
              <option value="ferias">Férias</option>
              <option value="reuniao">Reunião</option>
              <option value="curso">Curso/Congresso</option>
              <option value="pessoal">Pessoal</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Título
            </label>
            <input
              value={blockForm.title}
              onChange={(e) =>
                setBlockForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ex.: Almoço, Férias, Reunião"
              className="w-full border border-[#c2dddd] p-3 rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Profissional
            </label>
            <select
              value={blockForm.professional_id}
              onChange={(e) =>
                setBlockForm((prev) => ({
                  ...prev,
                  professional_id: e.target.value,
                }))
              }
              className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
            >
              <option value="">Todos os profissionais</option>
              {activeProfessionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                  {professional.specialty ? ` • ${professional.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Data
            </label>
            <input
              type="date"
              value={blockForm.date}
              onChange={(e) =>
                setBlockForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full border border-[#c2dddd] p-3 rounded-xl"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input
              type="checkbox"
              checked={blockForm.all_day}
              onChange={(e) =>
                setBlockForm((prev) => ({ ...prev, all_day: e.target.checked }))
              }
            />
            Bloquear o dia inteiro
          </label>

          {!blockForm.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Início
                </label>
                <input
                  type="time"
                  value={blockForm.start_time}
                  onChange={(e) =>
                    setBlockForm((prev) => ({
                      ...prev,
                      start_time: e.target.value,
                      end_time:
                        timeToMinutes(prev.end_time) <= timeToMinutes(e.target.value)
                          ? addMinutesToTime(e.target.value, 60)
                          : prev.end_time,
                    }))
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Fim
                </label>
                <input
                  type="time"
                  value={blockForm.end_time}
                  onChange={(e) =>
                    setBlockForm((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Observação
            </label>
            <textarea
              value={blockForm.description}
              onChange={(e) =>
                setBlockForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Observação interna opcional"
              className="min-h-[100px] w-full border border-[#c2dddd] p-3 rounded-xl"
            />
          </div>

          <div className="rounded-[1.35rem] border border-[#d9eeee] bg-[#f7ffff] p-3 text-xs text-slate-600">
            Este bloqueio impede novos agendamentos no período selecionado.
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#c2dddd] p-4 flex justify-between gap-2 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
          <div>
            {blockForm.id && (
              <button
                type="button"
                onClick={() => deleteScheduleBlock(blockForm.id)}
                className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-[13px] font-semibold text-red-700 hover:bg-red-100"
              >
                Remover
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockModal(false)}
              className="px-4 py-2 rounded-xl border border-[#c2dddd] bg-white hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              onClick={saveScheduleBlock}
              className="bg-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-slate-800"
            >
              Salvar bloqueio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
