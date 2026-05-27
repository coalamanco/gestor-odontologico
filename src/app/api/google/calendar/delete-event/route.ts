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
    const appointmentId = body?.appointmentId;
    const userId = body?.userId || null;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId é obrigatório." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) throw appointmentError;

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    let connectionQuery = supabaseAdmin
      .from("google_calendar_connections")
      .select("*");

    if (userId) {
      connectionQuery = connectionQuery.eq("user_id", userId);
    }

    const { data: connections, error: connectionError } = await connectionQuery
      .order("updated_at", { ascending: false })
      .limit(1);

    if (connectionError) throw connectionError;

    const connection = connections?.[0];

    if (!connection?.refresh_token) {
      return NextResponse.json(
        { error: "Google Agenda não conectado." },
        { status: 400 }
      );
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

    let deleted = false;

    if (appointment.google_event_id) {
      try {
        await calendar.events.delete({
          calendarId: connection.calendar_id || "primary",
          eventId: appointment.google_event_id,
        });

        deleted = true;
      } catch (googleError: any) {
        const status = googleError?.code || googleError?.response?.status;

        if (status === 404 || status === 410) {
          deleted = true;
        } else {
          throw googleError;
        }
      }
    }

    if (!deleted && appointment.date && appointment.start_time) {
      const startDateTime = buildDateTime(
        appointment.date,
        appointment.start_time
      );

      const endDateTime = addMinutes(
        startDateTime,
        Number(appointment.duration || 30)
      );

      const events = await calendar.events.list({
        calendarId: connection.calendar_id || "primary",
        timeMin: startDateTime,
        timeMax: endDateTime,
        singleEvents: true,
        q: appointment.patient_name || undefined,
      });

      const items = events.data.items || [];

      for (const event of items) {
        const eventStart = event.start?.dateTime || "";
        const eventSummary = event.summary || "";

        const sameTime = eventStart.startsWith(
          `${appointment.date}T${appointment.start_time}`
        );

        const samePatient =
          appointment.patient_name &&
          eventSummary
            .toLowerCase()
            .includes(String(appointment.patient_name).toLowerCase());

        if (event.id && sameTime && samePatient) {
          await calendar.events.delete({
            calendarId: connection.calendar_id || "primary",
            eventId: event.id,
          });

          deleted = true;
        }
      }
    }

    await supabaseAdmin
      .from("appointments")
      .update({
        google_event_id: null,
        google_calendar_synced_at: new Date().toISOString(),
        google_calendar_sync_error: deleted
          ? null
          : "Nenhum evento correspondente encontrado no Google Agenda.",
      })
      .eq("id", appointmentId);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error: any) {
    console.error("Erro ao excluir evento Google:", error);

    return NextResponse.json(
      {
        error: "Erro ao excluir evento Google.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}