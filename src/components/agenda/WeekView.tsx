"use client";

import React from "react";

export interface WeekViewProps {
  days: any[];
  hours: string[];
  statusFilter: string;
  filteredAppointmentsByProfessional: any[];
  clinicSettings: any;
  agendaScrollRef: any;
  handleAgendaTouchStart: (...args: any[]) => any;
  handleAgendaTouchEnd: (...args: any[]) => any;
  getHolidayInfo: (...args: any[]) => any;
  isTodayDate: (...args: any[]) => any;
  formatDateBr: (...args: any[]) => any;
  getDayOccupation: (...args: any[]) => any;
  slotDividerClass: (...args: any[]) => any;
  timeColumnClass: (...args: any[]) => any;
  isMobileAgenda: boolean;
  mobileView: "day" | "week";
  isResizingRef: any;
  suppressNextClickRef: any;
  draggingId: string | null;
  draggingIdRef: any;
  setDraggingId: (...args: any[]) => any;
  openNew: (...args: any[]) => any;
  handleDropOnCell: (...args: any[]) => any;
  getScheduleBlocksForSlot: (...args: any[]) => any[];
  getProfessionalById: (...args: any[]) => any;
  getBlockColor: (...args: any[]) => any;
  setSelectedBlockDetails: (...args: any[]) => any;
  getScheduleBlockHeight: (...args: any[]) => any;
  getDefaultBlockTitle: (...args: any[]) => any;
  setSelectedAppointmentDetails: (...args: any[]) => any;
  hasDebt: (...args: any[]) => any;
  getAppointmentStyle: (...args: any[]) => any;
  getDurationHeight: (...args: any[]) => any;
  getAppointmentPatientName: (...args: any[]) => any;
  getProfessionalLabel: (...args: any[]) => any;
  getProfessionalInitials: (...args: any[]) => any;
  appointmentTypeLabel: (...args: any[]) => any;
  statusBadgeClass: (...args: any[]) => any;
  statusLabel: (...args: any[]) => any;
  openPatientFinance: (...args: any[]) => any;
  formatCurrency: (...args: any[]) => any;
  getPatientDebt: (...args: any[]) => any;
  setResizingId: (...args: any[]) => any;
  setResizeStartY: (...args: any[]) => any;
  setResizeStartDuration: (...args: any[]) => any;
  resizeCurrentDurationRef: any;
  currentTimePosition: number | null;
  now: Date;
  pad: (...args: any[]) => any;
}

export function WeekView(props: WeekViewProps) {
  const {
    days,
    hours,
    statusFilter,
    filteredAppointmentsByProfessional,
    clinicSettings,
    agendaScrollRef,
    handleAgendaTouchStart,
    handleAgendaTouchEnd,
    getHolidayInfo,
    isTodayDate,
    formatDateBr,
    getDayOccupation,
    slotDividerClass,
    timeColumnClass,
    isMobileAgenda,
    mobileView,
    isResizingRef,
    suppressNextClickRef,
    draggingId,
    draggingIdRef,
    setDraggingId,
    openNew,
    handleDropOnCell,
    getScheduleBlocksForSlot,
    getProfessionalById,
    getBlockColor,
    setSelectedBlockDetails,
    getScheduleBlockHeight,
    getDefaultBlockTitle,
    setSelectedAppointmentDetails,
    hasDebt,
    getAppointmentStyle,
    getDurationHeight,
    getAppointmentPatientName,
    getProfessionalLabel,
    getProfessionalInitials,
    appointmentTypeLabel,
    statusBadgeClass,
    statusLabel,
    openPatientFinance,
    formatCurrency,
    getPatientDebt,
    setResizingId,
    setResizeStartY,
    setResizeStartDuration,
    resizeCurrentDurationRef,
    currentTimePosition,
    now,
    pad,
  } = props;

  const resolveDropTimeFromPointer = (
    baseTime: string,
    event: React.DragEvent<HTMLDivElement>
  ) => {
    const baseIndex = hours.indexOf(baseTime);
    if (baseIndex < 0) return baseTime;

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.height) return baseTime;

    // Agendamentos com duração maior que 15 min transbordam visualmente
    // sobre as células seguintes. Ao mover apenas um slot, o drop pode
    // continuar chegando à célula de origem. Nesse caso, usamos a posição
    // real do ponteiro para descobrir em qual linha de 15 min ele foi solto.
    const slotOffset = Math.floor((event.clientY - rect.top) / rect.height);
    if (slotOffset === 0) return baseTime;

    const targetIndex = baseIndex + slotOffset;
    return hours[targetIndex] || baseTime;
  };

  return (
  <div className="flex-1 flex flex-col min-h-0 p-1.5 md:p-2.5">
    <div
      className="bg-white rounded-[16px] border border-[#d1e5e5] shadow-sm overflow-hidden flex flex-col min-h-0"
      onTouchStart={handleAgendaTouchStart}
      onTouchEnd={handleAgendaTouchEnd}
    >
      <div ref={agendaScrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div
          className="grid border-b border-[#d7e7e7] bg-white/95 backdrop-blur-md text-xs font-bold sticky top-0 z-30 shadow-sm"
          style={{
            gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-widest">Hora</div>

          {days.map((d) => {
            const holiday = getHolidayInfo(d.date);

            return (
              <div
                key={d.date}
                className={`text-center px-2 py-2 border-l border-[#d7e7e7] leading-tight ${
                  holiday
                    ? "bg-amber-50/90"
                    : isTodayDate(d.date)
                      ? "bg-[#e9fbfa]"
                      : "bg-white/70"
                }`}
                title={holiday ? holiday.name : undefined}
              >
                <div className="text-slate-700 font-semibold text-[11px]">
                  {d.label} {formatDateBr(d.date).slice(0, 5)}
                </div>

                {holiday && (
                  <div className="mx-auto mt-1 max-w-[150px] truncate rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                    Feriado • {holiday.scope === "municipal" ? "Araranguá" : "Brasil"}
                  </div>
                )}

                <div className={`mx-auto mt-1 w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                  holiday
                    ? "bg-white text-amber-800 ring-1 ring-amber-200"
                    : isTodayDate(d.date)
                      ? "bg-[#239d9a] text-white"
                      : "bg-[#e8f7f6] text-[#239d9a]"
                }`}>
                  {getDayOccupation(d.date).used}/{getDayOccupation(d.date).total} pacientes
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-0">
      {hours.map((h) => (
        <div
          key={h}
          className={`grid text-xs ${slotDividerClass(h)}`}
          style={{
            gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className={`px-2 py-1 text-[9px] tracking-tight md:px-3 md:py-1.5 md:text-[10px] ${timeColumnClass(h)}`}>{h}</div>

          {days.map((d) => {
            const ag = filteredAppointmentsByProfessional.filter((a) => {
              const sameSlot = a.date === d.date && a.start_time === h;

              if (!sameSlot) return false;

              if (statusFilter === "todos") return true;

              return (a.status || "agendado") === statusFilter;
            });

            return (
              <div
                key={d.date + h}
                className={`border-l border-[#dbe9e9] cursor-pointer relative transition-colors min-w-0 overflow-visible group touch-manipulation ${isMobileAgenda && mobileView === "day" ? "min-h-[28px]" : "min-h-[28px]"} ${
                  getHolidayInfo(d.date)
                    ? "bg-amber-50/30 hover:bg-amber-50/60"
                    : "hover:bg-[#fbffff]"
                }`}
                onClick={(e) => {
                  if (isResizingRef.current || suppressNextClickRef.current || draggingId) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }

                  openNew(d.date, h);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const resolvedTime = resolveDropTimeFromPointer(h, e);
                  handleDropOnCell(d.date, resolvedTime);
                }}
              >
                {getScheduleBlocksForSlot(d.date, h).map((block) => {
                  const blockProfessional = getProfessionalById(block.professional_id);
                  const blockColor = block.color || getBlockColor(block.block_type);

                  return (
                    <div
                      key={block.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlockDetails(block);
                      }}
                      className="absolute left-[3px] right-[3px] top-0.5 z-[2] overflow-hidden rounded-lg border border-slate-300/30 px-1.5 py-0.5 text-[8px] text-white cursor-pointer opacity-70 shadow-sm md:left-[5px] md:right-[5px] md:px-2 md:py-1 md:text-[9px]"
                      style={{
                        height: `${getScheduleBlockHeight(block)}px`,
                        backgroundColor: blockColor,
                        
                      }}
                      title="Horário bloqueado. Clique para ver detalhes."
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/30" />
                      <div className="pl-1 font-semibold uppercase tracking-wide leading-tight truncate text-[9px]">
                        {block.title || getDefaultBlockTitle(block.block_type)}
                      </div>
                      <div className="mt-0.5 pl-1 text-[8px] font-bold opacity-90 truncate">
                        {block.all_day
                          ? "Dia inteiro"
                          : `${block.start_time} - ${block.end_time}`}
                      </div>
                      <div className="mt-0.5 pl-1 text-[7px] font-bold opacity-80 truncate">
                        {blockProfessional?.name || "Todos os profissionais"}
                      </div>
                    </div>
                  );
                })}

                {ag.map((a, index) => {
                  const overlapCount = Math.max(1, ag.length);
                  const widthPercent = 100 / overlapCount;
                  const leftPercent = index * widthPercent;

                  return (
                  <div
                    key={a.id}
                    draggable={!isMobileAgenda}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      if (isMobileAgenda) return;
                      suppressNextClickRef.current = true;
                      draggingIdRef.current = a.id;
                      setDraggingId(a.id);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      // Não limpamos a ref aqui: o drop pode estar concluindo uma
                      // atualização assíncrona. handleDropOnCell faz a limpeza.
                      setDraggingId(null);
                      window.setTimeout(() => {
                        suppressNextClickRef.current = false;
                      }, 250);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();

                      if (isResizingRef.current || suppressNextClickRef.current || draggingId) {
                        e.preventDefault();
                        return;
                      }

                      setSelectedAppointmentDetails(a);
                    }}
                    className={`${
                      hasDebt(a.patient_id)
                        ? "ring-1 ring-amber-200"
                        : ""
                    } absolute top-0.5 z-[1] overflow-hidden text-white text-[9px] px-1.5 py-0.5 rounded-[8px] cursor-pointer border border-white/20 shadow-sm touch-manipulation active:scale-[0.99] md:text-[10px] md:px-2 md:py-1 md:rounded-[9px]`}
                    style={{
                      ...getAppointmentStyle(a),
                      height: `${getDurationHeight(a.duration || 30)}px`,
                      left: isMobileAgenda ? `calc(${leftPercent}% + 3px)` : `calc(${leftPercent}% + 5px)`,
                      width: isMobileAgenda ? `calc(${widthPercent}% - 6px)` : `calc(${widthPercent}% - 10px)`,
                    }}
                    title={isMobileAgenda ? "Toque para ver detalhes." : "Clique para ver detalhes. Arraste para remarcar. Use a barra inferior para alterar a duração."}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/30" />
                    <div className="flex items-start justify-between gap-1 pl-1">
                      <div className="min-w-0">
                        <div className="truncate pr-1 text-[10px] font-semibold leading-tight tracking-tight md:text-[12px]">
                          {getAppointmentPatientName(a)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-white/15 px-1 py-0.5 text-[6px] font-semibold leading-none text-white/90 md:px-1.5 md:text-[7px]">
                        {a.start_time}
                      </span>
                    </div>

                    {a.professional_id && (
                      <div className="mt-0.5 hidden items-center gap-1 truncate pl-1 pr-1 text-[7px] font-semibold leading-tight opacity-70 md:flex">
                        <span
                          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[6px] font-semibold text-white ring-0"
                          title={getProfessionalLabel(a.professional_id)}
                        >
                          {getProfessionalInitials(getProfessionalById(a.professional_id)?.name)}
                        </span>
                        <span className="truncate">
                          {getProfessionalLabel(a.professional_id)}
                        </span>
                      </div>
                    )}

                    <div className="mt-1 hidden items-center gap-0.5 flex-nowrap overflow-hidden pl-1 md:flex">
                      <span
                        className="shrink-0 rounded-md bg-white/85 px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-tight text-slate-700 whitespace-nowrap leading-none ring-1 ring-white/70"
                        title="Tipo do agendamento"
                      >
                        {appointmentTypeLabel(a)}
                      </span>

                      {a.type !== "compromisso" && (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-tight whitespace-nowrap leading-none ${statusBadgeClass(
                            a.status
                          )}`}
                        >
                          {statusLabel(a.status)}
                        </span>
                      )}

                      {a.reminder_enabled && !a.reminder_sent_at && (
                        <span
                          className="shrink-0 rounded-md bg-yellow-50 px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-tight text-yellow-700 whitespace-nowrap leading-none ring-1 ring-yellow-200/70"
                          title={`Lembrete pendente: ${a.reminder_before_hours || 24}h antes`}
                        >
                          Lemb.
                        </span>
                      )}

                      {a.reminder_sent_at && (
                        <span
                          className="shrink-0 rounded-md bg-green-50 px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-tight text-green-700 whitespace-nowrap leading-none ring-1 ring-green-200/70"
                          title="Lembrete enviado"
                        >
                          Avisado
                        </span>
                      )}

                      {hasDebt(a.patient_id) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPatientFinance(a.patient_id);
                          }}
                          className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[6px] font-semibold text-amber-700 whitespace-nowrap leading-none ring-1 ring-amber-200/70 hover:bg-amber-100"
                          title={`Abrir financeiro do paciente. Débito: ${formatCurrency(
                            getPatientDebt(a.patient_id)
                          )}`}
                        >
                          💰
                        </button>
                      )}
                    </div>

                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        isResizingRef.current = true;
                        suppressNextClickRef.current = true;
                        setSelectedAppointmentDetails(null);
                        setResizingId(a.id);
                        setResizeStartY(e.clientY);
                        setResizeStartDuration(Number(a.duration || 30));
                        resizeCurrentDurationRef.current = Number(a.duration || 30);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize rounded-b-md bg-black/5 hover:bg-white/20"
                      title="Arraste para aumentar ou diminuir a duração"
                    />
                  </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}

          {currentTimePosition !== null && (
            <div
              className="pointer-events-none absolute left-[70px] right-0 z-[9999] border-t-2 border-[#239d9a]"
              style={{ top: `${currentTimePosition}px` }}
            >
              <span className="absolute -top-3 left-2 rounded-full bg-[#239d9a] px-2 py-0.5 text-[9px] font-semibold text-white">
                agora {pad(now.getHours())}:{pad(now.getMinutes())}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
