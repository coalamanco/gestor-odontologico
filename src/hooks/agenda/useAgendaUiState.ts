import { useRef, useState } from "react";

export function useAgendaUiState() {
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedBlockDetails, setSelectedBlockDetails] = useState<any | null>(null);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any | null>(null);

  const [blockForm, setBlockForm] = useState({
    id: "",
    professional_id: "",
    block_type: "bloqueio",
    title: "Horário bloqueado",
    description: "",
    date: "",
    start_time: "12:00",
    end_time: "13:00",
    all_day: false,
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedAgendaProfessionalId, setSelectedAgendaProfessionalId] = useState<string>("");

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartDuration, setResizeStartDuration] = useState(30);
  const resizeCurrentDurationRef = useRef(30);
  const isResizingRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  return {
    showBlockModal,
    setShowBlockModal,
    selectedBlockDetails,
    setSelectedBlockDetails,
    selectedAppointmentDetails,
    setSelectedAppointmentDetails,
    blockForm,
    setBlockForm,
    draggingId,
    setDraggingId,
    draggingIdRef,
    statusFilter,
    setStatusFilter,
    selectedAgendaProfessionalId,
    setSelectedAgendaProfessionalId,
    resizingId,
    setResizingId,
    resizeStartY,
    setResizeStartY,
    resizeStartDuration,
    setResizeStartDuration,
    resizeCurrentDurationRef,
    isResizingRef,
    suppressNextClickRef,
  };
}
