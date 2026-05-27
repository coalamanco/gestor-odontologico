import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
}

function buildDateTime(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}

function addMinutes(dateTime: string, minutes: number) {
  const date = new Date(dateTime);
  date.setMinutes(date.getMinutes() + minutes);

  return date.toISOString();
}

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function looksLikeSamePatient(event: any, patientName: string) {
  const text = normalizeText(
    `${event?.summary || ""}\n${event?.description || ""}`
  );

  const patient = normalizeText(patientName);

  if (!patient) return false;

  if (text.includes(patient)) return true;

  const firstName = patient.split(" ").filter(Boolean)[0];

  if (firstName && firstName.length >= 3) {
    return text.includes(firstName);
  }

  return false;
}

async function findExistingGoogleEvent(params: {
  calendar: ReturnType<typeof google.calendar>;
  calendarId: string;
  appointment: any;
}) {
  const { calendar, calendarId, appointment } = params;

  if (!appointment?.date || !appointment?.start_time) {
    return null;
  }

  const startDateTime = buildDateTime(
    appointment.date,
    appointment.start_time
  );

  const endDateTime = addMinutes(
    startDateTime,
    Number(appointment.duration || 30)
  );

  const events = await calendar.events.list({
    calendarId,
    timeMin: startDateTime,
    timeMax: endDateTime,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });

  const items = events.data.items || [];

  for (const event of items) {
    if (!event.id) continue;

    const samePatient = looksLikeSamePatient(
      event,
      appointment.patient_name || ""
    );

    if (samePatient) {
      return event;
    }
  }

  return null;
}

async function createGoogleEvent(params: {
  calendar: ReturnType<typeof google.calendar>;
  calendarId: string;
  appointment: any;
}) {
  const { calendar, calendarId, appointment } = params;

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
    calendarId,
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

  return createdEvent.data;
}

export async function POST(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("google_calendar_connections")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connectionError) throw connectionError;

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

    const calendarId = connection.calendar_id || "primary";
    const today = formatDate(new Date());

    const { data: appointments, error: appointmentsError } =
      await supabaseAdmin
        .from("appointments")
        .select("*")
        .eq("type", "consulta")
        .is("google_event_id", null)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(200);

    if (appointmentsError) throw appointmentsError;

    let created = 0;
    let linked = 0;
    let skipped = 0;
    let errors = 0;

    const details: any[] = [];

    for (const appointment of appointments || []) {
      try {
        if (!appointment.date || !appointment.start_time) {
          skipped += 1;
          details.push({
            appointmentId: appointment.id,
            status: "skipped",
            reason: "Sem data ou horário.",
          });
          continue;
        }

        const existingEvent = await findExistingGoogleEvent({
          calendar,
          calendarId,
          appointment,
        });

        if (existingEvent?.id) {
          const { error: updateError } = await supabaseAdmin
            .from("appointments")
            .update({
              google_event_id: existingEvent.id,
              google_calendar_synced_at: new Date().toISOString(),
              google_calendar_sync_error: null,
            })
            .eq("id", appointment.id);

          if (updateError) throw updateError;

          linked += 1;
          details.push({
            appointmentId: appointment.id,
            status: "linked",
            googleEventId: existingEvent.id,
          });
          continue;
        }

        const createdEvent = await createGoogleEvent({
          calendar,
          calendarId,
          appointment,
        });

        if (!createdEvent.id) {
          throw new Error("Google não retornou ID do evento.");
        }

        const { error: updateError } = await supabaseAdmin
          .from("appointments")
          .update({
            google_event_id: createdEvent.id,
            google_calendar_synced_at: new Date().toISOString(),
            google_calendar_sync_error: null,
          })
          .eq("id", appointment.id);

        if (updateError) throw updateError;

        created += 1;
        details.push({
          appointmentId: appointment.id,
          status: "created",
          googleEventId: createdEvent.id,
        });
      } catch (error: any) {
        errors += 1;

        await supabaseAdmin
          .from("appointments")
          .update({
            google_calendar_sync_error:
              error?.message || "Erro desconhecido ao sincronizar.",
          })
          .eq("id", appointment.id);

        details.push({
          appointmentId: appointment.id,
          status: "error",
          error: error?.message || String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: appointments?.length || 0,
      created,
      linked,
      skipped,
      errors,
      details,
    });
  } catch (error: any) {
    console.error("Erro ao sincronizar consultas existentes:", error);

    return NextResponse.json(
      {
        error: "Erro ao sincronizar consultas existentes.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
