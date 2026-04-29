import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

function buildDateTime(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}

function addMinutes(dateTime: string, minutes: number) {
  const date = new Date(dateTime);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, userId } = body;

    if (!appointmentId || !userId) {
      return NextResponse.json(
        { error: "appointmentId e userId são obrigatórios." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (connectionError) throw connectionError;

    if (!connection?.refresh_token) {
      return NextResponse.json(
        { error: "Google Agenda não conectado." },
        { status: 400 }
      );
    }

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) throw appointmentError;

    if (!appointment) {
      return NextResponse.json(
        { error: "Consulta não encontrada." },
        { status: 404 }
      );
    }

    if (appointment.type !== "consulta") {
      return NextResponse.json(
        { skipped: true, reason: "Apenas consultas são sincronizadas." }
      );
    }

    if (appointment.google_event_id) {
      return NextResponse.json({
        success: true,
        skipped: true,
        googleEventId: appointment.google_event_id,
      });
    }

    const oauth2Client = getGoogleOAuthClient();

    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token,
      access_token: connection.access_token || undefined,
      expiry_date: connection.expiry_date || undefined,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const startDateTime = buildDateTime(
      appointment.date,
      appointment.start_time
    );

    const endDateTime = addMinutes(
      startDateTime,
      Number(appointment.duration || 30)
    );

    const eventTitle = `Consulta - ${
      appointment.patient_name || "Paciente"
    }`;

    const descriptionParts = [
      `Paciente: ${appointment.patient_name || "Não informado"}`,
      `Tipo: ${appointment.title || "consulta"}`,
      appointment.description ? `Observação: ${appointment.description}` : "",
    ].filter(Boolean);

    const createdEvent = await calendar.events.insert({
      calendarId: connection.calendar_id || "primary",
      requestBody: {
        summary: eventTitle,
        description: descriptionParts.join("\n"),
        start: {
          dateTime: startDateTime,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "America/Sao_Paulo",
        },
      },
    });

    const googleEventId = createdEvent.data.id;

    if (!googleEventId) {
      throw new Error("Google não retornou ID do evento.");
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        google_event_id: googleEventId,
        google_calendar_synced_at: new Date().toISOString(),
        google_calendar_sync_error: null,
      })
      .eq("id", appointmentId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      googleEventId,
    });
  } catch (error: any) {
    console.error("Erro ao criar evento no Google Agenda:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar evento no Google Agenda.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}