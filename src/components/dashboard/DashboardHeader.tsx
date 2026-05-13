"use client";

type DashboardPeriod = "hoje" | "semana" | "mes";

type DashboardHeaderProps = {
  period: DashboardPeriod;
  setPeriod: (period: DashboardPeriod) => void;
  isAdminUser: boolean;
  saldoPrevisto: number;
  formatCurrency: (value: number) => string;
};

export default function DashboardHeader({
  period,
  setPeriod,
  isAdminUser,
  saldoPrevisto,
  formatCurrency,
}: DashboardHeaderProps) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-[#bde4e3] bg-white shadow-sm md:rounded-2xl">
      <div className="relative min-h-[72px] bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] px-4 py-3 text-white md:px-5 md:py-4">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50/90">
              Dashboard da clínica
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Visão geral do consultório
              </h1>

              <span className="hidden md:inline text-xs font-medium text-cyan-50/90">
                Agenda, recebimentos e indicadores principais.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/15 p-1 border border-white/20">
              {(["hoje", "semana", "mes"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                    period === item
                      ? "bg-white text-[#239d9a] shadow-sm"
                      : "text-cyan-50 hover:bg-white/15"
                  }`}
                >
                  {item === "hoje" ? "Hoje" : item === "semana" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>

            {isAdminUser && (
              <div className="rounded-xl bg-white/15 border border-white/25 px-3 py-2 text-right min-w-[190px]">
                <div className="text-[9px] font-black uppercase tracking-widest text-cyan-50/90">
                  Saldo previsto
                </div>

                <div className="text-lg font-black leading-tight">
                  {formatCurrency(saldoPrevisto)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
