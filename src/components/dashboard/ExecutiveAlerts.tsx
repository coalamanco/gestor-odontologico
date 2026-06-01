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
    return "border-rose-100 bg-rose-50 text-rose-700 hover:border-rose-200";
  }

  if (severity === "atencao") {
    return "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200";
  }

  if (severity === "oportunidade") {
    return "border-[var(--clinic-border)] bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary-dark)] hover:border-[var(--clinic-border-strong)]";
  }

  return "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200";
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
    <section className="premium-card-lg mb-6 p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[19px] font-black tracking-tight text-[var(--clinic-text)]">
            Alertas Executivos
          </h2>

          <p className="mt-1 max-w-4xl text-[13px] font-medium leading-6 text-[var(--clinic-muted)]">
            {mainMessage || "Análise executiva da clínica."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
            {criticalCount || 0} crítico(s)
          </span>

          <span className="rounded-full bg-[var(--clinic-primary-soft)] px-3 py-1 text-xs font-black text-[var(--clinic-primary-dark)] ring-1 ring-[var(--clinic-border)]">
            {opportunityCount || 0} oportunidade(s)
          </span>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
            {positiveCount || 0} positivo(s)
          </span>
        </div>
      </div>

      {safeAlerts.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[var(--clinic-border)] bg-[var(--clinic-surface-soft)] p-8 text-center text-sm font-medium text-[var(--clinic-muted)]">
          Ainda não há alertas executivos suficientes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {safeAlerts.slice(0, 6).map((alert) => (
            <Link
              key={alert.id}
              href={alert.actionHref || "/dashboard/executivo"}
              className={`rounded-[22px] border p-4 shadow-[var(--premium-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-md ${getAlertClass(
                alert.severity,
              )}`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {getAlertLabel(alert.severity)}
                </span>

                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {alert.area || "BI"}
                </span>
              </div>

              <h3 className="font-black leading-snug">
                {alert.title || "Alerta executivo"}
              </h3>

              <p className="mt-1 text-sm font-medium leading-6 opacity-90">
                {alert.description || "Verifique este indicador no dashboard."}
              </p>

              <div className="mt-3 inline-flex rounded-xl bg-white/75 px-3 py-2 text-xs font-black shadow-sm">
                {alert.actionLabel || "Ver detalhes"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
