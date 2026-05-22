import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Patient = {
  id: string;
  name: string | null;
  phone: string | null;
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_INTERVAL_MINUTES = 40;
const DEFAULT_DAILY_LIMIT = 120;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Service Role não configurado.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getScheduleDate(index: number) {
  const batchIndex = Math.floor(index / DEFAULT_BATCH_SIZE);

  const positionInsideBatch = index % DEFAULT_BATCH_SIZE;

  const minutesFromNow =
    batchIndex * DEFAULT_INTERVAL_MINUTES +
    positionInsideBatch * 2;

  return addMinutes(new Date(), minutesFromNow).toISOString();
}

export async function POST(request: Request) {
  try {
    const { title, message, dryRun, confirmSend } =
      await request.json();

    const safeTitle = String(title || "").trim();

    const safeMessage = String(message || "").trim();

    if (safeTitle.length < 3) {
      return NextResponse.json(
        {
          error: "Informe um título.",
        },
        {
          status: 400,
        }
      );
    }

    if (safeMessage.length < 10) {
      return NextResponse.json(
        {
          error: "Mensagem muito curta.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: patients, error } = await supabase
      .from("patients")
      .select("id, name, phone")
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    const allPatients = ((patients || []) as Patient[]).filter(
      (patient) => Boolean(patient.id)
    );

    const withPhone = allPatients
      .map((patient) => ({
        ...patient,
        normalizedPhone: normalizeBrazilPhone(patient.phone),
      }))
      .filter((patient) => Boolean(patient.normalizedPhone));

    const withoutPhone =
      allPatients.length - withPhone.length;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        totalPatients: allPatients.length,
        totalWithPhone: withPhone.length,
        totalWithoutPhone: withoutPhone,
        batchSize: DEFAULT_BATCH_SIZE,
        intervalMinutes: DEFAULT_INTERVAL_MINUTES,
      });
    }

    if (!confirmSend) {
      return NextResponse.json(
        {
          error: "Confirmação obrigatória.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: activeCampaigns } = await supabase
      .from("crm_whatsapp_campaigns")
      .select("*")
      .in("status", [
        "agendada",
        "em_andamento",
      ]);

    if ((activeCampaigns || []).length > 0) {
      return NextResponse.json(
        {
          error:
            "Já existe uma campanha em andamento.",
        },
        {
          status: 409,
        }
      );
    }

    const { data: campaign, error: campaignError } =
      await supabase
        .from("crm_whatsapp_campaigns")
        .insert({
          title: safeTitle,
          message_template: safeMessage,
          target: "todos_pacientes",
          status: "agendada",
          total_patients: allPatients.length,
          total_with_phone: withPhone.length,
          total_without_phone: withoutPhone,
          batch_size: DEFAULT_BATCH_SIZE,
          interval_minutes:
            DEFAULT_INTERVAL_MINUTES,
          daily_limit: DEFAULT_DAILY_LIMIT,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

    if (campaignError) {
      throw new Error(campaignError.message);
    }

    const queueRows = withPhone.map(
      (patient, index) => ({
        campaign_id: campaign.id,
        patient_id: patient.id,
        patient_name: patient.name || "Paciente",
        phone: patient.normalizedPhone,
        message: buildMessage(
          safeMessage,
          patient
        ),
        status: "pendente",
        scheduled_for: getScheduleDate(index),
        attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    const chunkSize = 500;

    for (
      let index = 0;
      index < queueRows.length;
      index += chunkSize
    ) {
      const chunk = queueRows.slice(
        index,
        index + chunkSize
      );

      const { error: insertError } =
        await supabase
          .from(
            "crm_whatsapp_campaign_messages"
          )
          .insert(chunk);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      campaignId: campaign.id,
      totalPatients: allPatients.length,
      totalWithPhone: withPhone.length,
      totalWithoutPhone: withoutPhone,
      batchSize: DEFAULT_BATCH_SIZE,
      intervalMinutes:
        DEFAULT_INTERVAL_MINUTES,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro ao criar campanha.",
      },
      {
        status: 500,
      }
    );
  }
}