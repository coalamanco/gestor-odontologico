"use client";

import { Button } from "@/components/ui/button";
import type { FinancialRecord } from "@/lib/financeiro/financeiroService";

export type PatientToChargeItem = {
  record: FinancialRecord;
  patientName: string;
  balance: number;
  overdueBalance: number;
  dueTodayBalance: number;
  futureBalance: number;
  daysOpen: number;
  visualStatus: string;
};

type PatientsToChargeCardProps = {
  patients: PatientToChargeItem[];
  chargeAllWhatsappHref: string;
  formatCurrency: (value: unknown) => string;
  onReceive: (record: FinancialRecord) => void;
};

function statusBadgeClass(value: unknown) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "em_atraso") {
    return "border border-red-100 bg-red-50 text-red-600";
  }

  return "border border-amber-100 bg-amber-50 text-amber-600";
}

export default function PatientsToChargeCard({
  patients,
  chargeAllWhatsappHref,
  formatCurrency,
  onReceive,
}: PatientsToChargeCardProps) {
  const overdueCount = patients.filter(
    (item) => item.visualStatus === "em_atraso"
  ).length;

  return (
    <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-800">
            Pacientes para cobrar
          </h2>
          <p className="text-[13px] text-slate-500">
            Lista automática baseada apenas em parcelas vencidas com saldo pendente. Parcelas futuras não entram aqui.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-red-600">
            {overdueCount} em atraso
          </span>

          {patients.length > 0 && (
            <a
              href={chargeAllWhatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#1fb36e] px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm hover:bg-[#199c5f]"
            >
              Cobrar todos
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {patients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-6 text-center text-sm text-slate-400 xl:col-span-2">
            Nenhum paciente com parcela vencida em aberto.
          </div>
        )}

        {patients.map((item) => (
          <div
            key={item.record.id}
            className={`flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${
              item.visualStatus === "em_atraso"
                ? "border-red-100 bg-white/60"
                : "border-[#d9eeee] bg-[#fbffff]"
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[13px] font-semibold text-slate-800">
                  {item.patientName}
                </h3>

                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusBadgeClass(
                    item.visualStatus
                  )}`}
                >
                  {item.visualStatus === "em_atraso" ? "Em atraso" : "Pendente"}
                </span>
              </div>

              <p className="mt-1 truncate text-[11px] text-slate-500">
                {item.record.description || "Débito financeiro"}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Vencido há {item.daysOpen} dia(s)
              </p>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <div className="text-base font-semibold text-[#239d9a]">
                {formatCurrency(item.overdueBalance)}
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg border-[#bfe8e7] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#239d9a] hover:bg-[#f2fcfc]"
                onClick={() => onReceive(item.record)}
              >
                Receber
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
