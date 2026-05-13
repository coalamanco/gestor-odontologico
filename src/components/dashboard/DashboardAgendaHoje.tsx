"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardAgendaAppointment = {
  id: string;
  patient_name?: string | null;
  title?: string | null;
  start_time?: string | null;
  status?: string | null;
};

type DashboardAgendaHojeProps = {
  appointments: DashboardAgendaAppointment[];
};

export default function DashboardAgendaHoje({
  appointments,
}: DashboardAgendaHojeProps) {
  return (
    <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-lg font-bold text-slate-800">
          Agenda de hoje
        </CardTitle>

        <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
          Próximas consultas
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 px-5 pb-5">
        {appointments.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-center text-sm text-slate-400">
            Nenhuma consulta para hoje.
          </div>
        )}

        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">
                  {appointment.patient_name || appointment.title || "Paciente"}
                </div>

                <div className="text-sm text-slate-500">
                  {appointment.start_time || "--:--"} •{" "}
                  {appointment.title || "Consulta"}
                </div>
              </div>

              <span className="rounded-full bg-[#eefafa] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#239d9a]">
                {appointment.status || "agendado"}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
