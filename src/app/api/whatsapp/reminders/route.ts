import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function normalizeBrazilPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function formatDateBr(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function buildMessage(template: string, data: any) {
  return template
    .replaceAll("{{nome}}", data.patient_name || "paciente")
    .replaceAll("{{data}}", formatDateBr(data.date))
    .replaceAll("{{hora}}", data.start_time || "")
    .replaceAll("{{procedimento}}", data.title || "consulta")
    .replaceAll("{{valor}}", "");
}

async function sendZapiMessage(phone: string, message: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID || "";
  const token = process.env.ZAPI_TOKEN || "";
  const clientToken = process.env.ZAPI_CLIENT_TOKEN || "";

  if (!instanceId || !token || !clientToken) {
    throw new Error("Z-API não configurada completamente.");
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
        phone: normalizeBrazilPhone(phone),
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
        : result?.error || "Erro ao enviar WhatsApp."
    );
  }

  return result;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase não configurado.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    const today = now.toISOString().slice(0, 10);

    const limitDate = new Date(now);
    limitDate.setDate(limitDate.getDate() + 5);

    const limitDateString = limitDate.toISOString().slice(0, 10);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("type", "consulta")
      .eq("reminder_enabled", true)
      .is("reminder_sent_at", null)
      .gte("date", today)
      .lte("date", limitDateString);

    if (appointmentsError) {
      throw appointmentsError;
    }

    const { data: templates } = await supabase
      .from("message_templates")
      .select("type, content, active")
      .eq("active", true);

    const template =
      templates?.find((item) => item.type === "lembrete")?.content ||
      templates?.find((item) => item.type === "confirmacao")?.content ||
      "Olá {{nome}}, lembrando da sua consulta no dia {{data}} às {{hora}}.";

    const patientIds = Array.from(
      new Set(
        (appointments || [])
          .map((item: any) => item.patient_id)
          .filter(Boolean)
      )
    );

    const { data: patients } = await supabase
      .from("patients")
      .select("id, name, phone")
      .in(
        "id",
        patientIds.length
          ? patientIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    const patientMap = new Map(
      (patients || []).map((p: any) => [p.id, p])
    );

    const sent: any[] = [];
    const skipped: any[] = [];
    const failed: any[] = [];

    for (const appointment of appointments || []) {
      const reminderBeforeHours = Number(
        appointment.reminder_before_hours || 24
      );

      const appointmentDateTime = new Date(
        `${appointment.date}T${appointment.start_time || "00:00"}:00`
      );

      const sendAt = new Date(appointmentDateTime);

      sendAt.setHours(sendAt.getHours() - reminderBeforeHours);

      if (now < sendAt) {
        skipped.push({
          id: appointment.id,
          reason: "Ainda não chegou o horário do lembrete.",
        });

        continue;
      }

      if (appointmentDateTime <= now) {
        skipped.push({
          id: appointment.id,
          reason: "Consulta já passou.",
        });

        continue;
      }

      const patient = patientMap.get(appointment.patient_id);

      const phone = normalizeBrazilPhone(patient?.phone || "");

      if (!phone) {
        skipped.push({
          id: appointment.id,
          reason: "Paciente sem telefone.",
        });

        continue;
      }

      const message = buildMessage(template, {
        ...appointment,
        patient_name:
          patient?.name ||
          appointment.patient_name ||
          "paciente",
      });

      try {
        const result = await sendZapiMessage(phone, message);

        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", appointment.id);

        if (updateError) {
          throw updateError;
        }

        sent.push({
          id: appointment.id,
          patient: patient?.name,
          phone,
          result,
        });
      } catch (error: any) {
        failed.push({
          id: appointment.id,
          patient: patient?.name,
          error: error?.message || "Erro desconhecido.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: appointments?.length || 0,
      sent,
      skipped,
      failed,
    });
  } catch (error: any) {
    console.error("Erro no cron de lembretes:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message || "Erro ao processar lembretes.",
      },
      { status: 500 }
    );
  }
}