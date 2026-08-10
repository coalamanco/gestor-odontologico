"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SLOT_HEIGHT,
  addDays,
  formatDate,
  getWeekdayLabel,
  isTodayDate,
  pad,
  startOfWeek,
} from "@/lib/agenda/agendaUtils";

type ClinicSettingsLike = {
  start_hour: number;
  end_hour: number;
};

type UseAgendaNavigationParams = {
  clinicSettings: ClinicSettingsLike;
  interactionBlocked?: boolean;
};

export function useAgendaNavigation({
  clinicSettings,
  interactionBlocked = false,
}: UseAgendaNavigationParams) {
  const agendaScrollRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  const [now, setNow] = useState(new Date());
  const [weekBaseDate, setWeekBaseDate] = useState<Date>(new Date());
  const [mobileView, setMobileView] = useState<"day" | "week">("day");
  const [isMobileAgenda, setIsMobileAgenda] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [miniCalendarDate, setMiniCalendarDate] = useState<Date>(new Date());
  const [showMobileAgendaSheet, setShowMobileAgendaSheet] = useState(false);

  useEffect(() => {
    const updateMobileAgenda = () => {
      setIsMobileAgenda(window.innerWidth < 768);
    };

    updateMobileAgenda();
    window.addEventListener("resize", updateMobileAgenda);
    return () => window.removeEventListener("resize", updateMobileAgenda);
  }, []);

  const days = useMemo(() => {
    if (isMobileAgenda && mobileView === "day") {
      return [
        {
          date: formatDate(weekBaseDate),
          label: getWeekdayLabel(weekBaseDate),
          num: pad(weekBaseDate.getDate()),
        },
      ];
    }

    const start = startOfWeek(weekBaseDate);
    const labels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

    return Array.from({ length: 6 }).map((_, index) => {
      const date = addDays(start, index);
      return {
        date: formatDate(date),
        label: labels[index],
        num: pad(date.getDate()),
      };
    });
  }, [weekBaseDate, isMobileAgenda, mobileView]);

  const miniCalendarDays = useMemo(() => {
    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const startDate = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }).map((_, index) => {
      const current = addDays(startDate, index);
      return {
        date: current,
        dateKey: formatDate(current),
        day: current.getDate(),
        currentMonth: current.getMonth() === month,
        today: isTodayDate(formatDate(current)),
      };
    });
  }, [miniCalendarDate]);

  const selectMiniCalendarDay = (selectedDate: Date) => {
    setWeekBaseDate(selectedDate);
    setMiniCalendarDate(selectedDate);
    setShowMiniCalendar(false);
  };

  const goToPreviousDay = () => {
    setWeekBaseDate((previous) => addDays(previous, -1));
  };

  const goToNextDay = () => {
    setWeekBaseDate((previous) => addDays(previous, 1));
  };

  const handleAgendaTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileAgenda || mobileView !== "day") return;

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleAgendaTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileAgenda || mobileView !== "day" || interactionBlocked) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const elapsed = Date.now() - touchStartTimeRef.current;

    const isHorizontalSwipe =
      Math.abs(deltaX) > 70 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4 &&
      elapsed < 900;

    if (!isHorizontalSwipe) return;
    if (deltaX < 0) goToNextDay();
    else goToPreviousDay();
  };

  const hours = useMemo(() => {
    const result: string[] = [];
    for (let hour = clinicSettings.start_hour; hour < clinicSettings.end_hour; hour++) {
      for (const minute of [0, 15, 30, 45]) {
        result.push(`${pad(hour)}:${pad(minute)}`);
      }
    }
    return result;
  }, [clinicSettings.start_hour, clinicSettings.end_hour]);

  const currentTimePosition = useMemo(() => {
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = clinicSettings.start_hour * 60;
    const endMinutes = clinicSettings.end_hour * 60;

    if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null;
    return ((totalMinutes - startMinutes) / 15) * SLOT_HEIGHT;
  }, [now, clinicSettings.start_hour, clinicSettings.end_hour]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = agendaScrollRef.current;
    if (!container) return;

    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = clinicSettings.start_hour * 60;

    if (totalMinutes < startMinutes) {
      container.scrollTop = 0;
      return;
    }

    const position = ((totalMinutes - startMinutes) / 15) * SLOT_HEIGHT;
    container.scrollTop = Math.max(0, position - 160);
    // Intencionalmente roda quando o horário inicial muda / a grade é montada.
    // O marcador de hora atual continua sendo atualizado separadamente a cada minuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicSettings.start_hour]);

  return {
    agendaScrollRef,
    now,
    weekBaseDate,
    setWeekBaseDate,
    mobileView,
    setMobileView,
    isMobileAgenda,
    showMiniCalendar,
    setShowMiniCalendar,
    miniCalendarDate,
    setMiniCalendarDate,
    showMobileAgendaSheet,
    setShowMobileAgendaSheet,
    days,
    miniCalendarDays,
    selectMiniCalendarDay,
    goToPreviousDay,
    goToNextDay,
    handleAgendaTouchStart,
    handleAgendaTouchEnd,
    hours,
    currentTimePosition,
  };
}
