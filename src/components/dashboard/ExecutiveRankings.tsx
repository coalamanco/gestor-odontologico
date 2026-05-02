"use client";

type RankingItem = {
  name: string;
  value: number;
  count: number;
};

type ExecutiveRankingsProps = {
  procedureRanking: RankingItem[];
  professionalRanking: RankingItem[];
  formatCurrency: (value: number) => string;
};

export default function ExecutiveRankings({
  procedureRanking,
  professionalRanking,
  formatCurrency,
}: ExecutiveRankingsProps) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-800">
          Ranking de procedimentos
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Procedimentos com maior performance financeira.
        </p>

        <div className="mt-5 space-y-3">
          {procedureRanking.slice(0, 6).map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black text-slate-800">
                  {index + 1}. {item.name}
                </p>

                <p className="text-xs text-slate-500">
                  {item.count} lançamento(s)
                </p>
              </div>

              <p className="font-black text-emerald-600">
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}

          {procedureRanking.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Ainda não há ranking de procedimentos.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-800">
          Ranking por profissional
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Produção agrupada por profissional quando disponível.
        </p>

        <div className="mt-5 space-y-3">
          {professionalRanking.slice(0, 6).map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black text-slate-800">
                  {index + 1}. {item.name}
                </p>

                <p className="text-xs text-slate-500">
                  {item.count} lançamento(s)
                </p>
              </div>

              <p className="font-black text-emerald-600">
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}

          {professionalRanking.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Ainda não há ranking por profissional.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
