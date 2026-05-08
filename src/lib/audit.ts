import { supabase } from "@/lib/supabase";

type AuditInput = {
  action: string;
  module: string;
  record_id?: string | null;
  patient_id?: string | null;
  description?: string | null;
  metadata?: Record<string, any>;
};

export async function createAuditLog(input: AuditInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      action: input.action,
      module: input.module,
      record_id: input.record_id || null,
      patient_id: input.patient_id || null,
      description: input.description || null,
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.warn("Erro ao registrar auditoria:", error);
  }
}