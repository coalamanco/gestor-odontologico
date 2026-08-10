"use client";

import React from "react";
import { WeekView, type WeekViewProps } from "@/components/agenda/WeekView";

type DayViewProps = Omit<WeekViewProps, "days" | "mobileView"> & {
  day: any;
};

/**
 * Visualização diária da agenda.
 *
 * A grade diária reutiliza exatamente o mesmo motor visual da visualização
 * semanal. Isso evita duplicar regras de drag, resize, bloqueios e badges.
 */
export function DayView({ day, ...props }: DayViewProps) {
  return <WeekView {...props} days={[day]} mobileView="day" />;
}
