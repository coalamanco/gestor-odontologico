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
        : result?.error || result?.message || "Erro ao enviar WhatsApp."
    );
  }

  return result;
}

function getBrazilNow() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "00";

  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
      "minute"
    )}:${get("second")}-03:00`
  );
}

function createBrazilDate(date: string, time: string) {
  const safeTime = time?.length === 5 ? `${time}:00` : time || "00:00:00";
  return new Date(`${date}T${safeTime}-03:00`);
}

function formatDateKey(date: Date) {
  return date.toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
}

function addDaysBrazil(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffInMinutes(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

    const now = getBrazilNow();
    const today = formatDateKey(now);

    /*
      REGRA DO CRON DE LEMBRETES:

      - Este endpoint envia lembretes automáticos antes da consulta.
      - Consulta marcada para hoje NÃO recebe lembrete de 24h.
      - O lembrete é enviado quando faltar no máximo reminder_before_hours.
      - A janela agora é elástica: entre 24h e 2h antes da consulta.
      - Isso evita perder lembretes se o WhatsApp/Z-API ficar bloqueado,
        se o cron falhar temporariamente ou se a Vercel atrasar a execução.
      - O campo reminder_sent_at continua impedindo envio duplicado.
    */

    const maxReminderHours = 72;
    const limitDate = addDaysBrazil(now, Math.ceil(maxReminderHours / 24) + 2);
    const limitDateString = formatDateKey(limitDate);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("type", "consulta")
      .eq("reminder_enabled", true)
      .is("reminder_sent_at", null)
      .gt("date", today)
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

    const patientMap = new Map((patients || []).map((p: any) => [p.id, p]));

    const sent: any[] = [];
    const skipped: any[] = [];
    const failed: any[] = [];

    for (const appointment of appointments || []) {
      const reminderBeforeHours = Number(appointment.reminder_before_hours || 24);

      const appointmentDateTime = createBrazilDate(
        appointment.date,
        appointment.start_time || "00:00"
      );

      const minutesUntilAppointment = diffInMinutes(now, appointmentDateTime);
      const reminderWindowMinutes = reminderBeforeHours * 60;

      /*
        Janela mínima de segurança:
        não enviar lembrete se faltar menos de 2 horas,
        para evitar mensagem em cima da hora ou depois de o paciente já estar vindo.
      */
      const minimumReminderMinutes = 120;

      console.log("==========");
      console.log("Paciente:", appointment.patient_name);
      console.log("Agora Brasil:", now.toISOString());
      console.log("Consulta Brasil:", appointmentDateTime.toISOString());
      console.log("Minutos até consulta:", minutesUntilAppointment);
      console.log("Janela máxima do lembrete:", reminderWindowMinutes);
      console.log("Janela mínima do lembrete:", minimumReminderMinutes);

      if (appointment.date === today) {
        skipped.push({
          id: appointment.id,
          patient: appointment.patient_name,
          date: appointment.date,
          reason: "Consulta é hoje. Lembrete de 24h não deve ser enviado.",
        });
        continue;
      }

      if (appointmentDateTime <= now) {
        skipped.push({
          id: appointment.id,
          patient: appointment.patient_name,
          date: appointment.date,
          reason: "Consulta já passou.",
        });
        continue;
      }

      if (minutesUntilAppointment > reminderWindowMinutes) {
        skipped.push({
          id: appointment.id,
          patient: appointment.patient_name,
          date: appointment.date,
          reason: "Ainda não chegou a janela do lembrete.",
          minutesUntilAppointment,
          reminderWindowMinutes,
        });
        continue;
      }

      if (minutesUntilAppointment < minimumReminderMinutes) {
        skipped.push({
          id: appointment.id,
          patient: appointment.patient_name,
          date: appointment.date,
          reason: "Faltam menos de 2 horas para a consulta.",
          minutesUntilAppointment,
          minimumReminderMinutes,
        });
        continue;
      }

      const patient = patientMap.get(appointment.patient_id);
      const phone = normalizeBrazilPhone(patient?.phone || "");

      if (!phone) {
        skipped.push({
          id: appointment.id,
          patient: patient?.name || appointment.patient_name,
          reason: "Paciente sem telefone.",
        });
        continue;
      }

      const message = buildMessage(template, {
        ...appointment,
        patient_name: patient?.name || appointment.patient_name || "paciente",
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
          date: appointment.date,
          start_time: appointment.start_time,
          result,
        });
      } catch (error: any) {
        failed.push({
          id: appointment.id,
          patient: patient?.name,
          phone,
          date: appointment.date,
          start_time: appointment.start_time,
          error: error?.message || "Erro desconhecido.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      now_brazil: now.toISOString(),
      today_brazil: today,
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
        error: error?.message || "Erro ao processar lembretes.",
      },
      { status: 500 }
    );
  }
}
