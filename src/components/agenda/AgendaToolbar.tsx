"use client";

import React from "react";
import {
  formatDate,
  formatDateBr,
  getHolidayInfo,
  pad,
} from "@/lib/agenda/agendaUtils";

type Professional = {
  id: string;
  name: string;
};

type MiniCalendarDay = {
  date: Date;
  dateKey: string;
  day: number;
  today: boolean;
  currentMonth: boolean;
};

type AgendaToolbarProps = {
  weekBaseDate: Date;
  setWeekBaseDate: React.Dispatch<React.SetStateAction<Date>>;
  miniCalendarDate: Date;
  setMiniCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  showMiniCalendar: boolean;
  setShowMiniCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  miniCalendarDays: MiniCalendarDay[];
  selectMiniCalendarDay: (date: Date) => void;
  activeProfessionals: Professional[];
  selectedAgendaProfessionalId: string;
  setSelectedAgendaProfessionalId: React.Dispatch<React.SetStateAction<string>>;
  selectedProfessionalColor: string;
  selectedProfessionalInitials: string;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  days: Array<{ date: string }>;
  clinicStartHour: number;
  openNewBlock: (date?: string, time?: string) => void;
  syncExistingGoogleAppointments: () => void | Promise<void>;
  connectGoogleCalendar: () => void | Promise<void>;
  mobileView: "day" | "week";
  setMobileView: React.Dispatch<React.SetStateAction<"day" | "week">>;
  showMobileAgendaSheet: boolean;
  setShowMobileAgendaSheet: React.Dispatch<React.SetStateAction<boolean>>;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
};

export function AgendaToolbar({
  weekBaseDate,
  setWeekBaseDate,
  miniCalendarDate,
  setMiniCalendarDate,
  showMiniCalendar,
  setShowMiniCalendar,
  miniCalendarDays,
  selectMiniCalendarDay,
  activeProfessionals,
  selectedAgendaProfessionalId,
  setSelectedAgendaProfessionalId,
  selectedProfessionalColor,
  selectedProfessionalInitials,
  statusFilter,
  setStatusFilter,
  days,
  clinicStartHour,
  openNewBlock,
  syncExistingGoogleAppointments,
  connectGoogleCalendar,
  mobileView,
  setMobileView,
  showMobileAgendaSheet,
  setShowMobileAgendaSheet,
  goToPreviousDay,
  goToNextDay,
}: AgendaToolbarProps) {
  return (
    <>
      <div className="hidden border-b border-[#d9eeee] bg-white/90 px-3 py-2 shadow-[0_8px_22px_rgba(35,157,154,0.06)] backdrop-blur-md md:block">
        <div className="grid min-h-[42px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
      
            <button
              type="button"
              onClick={() => {
                setShowMiniCalendar(false);
                setWeekBaseDate(new Date());
                setMiniCalendarDate(new Date());
              }}
              className="h-8 rounded-xl bg-[#239d9a] px-3 text-[12px] font-medium text-white shadow-sm hover:bg-[#1f8f8c]"
            >
              Hoje
            </button>
      
            <div className="hidden w-[250px] items-center gap-2 rounded-[1.35rem] border border-[#d9eeee] bg-white px-2 py-1.5 shadow-[0_6px_18px_rgba(35,157,154,0.06)] md:flex">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: selectedProfessionalColor }}
              >
                {selectedAgendaProfessionalId ? selectedProfessionalInitials : "TP"}
              </div>
      
              <select
                value={selectedAgendaProfessionalId}
                onChange={(e) => setSelectedAgendaProfessionalId(e.target.value)}
                className="h-7 min-w-0 flex-1 bg-transparent text-[12px] font-medium text-slate-700 outline-none"
                title="Selecionar agenda do profissional"
              >
                <option value="">Todos os profissionais</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </div>
      
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setMiniCalendarDate(weekBaseDate);
                  setShowMiniCalendar((prev) => !prev);
                }}
                className="h-8 rounded-xl bg-white px-3 text-[12px] font-medium text-[#239d9a] ring-1 ring-[#d9eeee] hover:bg-[#f2fcfc]"
                title="Abrir mini calendário"
              >
                📅
              </button>
      
              {showMiniCalendar && (
                <div className="absolute left-0 top-10 z-[80] w-[292px] rounded-3xl border border-[#d9eeee] bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMiniCalendarDate((prev) => {
                          const next = new Date(prev);
                          next.setMonth(next.getMonth() - 1);
                          return next;
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eefafa] text-[12px] font-medium text-[#239d9a] hover:bg-[#dff3f2]"
                      title="Mês anterior"
                    >
                      ◀
                    </button>
      
                    <div className="text-center">
                      <div className="text-[13px] font-semibold capitalize text-slate-800">
                        {miniCalendarDate.toLocaleDateString("pt-BR", {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        escolher dia
                      </div>
                    </div>
      
                    <button
                      type="button"
                      onClick={() =>
                        setMiniCalendarDate((prev) => {
                          const next = new Date(prev);
                          next.setMonth(next.getMonth() + 1);
                          return next;
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eefafa] text-[12px] font-medium text-[#239d9a] hover:bg-[#dff3f2]"
                      title="Próximo mês"
                    >
                      ▶
                    </button>
                  </div>
      
                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400">
                    {["S", "T", "Q", "Q", "S", "S", "D"].map((item, index) => (
                      <div key={`${item}-${index}`} className="py-1">
                        {item}
                      </div>
                    ))}
                  </div>
      
                  <div className="grid grid-cols-7 gap-1">
                    {miniCalendarDays.map((item) => {
                      const selected = item.dateKey === formatDate(weekBaseDate);
                      const holiday = getHolidayInfo(item.dateKey);
      
                      return (
                        <button
                          key={item.dateKey}
                          type="button"
                          onClick={() => selectMiniCalendarDay(item.date)}
                          title={holiday?.name || formatDateBr(item.dateKey)}
                          className={`relative flex h-8 items-center justify-center rounded-lg text-[12px] font-medium transition ${
                            selected
                              ? "bg-[#239d9a] text-white"
                              : item.today
                                ? "bg-[#e8f7f6] text-[#239d9a] ring-1 ring-[#239d9a]/20"
                                : item.currentMonth
                                  ? "text-slate-700 hover:bg-[#f2fcfc]"
                                  : "text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {item.day}
                          {holiday && (
                            <span className={`absolute bottom-1 h-1 w-1 rounded-full ${
                              selected ? "bg-white" : "bg-amber-400"
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
      
                  <div className="mt-3 flex items-center justify-between border-t border-[#e0eeee] pt-3">
                    <button
                      type="button"
                      onClick={() => selectMiniCalendarDay(new Date())}
                      className="rounded-xl bg-[#eefafa] px-3 py-2 text-[11px] font-semibold text-[#239d9a] hover:bg-[#dff3f2]"
                    >
                      Hoje
                    </button>
      
                    <button
                      type="button"
                      onClick={() => setShowMiniCalendar(false)}
                      className="rounded-xl border border-[#d9eeee] bg-white px-3 py-2 text-[11px] font-medium text-slate-500 hover:bg-[#f4fbfb]"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
      
          </div>
      
          <div className="flex min-w-[280px] flex-col items-center justify-center text-center">
            <h1 className="truncate text-[18px] font-bold leading-none text-slate-800 lg:text-[21px] tracking-[-0.02em]">
              Agenda Clínica
            </h1>
            <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.20em] text-[#239d9a] lg:text-[10px]">
              {new Date(weekBaseDate).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
      
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 w-[126px] rounded-xl border border-[#d9eeee] bg-white px-2 text-[12px] font-medium text-slate-700 outline-none"
              title="Filtrar agenda por status"
            >
              <option value="todos">Todos</option>
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="finalizado">Finalizado</option>
              <option value="faltou">Faltou</option>
              <option value="cancelado">Cancelado</option>
            </select>
      
      
      
      
      
            <button
              type="button"
              onClick={() => openNewBlock(days[0]?.date, `${pad(clinicStartHour)}:00`)}
              className="h-7 rounded-lg bg-slate-700 px-3 text-[10px] font-semibold text-white shadow-sm hover:bg-slate-800"
              title="Bloquear horário na agenda"
            >
              Bloquear
            </button>
      
            <button
              type="button"
              onClick={syncExistingGoogleAppointments}
              className="hidden h-7 rounded-lg border border-[#c2dddd] bg-white px-3 text-[10px] font-semibold text-[#239d9a] shadow-sm hover:bg-[#f4ffff] xl:inline-flex xl:items-center"
              title="Sincronizar consultas existentes com Google Agenda"
            >
              Sincronizar
            </button>
      
            <button
              type="button"
              onClick={connectGoogleCalendar}
              className="h-7 rounded-lg border border-[#c2dddd] bg-white px-3 text-[11px] font-semibold text-[#239d9a] shadow-sm hover:bg-[#f4ffff]"
              title="Conectar sua conta ao Google Agenda"
            >
              Google Agenda
            </button>
      
      
          </div>
        </div>
      </div>
      
      <div className="border-b border-[#d7e7e7] bg-white/95 px-2 py-1.5 shadow-sm md:hidden">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button type="button" onClick={() => { setShowMiniCalendar(false); setWeekBaseDate(new Date()); setMiniCalendarDate(new Date()); }} className="h-9 rounded-[1.35rem] bg-[#239d9a] px-4 text-[13px] font-semibold text-white shadow-sm active:scale-[0.98]">Hoje</button>
          <div className="flex min-w-0 items-center gap-2 rounded-[1.35rem] border border-[#c2dddd] bg-white px-2 shadow-sm">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm" style={{ backgroundColor: selectedProfessionalColor }}>{selectedAgendaProfessionalId ? selectedProfessionalInitials : "TP"}</div>
            <select value={selectedAgendaProfessionalId} onChange={(e) => setSelectedAgendaProfessionalId(e.target.value)} className="h-9 min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-slate-700 outline-none" title="Selecionar agenda do profissional">
              <option value="">Todos</option>
              {activeProfessionals.map((professional) => (<option key={professional.id} value={professional.id}>{professional.name}</option>))}
            </select>
          </div>
          <button type="button" onClick={() => { setShowMiniCalendar(false); setMiniCalendarDate(weekBaseDate); setShowMobileAgendaSheet(true); }} className="h-9 rounded-[1.35rem] border border-[#c2dddd] bg-white px-3 text-[12px] font-medium text-[#239d9a] shadow-sm active:scale-[0.98]">⚙ Agenda</button>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{mobileView === "day" ? "Modo dia" : "Modo semana"}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#239d9a]">{new Date(weekBaseDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
        </div>
      </div>
      
      {showMobileAgendaSheet && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/35 md:hidden" onClick={() => setShowMobileAgendaSheet(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[28px] border border-[#d7e7e7] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-800">Controles da agenda</h2><p className="text-[12px] font-medium text-slate-500">Ajuste a visualização sem ocupar espaço da agenda.</p></div>
              <button type="button" onClick={() => setShowMobileAgendaSheet(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-600">✕</button>
            </div>
            <div className="space-y-3">
              <div className="rounded-[1.35rem] border border-[#c2dddd] bg-[#fbffff] p-3">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Profissional</label>
                <div className="flex items-center gap-2 rounded-[1.35rem] border border-[#c2dddd] bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm" style={{ backgroundColor: selectedProfessionalColor }}>{selectedAgendaProfessionalId ? selectedProfessionalInitials : "TP"}</div>
                  <select value={selectedAgendaProfessionalId} onChange={(e) => setSelectedAgendaProfessionalId(e.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-slate-700 outline-none" title="Selecionar agenda do profissional">
                    <option value="">Todos os profissionais</option>
                    {activeProfessionals.map((professional) => (<option key={professional.id} value={professional.id}>{professional.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-[#c2dddd] bg-white p-3 shadow-sm">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Visualização</label>
                <div className="grid grid-cols-2 overflow-hidden rounded-[1.35rem] border border-[#c2dddd] bg-[#f7ffff]">
                  <button type="button" onClick={() => setMobileView("day")} className={`h-10 text-[13px] font-semibold transition ${mobileView === "day" ? "bg-[#239d9a] text-white" : "text-slate-600"}`}>Dia</button>
                  <button type="button" onClick={() => setMobileView("week")} className={`h-10 text-[13px] font-semibold transition ${mobileView === "week" ? "bg-[#239d9a] text-white" : "text-slate-600"}`}>Semana</button>
                </div>
              </div>
              {mobileView === "day" && (
                <div className="rounded-[1.35rem] border border-[#c2dddd] bg-white p-3 shadow-sm">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Navegação</label>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <button type="button" onClick={() => { goToPreviousDay(); setShowMobileAgendaSheet(false); }} className="h-10 rounded-[1.35rem] border border-[#c2dddd] bg-white px-2 text-[12px] font-medium text-[#239d9a]">◀ Anterior</button>
                    <button type="button" onClick={() => { setWeekBaseDate(new Date()); setMiniCalendarDate(new Date()); setShowMobileAgendaSheet(false); }} className="h-10 rounded-[1.35rem] bg-[#239d9a] px-4 text-[12px] font-medium text-white">Hoje</button>
                    <button type="button" onClick={() => { goToNextDay(); setShowMobileAgendaSheet(false); }} className="h-10 rounded-[1.35rem] border border-[#c2dddd] bg-white px-2 text-[12px] font-medium text-[#239d9a]">Próximo ▶</button>
                  </div>
                  <button type="button" onClick={() => { setMiniCalendarDate(weekBaseDate); setShowMiniCalendar((prev) => !prev); }} className="mt-2 h-10 w-full rounded-[1.35rem] bg-[#eefafa] text-[13px] font-semibold text-[#239d9a]">📅 Escolher outro dia</button>
                  <div className="mt-2 rounded-[1.35rem] border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-center text-[11px] font-bold text-slate-500">Dica: também pode deslizar a agenda para os lados.</div>
                </div>
              )}
              {showMiniCalendar && (
                <div className="rounded-[1.35rem] border border-[#d4e8e8] bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setMiniCalendarDate((prev) => { const next = new Date(prev); next.setMonth(next.getMonth() - 1); return next; })} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eefafa] text-[12px] font-medium text-[#239d9a]">◀</button>
                    <div className="text-center"><div className="text-[13px] font-semibold capitalize text-slate-800">{miniCalendarDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">escolher dia</div></div>
                    <button type="button" onClick={() => setMiniCalendarDate((prev) => { const next = new Date(prev); next.setMonth(next.getMonth() + 1); return next; })} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eefafa] text-[12px] font-medium text-[#239d9a]">▶</button>
                  </div>
                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400">{["S", "T", "Q", "Q", "S", "S", "D"].map((item, index) => (<div key={`${item}-${index}`} className="py-1">{item}</div>))}</div>
                  <div className="grid grid-cols-7 gap-1">
                    {miniCalendarDays.map((item) => {
                      const selected = item.dateKey === formatDate(weekBaseDate);
                      const holiday = getHolidayInfo(item.dateKey);
                      return (
                        <button key={item.dateKey} type="button" onClick={() => { selectMiniCalendarDay(item.date); setShowMobileAgendaSheet(false); }} title={holiday?.name || formatDateBr(item.dateKey)} className={`relative flex h-9 items-center justify-center rounded-xl text-[12px] font-medium transition ${selected ? "bg-[#239d9a] text-white" : item.today ? "bg-[#e8f7f6] text-[#239d9a] ring-1 ring-[#239d9a]/20" : item.currentMonth ? "text-slate-700 hover:bg-[#f2fcfc]" : "text-slate-300 hover:bg-slate-50"}`}>
                          {item.day}{holiday && (<span className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-amber-400"}`} />)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { openNewBlock(days[0]?.date, `${pad(clinicStartHour)}:00`); setShowMobileAgendaSheet(false); }} className="h-11 rounded-[1.35rem] bg-slate-700 px-3 text-[12px] font-medium text-white shadow-sm">Bloquear horário</button>
                <button type="button" onClick={connectGoogleCalendar} className="h-11 rounded-[1.35rem] border border-[#c2dddd] bg-white px-3 text-[12px] font-medium text-[#239d9a] shadow-sm">Google Agenda</button>
              </div>
              <div className="rounded-[1.35rem] border border-[#c2dddd] bg-white p-3 shadow-sm">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Filtro de status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 w-full rounded-[1.35rem] border border-[#c2dddd] bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none" title="Filtrar agenda por status">
                  <option value="todos">Todos</option><option value="agendado">Agendado</option><option value="confirmado">Confirmado</option><option value="em_atendimento">Em atendimento</option><option value="finalizado">Finalizado</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
