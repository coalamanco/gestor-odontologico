import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type PageHeaderAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: PageHeaderAction[];
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions = [],
  className = "",
}: PageHeaderProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border border-[#cdeeed] bg-gradient-to-r from-[#239d9a] via-[#46c1bf] to-[#8edbd8] px-4 py-4 text-white shadow-[0_8px_24px_rgba(35,157,154,0.10)] md:px-5 ${className}`}
    >
      <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-white/15" />
      <div className="absolute -bottom-24 left-10 h-36 w-36 rounded-full bg-white/10" />

      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] bg-white/15 text-white ring-1 ring-white/25">
              {icon}
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-50 backdrop-blur">
                {eyebrow}
              </div>
            )}

            <h1 className="truncate text-[22px] font-semibold tracking-tight text-white md:text-[24px]">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 max-w-3xl text-[12px] font-medium leading-5 text-cyan-50">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {actions.map((action) => (
              <PageHeaderActionButton key={action.label} action={action} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PageHeaderActionButton({ action }: { action: PageHeaderAction }) {
  const className =
    action.variant === "primary"
      ? "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white px-3.5 text-[12px] font-semibold text-[#239d9a] shadow-sm transition hover:bg-[#fbffff]"
      : action.variant === "ghost"
        ? "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-3.5 text-[12px] font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
        : "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-3.5 text-[12px] font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.icon}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.icon}
      {action.label}
    </button>
  );
}

export function PageShell({
  children,
  className = "",
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <main className={`min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f4fbfb] to-[#eef8f8] p-3 pb-24 md:p-5 ${className}`}>
      {children}
    </main>
  );
}

export function PageContainer({
  children,
  className = "",
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto max-w-7xl space-y-4 ${className}`}>{children}</div>;
}

export function PremiumCard({
  children,
  className = "",
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-[24px] border border-[#d9eeee] bg-white/95 shadow-[0_6px_18px_rgba(35,157,154,0.045)] ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#eefafa] text-[#239d9a]">
            {icon}
          </div>
        )}

        <div>
          <h2 className="text-[16px] font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
        </div>
      </div>

      {action}
    </div>
  );
}

type PremiumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function PremiumButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: PremiumButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-[#239d9a] text-white hover:bg-[#1f8f8c]"
      : variant === "danger"
        ? "border border-[#d9eeee] bg-white text-slate-500 hover:bg-[#fbffff]"
        : variant === "ghost"
          ? "bg-[#eefafa] text-[#239d9a] hover:bg-[#dff3f2]"
          : "border border-[#d9eeee] bg-white text-slate-600 hover:bg-[#fbffff]";

  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type PremiumInputProps = InputHTMLAttributes<HTMLInputElement>;

export function PremiumInput({ className = "", ...props }: PremiumInputProps) {
  return (
    <input
      className={`h-11 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#84d5d3] focus:bg-white focus:shadow-sm ${className}`}
      {...props}
    />
  );
}

type PremiumBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "teal" | "neutral" | "success" | "warning";
};

export function PremiumBadge({
  children,
  className = "",
  variant = "teal",
  ...props
}: PremiumBadgeProps) {
  const variantClass =
    variant === "success"
      ? "border-emerald-100 bg-emerald-50/70 text-emerald-700"
      : variant === "warning"
        ? "border-[#d9eeee] bg-[#f7ffff] text-[#0f766e]"
        : variant === "neutral"
          ? "border-slate-200 bg-slate-50 text-slate-500"
          : "border-[#d9eeee] bg-[#eefafa] text-[#239d9a]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
