"use client";

import React from "react";

type Props = {
  block: any | null;
  onClose: () => void;
  getBlockColor: (blockType: string) => string;
  getDefaultBlockTitle: (blockType: string) => string;
  formatDateBr: (date: string) => string;
  getProfessionalLabel: (professionalId?: string | null) => string;
  onEdit: (block: any) => void;
  onDelete: (blockId: string) => void | Promise<void>;
};

export function BlockDetailsModal({
  block,
  onClose,
  getBlockColor,
  getDefaultBlockTitle,
  formatDateBr,
  getProfessionalLabel,
  onEdit,
  onDelete,
}: Props) {
  if (!block) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-[520px] rounded-[18px] overflow-hidden bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] border border-[#c2dddd]">
        <div
          className="p-5 text-white"
          style={{ backgroundColor: block.color || getBlockColor(block.block_type) }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold leading-tight">
                {block.title || getDefaultBlockTitle(block.block_type)}
              </h2>
              <p className="mt-1 text-sm opacity-95">
                {formatDateBr(block.date)} • {block.all_day ? "Dia inteiro" : `${block.start_time} - ${block.end_time}`}
              </p>
              <p className="mt-1 text-sm font-bold opacity-95">
                Profissional: {getProfessionalLabel(block.professional_id) || "Todos os profissionais"}
              </p>
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
          {block.description && (
            <div className="rounded-xl border border-[#c2dddd] bg-[#fbffff] p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {block.description}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEdit(block)}
              className="rounded-xl border border-[#c2dddd] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
            >
              Editar bloqueio
            </button>

            <button
              type="button"
              onClick={() => onDelete(block.id)}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700 hover:bg-red-100"
            >
              Remover bloqueio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
