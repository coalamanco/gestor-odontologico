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
    <div className="overflow-hidden rounded-[24px] border border-[#cdeeed] bg-gradient-to-r from-[#239d9a] via-[#46c1bf] to-[#8edbd8] px-4 shadow-[0_8px_22px_rgba(35,157,154,0.08)] md:px-5">
      <div className="flex h-[48px] items-center justify-between gap-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-white/90">
            Dashboard da clínica
          </p>

          <h1 className="truncate text-[17px] font-semibold tracking-tight text-white md:text-[18px]">
            Visão geral do consultório
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-[16px] border border-white/25 bg-white/15 p-0.5 backdrop-blur-sm">
            {(["hoje", "semana", "mes"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`h-7 rounded-[13px] px-2.5 text-[9px] font-semibold uppercase tracking-[0.10em] transition ${
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
            <div className="hidden rounded-[16px] border border-white/25 bg-white/15 px-3 py-1.5 text-right backdrop-blur-sm md:block">
              <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/85">
                Saldo previsto
              </div>

              <div className="text-[13px] font-semibold leading-tight text-white">
                {formatCurrency(saldoPrevisto)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}