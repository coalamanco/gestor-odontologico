import type { Dispatch, MutableRefObject, SetStateAction } from "react";

type UseAgendaDragActionsParams = {
  draggingId: string | null;
  draggingIdRef: MutableRefObject<string | null>;
  setDraggingId: Dispatch<SetStateAction<string | null>>;
  appointments: any[];
  isSlotAvailable: (
    targetDate: string,
    targetTime: string,
    duration: number,
    excludeId?: string | null,
    professionalId?: string | null
  ) => boolean;
  updateAppointment: (appointmentId: string, updates: any) => Promise<any>;
  suppressNextClickRef: MutableRefObject<boolean>;
};

export function useAgendaDragActions({
  draggingId,
  draggingIdRef,
  setDraggingId,
  appointments,
  isSlotAvailable,
  updateAppointment,
  suppressNextClickRef,
}: UseAgendaDragActionsParams) {
  const clearDragging = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
  };

  const handleDropOnCell = async (targetDate: string, targetTime: string) => {
    // Usa a ref porque ela é atualizada de forma síncrona no dragStart.
    // O state do React pode ainda não ter sido aplicado no primeiro movimento.
    const appointmentId = draggingIdRef.current || draggingId;
    if (!appointmentId) return;

    const current = appointments.find((a) => a.id === appointmentId);
    if (!current) {
      clearDragging();
      return;
    }

    if (
      !isSlotAvailable(
        targetDate,
        targetTime,
        Number(current.duration || 30),
        appointmentId,
        current.professional_id
      )
    ) {
      alert("Esse horário está ocupado ou ultrapassa o fim do expediente.");
      clearDragging();
      return;
    }

    await updateAppointment(appointmentId, {
      date: targetDate,
      start_time: targetTime,
    });

    clearDragging();
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 250);
  };

  return { handleDropOnCell };
}
