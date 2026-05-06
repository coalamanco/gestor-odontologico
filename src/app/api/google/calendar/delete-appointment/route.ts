import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

function getDayRange(dateString: string) {
  return {
    start: `${dateString}T00:00:00-03:00`,
    end: `${dateString}T23:59:59-03:00`,
  };
}

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function patientNameLooksLikeMatch(eventText: string, patientName: string) {
  const eventNormalized = normalizeText(eventText);
  const patientNormalized = normalizeText(patientName);

  if (!patientNormalized) return false;

  if (eventNormalized.includes(patientNormalized)) return true;

  const firstName = patientNormalized.split(" ").filter(Boolean)[0];

  if (firstName && firstName.length >= 3) {
    return eventNormalized.includes(firstName);
  }

  return false;
}

async function tryDeleteGoogleEvent(params: {
  calendar: ReturnType<typeof google.calendar>;
  calendarId: string;
  appointment: any;
}) {
  const { calendar, calendarId, appointment } = params;

  if (appointment?.google_event_id) {
    try {
      await calendar.events.delete({
        calendarId,
        eventId: appointment.google_event_id,
      });

      return {
        deleted: true,
        method: "google_event_id",
        eventId: appointment.google_event_id,
      };
    } catch (error: any) {
      const status = error?.code || error?.response?.status;

      if (status === 404 || status === 410) {
        return {
          deleted: false,
          method: "google_event_id_not_found",
          eventId: appointment.google_event_id,
          warning: "Evento Google já não existia ou foi removido anteriormente.",
        };
      }

      throw error;
    }
  }

  if (!appointment?.date) {
    return {
      deleted: false,
      method: "no_date",
      eventId: null,
    };
  }

  const { start, end } = getDayRange(appointment.date);

  const events = await calendar.events.list({
    calendarId,
    timeMin: start,
    timeMax: end,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const items = events.data.items || [];

  const patientName = appointment.patient_name || "";
  const appointmentType = appointment.title || "consulta";

  for (const event of items) {
    const eventId = event.id;
    const summary = event.summary || "";
    const description = event.description || "";
    const combinedText = `${summary}\n${description}`;

    if (!eventId) continue;

    const matchesPatient = patientNameLooksLikeMatch(combinedText, patientName);

    const looksLikeConsultation =
      normalizeText(combinedText).includes("consulta") ||
      normalizeText(combinedText).includes(normalizeText(appointmentType));

    if (matchesPatient && looksLikeConsultation) {
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return {
        deleted: true,
        method: "patient_name_day_search",
        eventId,
      };
    }
  }

  return {
    deleted: false,
    method: "not_found",
    eventId: null,
    searchedEvents: items.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date || null,
    })),
  };
}

export async function POST(request: NextRequest) {
  let appointmentId: string | null = null;

  try {
    const body = await request.json();
    appointmentId = body?.appointmentId || null;

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

    let googleResult: any = {
      deleted: false,
      method: "not_attempted",
      eventId: null,
    };

    let googleError: string | null = null;

    /*
      IMPORTANTE:
      A exclusão local no Supabase nunca deve depender da Google Agenda.
      Se o Google falhar por token, calendário, evento inexistente ou instabilidade,
      o agendamento ainda precisa ser removido da agenda clínica.
    */
    try {
      const { data: connections, error: connectionError } = await supabaseAdmin
        .from("google_calendar_connections")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (connectionError) throw connectionError;

      googleResult = {
        deleted: false,
        method: connections && connections.length > 0 ? "not_found" : "no_connection",
        eventId: null,
      };

      for (const connection of connections || []) {
        if (!connection?.refresh_token) continue;

        try {
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

          const calendarId = connection.calendar_id || "primary";

          googleResult = await tryDeleteGoogleEvent({
            calendar,
            calendarId,
            appointment,
          });

          if (googleResult.deleted) break;
        } catch (connectionDeleteError: any) {
          googleError =
            connectionDeleteError?.message ||
            "Erro ao tentar excluir evento em uma conexão Google.";

          console.warn("Falha ao excluir evento Google nesta conexão:", {
            appointmentId,
            connectionId: connection?.id,
            calendarId: connection?.calendar_id || "primary",
            error: googleError,
          });

          googleResult = {
            deleted: false,
            method: "google_error_ignored",
            eventId: appointment?.google_event_id || null,
          };

          continue;
        }
      }
    } catch (error: any) {
      googleError =
        error?.message ||
        "Erro ao consultar conexões ou excluir evento do Google Agenda.";

      console.warn("Erro Google ignorado para permitir exclusão local:", {
        appointmentId,
        error: googleError,
      });

      googleResult = {
        deleted: false,
        method: "google_general_error_ignored",
        eventId: appointment?.google_event_id || null,
      };
    }

    const { error: deleteError } = await supabaseAdmin
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      appointmentDeleted: true,
      googleDeleted: Boolean(googleResult?.deleted),
      googleDeleteMethod: googleResult?.method || "unknown",
      googleEventId: googleResult?.eventId || null,
      googleWarning:
        googleError ||
        googleResult?.warning ||
        null,
      debug: googleResult,
    });
  } catch (error: any) {
    console.error("Erro ao excluir agendamento:", {
      appointmentId,
      error,
    });

    return NextResponse.json(
      {
        error: "Erro ao excluir agendamento.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
