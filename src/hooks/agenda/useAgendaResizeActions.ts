import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { SLOT_HEIGHT, timeToMinutes } from "@/lib/agenda/agendaUtils";

type UseAgendaResizeActionsParams = {
  resizingId: string | null;
  setResizingId: (value: string | null) => void;
  resizeStartY: number;
  resizeStartDuration: number;
  resizeCurrentDurationRef: MutableRefObject<number>;
  isResizingRef: MutableRefObject<boolean>;
  suppressNextClickRef: MutableRefObject<boolean>;
  appointments: any[];
  setAppointments: Dispatch<SetStateAction<any[]>>;
  clinicSettings: any;
  isSlotAvailable: (
    targetDate: string,
    targetTime: string,
    duration: number,
    excludeId?: string | null,
    professionalId?: string | null
  ) => boolean;
  loadData: () => Promise<any>;
  updateAppointment: (appointmentId: string, updates: any) => Promise<any>;
};

export function useAgendaResizeActions({
  resizingId,
  setResizingId,
  resizeStartY,
  resizeStartDuration,
  resizeCurrentDurationRef,
  isResizingRef,
  suppressNextClickRef,
  appointments,
  setAppointments,
  clinicSettings,
  isSlotAvailable,
  loadData,
  updateAppointment,
}: UseAgendaResizeActionsParams) {
  useEffect(() => {
    if (!resizingId) return;

    const finishResize = async () => {
      const currentResizeId = resizingId;
      const appt = appointments.find((a) => a.id === currentResizeId);
      const finalDuration = Math.max(
        15,
        Number(resizeCurrentDurationRef.current || appt?.duration || 30)
      );

      suppressNextClickRef.current = true;

      if (!appt) {
        setResizingId(null);
        isResizingRef.current = false;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 400);
        return;
      }

      if (
        !isSlotAvailable(
          appt.date,
          appt.start_time,
          finalDuration,
          currentResizeId,
          appt.professional_id
        )
      ) {
        await loadData();
        alert("Não foi possível ajustar: conflito com outro horário.");
        setResizingId(null);
        isResizingRef.current = false;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 400);
        return;
      }

      setResizingId(null);
      isResizingRef.current = false;

      await updateAppointment(currentResizeId, { duration: finalDuration });

      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 400);
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      const deltaY = e.clientY - resizeStartY;

      if (Math.abs(deltaY) > 2) {
        suppressNextClickRef.current = true;
      }

      const slotDelta = Math.round(deltaY / SLOT_HEIGHT);
      let nextDuration = Math.max(15, resizeStartDuration + slotDelta * 15);

      const appt = appointments.find((a) => a.id === resizingId);
      if (!appt) return;

      const start = timeToMinutes(appt.start_time);
      const maxDuration = clinicSettings.end_hour * 60 - start;
      nextDuration = Math.min(nextDuration, maxDuration);

      resizeCurrentDurationRef.current = nextDuration;

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === resizingId ? { ...a, duration: nextDuration } : a
        )
      );
    };

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      void finishResize();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    resizingId,
    resizeStartY,
    resizeStartDuration,
    appointments,
    clinicSettings.end_hour,
  ]);
}
