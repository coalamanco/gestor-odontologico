"use client";

import { supabase } from "@/lib/supabase";
import {
  addMinutesToTime,
  formatDate,
  getBlockColor,
  getDefaultBlockTitle,
  pad,
  timeToMinutes,
} from "@/lib/agenda/agendaUtils";

export type AgendaBlockForm = {
  id: string;
  professional_id: string;
  block_type: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
};

type ClinicSettings = {
  start_hour: number;
  end_hour: number;
};

type Params = {
  blockForm: AgendaBlockForm;
  setBlockForm: React.Dispatch<React.SetStateAction<AgendaBlockForm>>;
  setShowBlockModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedBlockDetails: React.Dispatch<React.SetStateAction<any | null>>;
  selectedAgendaProfessionalId: string;
  clinicSettings: ClinicSettings;
  loadData: () => Promise<void>;
};

export function useAgendaBlockActions({
  blockForm,
  setBlockForm,
  setShowBlockModal,
  setSelectedBlockDetails,
  selectedAgendaProfessionalId,
  clinicSettings,
  loadData,
}: Params) {
  const resetBlockForm = () => {
    const defaultStart = `${pad(clinicSettings.start_hour)}:00`;
    setBlockForm({
      id: "",
      professional_id: selectedAgendaProfessionalId || "",
      block_type: "bloqueio",
      title: "Horário bloqueado",
      description: "",
      date: "",
      start_time: defaultStart,
      end_time: addMinutesToTime(defaultStart, 60),
      all_day: false,
    });
  };

  const openNewBlock = (selectedDate?: string, selectedTime?: string) => {
    const nextStart = selectedTime || `${pad(clinicSettings.start_hour)}:00`;
    setBlockForm({
      id: "",
      professional_id: selectedAgendaProfessionalId || "",
      block_type: "bloqueio",
      title: "Horário bloqueado",
      description: "",
      date: selectedDate || formatDate(new Date()),
      start_time: nextStart,
      end_time: addMinutesToTime(nextStart, 60),
      all_day: false,
    });
    setShowBlockModal(true);
  };

  const saveScheduleBlock = async () => {
    if (!blockForm.date) {
      alert("Informe a data do bloqueio.");
      return;
    }

    const title = blockForm.title.trim() || getDefaultBlockTitle(blockForm.block_type);
    const startTime = blockForm.all_day
      ? `${pad(clinicSettings.start_hour)}:00`
      : blockForm.start_time;
    const endTime = blockForm.all_day
      ? `${pad(clinicSettings.end_hour)}:00`
      : blockForm.end_time;

    if (!blockForm.all_day && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      alert("O horário final precisa ser maior que o horário inicial.");
      return;
    }

    const payload = {
      professional_id: blockForm.professional_id || null,
      title,
      description: blockForm.description.trim() || null,
      block_type: blockForm.block_type,
      date: blockForm.date,
      start_time: startTime,
      end_time: endTime,
      all_day: blockForm.all_day,
      color: getBlockColor(blockForm.block_type),
    };

    const query = blockForm.id
      ? supabase.from("schedule_blocks").update(payload).eq("id", blockForm.id)
      : supabase.from("schedule_blocks").insert([payload]);

    const { error } = await query;

    if (error) {
      alert("Erro ao salvar bloqueio: " + error.message);
      return;
    }

    setShowBlockModal(false);
    resetBlockForm();
    await loadData();
  };

  const deleteScheduleBlock = async (blockId: string) => {
    const ok = window.confirm("Remover este bloqueio de horário?");
    if (!ok) return;

    const { error } = await supabase
      .from("schedule_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      alert("Erro ao remover bloqueio: " + error.message);
      return;
    }

    setSelectedBlockDetails(null);
    setShowBlockModal(false);
    await loadData();
  };

  const editScheduleBlock = (block: any) => {
    setSelectedBlockDetails(null);
    setBlockForm({
      id: block.id || "",
      professional_id: block.professional_id || "",
      block_type: block.block_type || "bloqueio",
      title: block.title || getDefaultBlockTitle(block.block_type),
      description: block.description || "",
      date: block.date || "",
      start_time: block.start_time || `${pad(clinicSettings.start_hour)}:00`,
      end_time:
        block.end_time ||
        addMinutesToTime(
          block.start_time || `${pad(clinicSettings.start_hour)}:00`,
          60
        ),
      all_day: block.all_day === true,
    });
    setShowBlockModal(true);
  };

  return {
    resetBlockForm,
    openNewBlock,
    saveScheduleBlock,
    deleteScheduleBlock,
    editScheduleBlock,
  };
}
