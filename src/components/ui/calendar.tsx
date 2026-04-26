"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Calendar({
  className,
  onSelect,
  selected,
  onDayDrop,
}: {
  className?: string;
  onSelect?: (date: Date) => void;
  selected?: Date;
  onDayDrop?: (date: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = [];
  const totalDays = daysInMonth(currentMonth);
  const firstDay = firstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
    const isSelected = selected && date.toDateString() === selected.toDateString();
    const isToday = date.toDateString() === new Date().toDateString();

    days.push(
      <Button
        key={d}
        variant={isSelected ? "default" : "ghost"}
        className={cn(
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100",
          isSelected && "bg-red-800 text-white hover:bg-red-900 hover:text-white rounded-full",
          isToday && !isSelected && "bg-red-50 text-red-800 font-bold border border-red-200 rounded-full",
          !isSelected && !isToday && "hover:bg-slate-100 rounded-full"
        )}
        onClick={() => onSelect?.(date)}
        onDragOver={
          onDayDrop
            ? (e) => {
                e.preventDefault();
              }
            : undefined
        }
        onDrop={
          onDayDrop
            ? (e) => {
                e.preventDefault();
                onDayDrop(date);
              }
            : undefined
        }
      >
        {d}
      </Button>
    );
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className={cn("p-4 bg-white rounded-2xl shadow-sm border border-slate-100", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={handlePrevMonth} type="button">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={handleNextMonth} type="button">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="text-[10px] font-black text-slate-400 uppercase">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
}
