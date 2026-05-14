"use client";

import Link from "next/link";
import { Megaphone, Send, ShieldCheck, Users } from "lucide-react";

export default function ComunicadoMassaCard() {
  return (
    <Link
      href="/crm/campanhas/comunicado"
      className="group block overflow-hidden rounded-[1.35rem] border border-[#bde4e3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#eefafa] p-3 text-[#239d9a] transition group-hover:bg-[#239d9a] group-hover:text-white">
            <Megaphone size={24} />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              Campanhas inteligentes
            </div>

            <h2 className="mt-1 text-lg font-black text-slate-800">
              Comunicado em Massa
            </h2>

            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Envie um aviso manual para todos os pacientes com telefone cadastrado.
              Ideal para comunicar fechamento, recesso, feriados, mudanças de horário ou avisos gerais da clínica.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl bg-[#fbffff] px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-[#d9eeee]">
                <Users size={15} className="text-[#239d9a]" />
                Todos os pacientes
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-[#fbffff] px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-[#d9eeee]">
                <ShieldCheck size={15} className="text-emerald-600" />
                Confirmação manual
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-[#fbffff] px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-[#d9eeee]">
                <Send size={15} className="text-cyan-600" />
                Envio gradual
              </div>
            </div>
          </div>
        </div>

        <div className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#239d9a] px-4 py-3 text-sm font-black text-white shadow-sm transition group-hover:bg-[#1f8d8a]">
          Abrir comunicado
        </div>
      </div>
    </Link>
  );
}
