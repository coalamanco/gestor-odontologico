import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Patient = {
  id: string;
  name: string | null;
  phone: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBrazilPhone(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) return digits;

  return `55${digits}`;
}

function firstName(name: string | null | undefined) {
  const clean = String(name || "").trim();

  if (!clean) return "paciente";

  return clean.split(/\s+/)[0] || clean;
}

function buildMessage(template: string, patient: Patient) {
  return template
    .replaceAll("{{nome}}", firstName(patient.name))
    .replaceAll("{{nome_completo}}", patient.name || "paciente");
}

async function sendZapiText(phone: string, message: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID || "";
  const token = process.env.ZAPI_TOKEN || "";
  const clientToken = process.env.ZAPI_CLIENT_TOKEN || "";

  if (!instanceId || !token) {
    throw new Error("Z-API não configurada no servidor.");
  }

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    }
  );

  const text = await response.text();

  let result: any = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof result === "string"
        ? result
        : result?.error || result?.message || "Erro ao enviar WhatsApp."
    );
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const { title, message, dryRun, confirmSend } = await request.json();

    const safeTitle = String(title || "").trim();
    const safeMessage = String(message || "").trim();

    if (safeTitle.length < 3) {
      return NextResponse.json(
        { error: "Informe um título para o comunicado." },
        { status: 400 }
      );
    }

    if (safeMessage.length < 10) {
      return NextResponse.json(
        { error: "A mensagem precisa ter pelo menos 10 caracteres." },
        { status: 400 }
      );
    }

    if (!dryRun && !confirmSend) {
      return NextResponse.json(
        { error: "Confirmação de envio não informada." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase Service Role não configurado no servidor." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: patients, error } = await supabase
      .from("patients")
      .select("id, name, phone")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao buscar pacientes." },
        { status: 500 }
      );
    }

    const allPatients = ((patients || []) as Patient[]).filter((patient) =>
      Boolean(patient.id)
    );

    const withPhone = allPatients
      .map((patient) => ({
        ...patient,
        normalizedPhone: normalizeBrazilPhone(patient.phone),
      }))
      .filter((patient) => Boolean(patient.normalizedPhone));

    const withoutPhone = allPatients.length - withPhone.length;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        totalPatients: allPatients.length,
        totalWithPhone: withPhone.length,
        totalWithoutPhone: withoutPhone,
      });
    }

    const results: Array<{
      patientId: string;
      name: string;
      phone?: string;
      ok: boolean;
      error?: string;
    }> = [];

    let sent = 0;
    let failed = 0;
    const skipped = withoutPhone;

    for (const patient of withPhone) {
      const phone = patient.normalizedPhone;
      const personalizedMessage = buildMessage(safeMessage, patient);

      try {
        await sendZapiText(phone, personalizedMessage);

        sent += 1;
        results.push({
          patientId: patient.id,
          name: patient.name || "Paciente",
          phone,
          ok: true,
        });
      } catch (error: any) {
        failed += 1;
        results.push({
          patientId: patient.id,
          name: patient.name || "Paciente",
          phone,
          ok: false,
          error: error?.message || "Erro ao enviar mensagem.",
        });
      }

      await sleep(2500);
    }

    try {
      await supabase.from("crm_campaign_logs").insert({
        title: safeTitle,
        message: safeMessage,
        target: "todos_pacientes",
        total_patients: allPatients.length,
        total_with_phone: withPhone.length,
        total_without_phone: withoutPhone,
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Se a tabela de logs não existir, o envio continua funcionando.
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      skipped,
      totalPatients: allPatients.length,
      totalWithPhone: withPhone.length,
      totalWithoutPhone: withoutPhone,
      results: results.slice(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Erro inesperado ao enviar comunicado.",
      },
      { status: 500 }
    );
  }
}
