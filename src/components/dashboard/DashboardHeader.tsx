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
    <div className="overflow-hidden rounded-[26px] border border-[#cdeeed] bg-gradient-to-r from-[#239d9a] via-[#46c1bf] to-[#8edbd8] px-4 shadow-[0_8px_22px_rgba(35,157,154,0.08)] md:px-5">
      <div className="flex min-h-[58px] flex-col gap-3 py-3 text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
            Dashboard da clínica
          </p>

          <h1 className="mt-0.5 truncate text-[20px] font-semibold tracking-tight text-white md:text-[22px]">
            Visão geral do consultório
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex items-center gap-1 rounded-[18px] border border-white/25 bg-white/15 p-1 backdrop-blur-sm">
            {(["hoje", "semana", "mes"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`h-8 rounded-[14px] px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                  period === item
                    ? "bg-white text-[#239d9a] shadow-sm"
                    : "text-white hover:bg-white/15"
                }`}
              >
                {item === "hoje" ? "Hoje" : item === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {isAdminUser && (
            <div className="rounded-[18px] border border-white/25 bg-white/15 px-3 py-2 text-right backdrop-blur-sm">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/85">
                Saldo previsto
              </div>

              <div className="text-[15px] font-semibold leading-tight text-white">
                {formatCurrency(saldoPrevisto)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}