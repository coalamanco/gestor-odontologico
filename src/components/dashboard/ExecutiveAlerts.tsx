"use client";

import Link from "next/link";

export type ExecutiveAlertItem = {
  id: string;
  title: string;
  description: string;
  severity: string;
  area: string;
  actionHref: string;
  actionLabel: string;
};

type ExecutiveAlertsProps = {
  mainMessage: string;
  criticalCount: number;
  opportunityCount: number;
  positiveCount: number;
  alerts: ExecutiveAlertItem[];
};

function getAlertClass(severity: string) {
  if (severity === "critico") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (severity === "atencao") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  if (severity === "oportunidade") {
    return "border-cyan-100 bg-cyan-50 text-cyan-700";
  }

  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function getAlertLabel(severity: string) {
  if (severity === "critico") return "Crítico";
  if (severity === "atencao") return "Atenção";
  if (severity === "oportunidade") return "Oportunidade";

  return "Positivo";
}

export default function ExecutiveAlerts({
  mainMessage,
  criticalCount,
  opportunityCount,
  positiveCount,
  alerts,
}: ExecutiveAlertsProps) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  return (
    <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Alertas Executivos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {mainMessage || "Análise executiva da clínica."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
            {criticalCount || 0} crítico(s)
          </span>

          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
            {opportunityCount || 0} oportunidade(s)
          </span>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {positiveCount || 0} positivo(s)
          </span>
        </div>
      </div>

      {safeAlerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Ainda não há alertas executivos suficientes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {safeAlerts.slice(0, 6).map((alert) => (
            <Link
              key={alert.id}
              href={alert.actionHref || "/dashboard/executivo"}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${getAlertClass(
                alert.severity
              )}`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  {getAlertLabel(alert.severity)}
                </span>

                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {alert.area || "BI"}
                </span>
              </div>

              <h3 className="font-black">
                {alert.title || "Alerta executivo"}
              </h3>

              <p className="mt-1 text-sm leading-6 opacity-90">
                {alert.description || "Verifique este indicador no dashboard."}
              </p>

              <div className="mt-3 inline-flex rounded-xl bg-white/70 px-3 py-2 text-xs font-black">
                {alert.actionLabel || "Ver detalhes"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
