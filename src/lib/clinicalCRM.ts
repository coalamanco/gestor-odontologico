export type ClinicalFollowupPlan = {
    type: string;
    origin: string;
    daysAfter: number;
  };
  
  type CreateClinicalFollowupsArgs = {
    supabase: any;
    patientId: string;
    protocolId: string;
    baseDate?: string | null;
    sourceNoteId?: string | null;
  };
  
  const FOLLOWUP_PLANS_BY_PROTOCOL: Record<string, ClinicalFollowupPlan[]> = {
    extracao_simples: [
      { type: "Revisão pós-exodontia", origin: "Extração simples", daysAfter: 7 },
    ],
  
    extracao_infectada: [
      { type: "Revisão pós-exodontia", origin: "Extração com infecção / abscesso", daysAfter: 7 },
      { type: "Controle de infecção", origin: "Extração com infecção / abscesso", daysAfter: 14 },
    ],
  
    implante_unitario: [
      { type: "Revisão pós-implante", origin: "Implante unitário", daysAfter: 7 },
      { type: "Controle de cicatrização", origin: "Implante unitário", daysAfter: 30 },
      { type: "Acompanhamento de osseointegração", origin: "Implante unitário", daysAfter: 90 },
    ],
  
    implantes_multiplos: [
      { type: "Revisão pós-cirúrgica", origin: "Implantes múltiplos / cirurgia extensa", daysAfter: 7 },
      { type: "Controle de cicatrização", origin: "Implantes múltiplos / cirurgia extensa", daysAfter: 30 },
      { type: "Acompanhamento de osseointegração", origin: "Implantes múltiplos / cirurgia extensa", daysAfter: 90 },
    ],
  
    enxerto_osseo: [
      { type: "Revisão pós-enxerto", origin: "Enxerto ósseo / biomaterial", daysAfter: 7 },
      { type: "Controle de cicatrização", origin: "Enxerto ósseo / biomaterial", daysAfter: 30 },
      { type: "Acompanhamento do enxerto", origin: "Enxerto ósseo / biomaterial", daysAfter: 90 },
    ],
  
    endodontia_dor: [
      { type: "Controle de dor/endodontia", origin: "Endodontia com dor", daysAfter: 15 },
    ],
  
    periodontal_gengivite: [
      { type: "Controle periodontal", origin: "Pós-raspagem / gengivite", daysAfter: 30 },
    ],
  
    dor_leve: [
      { type: "Checagem pós-atendimento", origin: "Dor leve / procedimento simples", daysAfter: 7 },
    ],
  };
  
  const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);
  
  const addDays = (dateText: string | null | undefined, days: number) => {
    const base = dateText ? new Date(`${dateText}T12:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    return toDateOnly(base);
  };
  
  export const getClinicalFollowupPlans = (protocolId?: string | null) => {
    if (!protocolId) return [];
    return FOLLOWUP_PLANS_BY_PROTOCOL[protocolId] || [];
  };
  
  export const createClinicalFollowupsForProtocol = async ({
    supabase,
    patientId,
    protocolId,
    baseDate,
  }: CreateClinicalFollowupsArgs) => {
    const plans = getClinicalFollowupPlans(protocolId);
  
    if (!patientId || plans.length === 0) {
      return { created: 0 };
    }
  
    let created = 0;
  
    for (const plan of plans) {
      const dueDate = addDays(baseDate, plan.daysAfter);
  
      const { data: existing, error: existingError } = await supabase
        .from("clinical_followups")
        .select("id")
        .eq("patient_id", patientId)
        .eq("type", plan.type)
        .eq("origin", plan.origin)
        .eq("due_date", dueDate)
        .neq("status", "cancelado")
        .limit(1);
  
      if (existingError) throw existingError;
  
      if (existing && existing.length > 0) {
        continue;
      }
  
      const { error: insertError } = await supabase.from("clinical_followups").insert({
        patient_id: patientId,
        type: plan.type,
        origin: plan.origin,
        due_date: dueDate,
        status: "pendente",
      });
  
      if (insertError) throw insertError;
  
      created += 1;
    }
  
    return { created };
  };
  