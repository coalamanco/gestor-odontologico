import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function normalizeBrazilPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) return digits;

  return `55${digits}`;
}

function getTodayBrazil() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    })
  );
}

function buildBirthdayMessage(name: string) {
  return (
    `Olá, ${name}! 🎉\n\n` +
    `A equipe do consultório deseja um feliz aniversário, com muita saúde, alegria e muitos motivos para sorrir.\n\n` +
    `Parabéns pelo seu dia! 🦷✨`
  );
}

async function sendWhatsapp(phone: string, message: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID || "";
  const token = process.env.ZAPI_TOKEN || "";
  const clientToken = process.env.ZAPI_CLIENT_TOKEN || "";

  if (!instanceId || !token || !clientToken) {
    throw new Error("Z-API não configurada.");
  }

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    }
  );

  const result = await response.text();

  if (!response.ok) {
    throw new Error(result || "Erro ao enviar WhatsApp.");
  }

  return result;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = getTodayBrazil();

    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const currentYear = today.getFullYear();

    const { data: patients, error } = await supabase
      .from("patients")
      .select("*");

    if (error) {
      throw error;
    }

    const birthdayPatients = (patients || []).filter((patient: any) => {
      if (!patient.birth_date) return false;

      const birth = String(patient.birth_date);

      return (
        birth.slice(5, 7) === month &&
        birth.slice(8, 10) === day
      );
    });

    const sent: any[] = [];
    const skipped: any[] = [];
    const failed: any[] = [];

    for (const patient of birthdayPatients) {
      const phone = normalizeBrazilPhone(patient.phone || "");

      if (!phone) {
        skipped.push({
          patient: patient.name,
          reason: "Sem telefone",
        });

        continue;
      }

      const { data: existing } = await supabase
        .from("birthday_messages")
        .select("id")
        .eq("patient_id", patient.id)
        .eq("sent_year", currentYear)
        .maybeSingle();

      if (existing) {
        skipped.push({
          patient: patient.name,
          reason: "Já enviado este ano",
        });

        continue;
      }

      const message = buildBirthdayMessage(
        patient.name || "paciente"
      );

      try {
        await sendWhatsapp(phone, message);

        await supabase.from("birthday_messages").insert({
          patient_id: patient.id,
          patient_name: patient.name,
          phone,
          message,
          sent_year: currentYear,
        });

        sent.push({
          patient: patient.name,
          phone,
        });
      } catch (error: any) {
        failed.push({
          patient: patient.name,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      totalBirthdays: birthdayPatients.length,
      sent,
      skipped,
      failed,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Erro interno.",
      },
      {
        status: 500,
      }
    );
  }
}