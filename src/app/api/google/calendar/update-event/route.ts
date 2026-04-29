import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

type GoogleConnection = {
  refresh_token?: string | null;
  access_token?: string | null;
  expiry_date?: number | null;
  calendar_id?: string | null;
};

type ProfessionalGoogleInfo = {
  id: string;
  name: string | null;
  google_calendar_id: string | null;
  google_calendar_email: string | null;
  google_connected: boolean | null;
};

function buildDateTime(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}

function addMinutes(dateTime: string, minutes: number) {
  const date = new Date(dateTime);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function getCalendarIdForAppointment(
  appointment: any,
  professional: ProfessionalGoogleInfo | null,
  fallbackConnection: GoogleConnection
) {
  if (
    appointment?.professional_id &&
    professional?.google_connected === true &&
    professional?.google_calendar_id
  ) {
    return professional.google_calendar_id;
  }

  return fallbackConnection.calendar_id || "primary";
}

async function getProfessionalForAppointment(
  supabaseAdmin: any,
  professionalId?: string | null
) {
  if (!professionalId) return null;

  const { data, error } = await supabaseAdmin
    .from("professionals")
    .select("id, name, google_calendar_id, google_calendar_email, google_connected")
    .eq("id", professionalId)
    .maybeSingle();

  if (error) throw error;

  return (data || null) as ProfessionalGoogleInfo | null;
}

export async function POST(request: NextRequest) {
  let appointmentId: string | null = null;

  try {
    const body = await request.json();
    appointmentId = body.appointmentId || null;
    const userId = body.userId;

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
      return NextResponse.json({
        skipped: true,
        reason: "Apenas consultas são sincronizadas com Google Agenda.",
      });
    }

    const professional = await getProfessionalForAppointment(
      supabaseAdmin,
      appointment.professional_id
    );

    const calendarId = getCalendarIdForAppointment(
      appointment,
      professional,
      connection
    );

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

    const eventTitle = `Consulta - ${appointment.patient_name || "Paciente"}`;

    const descriptionParts = [
      "Criado pelo Gestor Odontológico",
      `Paciente: ${appointment.patient_name || "Não informado"}`,
      `Tipo: ${appointment.title || "consulta"}`,
      professional?.name ? `Profissional: ${professional.name}` : "",
      professional?.google_calendar_email
        ? `Google do profissional: ${professional.google_calendar_email}`
        : "",
      appointment.description ? `Observação: ${appointment.description}` : "",
    ].filter(Boolean);

    const requestBody = {
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
    };

    let googleEventId = appointment.google_event_id || null;

    if (googleEventId) {
      try {
        const updatedEvent = await calendar.events.update({
          calendarId,
          eventId: googleEventId,
          requestBody,
        });

        googleEventId = updatedEvent.data.id || googleEventId;
      } catch (error: any) {
        const status = error?.code || error?.response?.status;

        if (status === 404 || status === 410) {
          googleEventId = null;
        } else {
          throw error;
        }
      }
    }

    if (!googleEventId) {
      const createdEvent = await calendar.events.insert({
        calendarId,
        requestBody,
      });

      googleEventId = createdEvent.data.id || null;
    }

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
      calendarId,
      professionalCalendarUsed:
        Boolean(appointment.professional_id) &&
        professional?.google_connected === true &&
        Boolean(professional?.google_calendar_id),
    });
  } catch (error: any) {
    console.error("Erro ao atualizar evento no Google Agenda:", error);

    const details = error?.message || String(error);

    if (appointmentId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceRoleKey) {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          await supabaseAdmin
            .from("appointments")
            .update({ google_calendar_sync_error: details })
            .eq("id", appointmentId);
        }
      } catch {
        // Evita que o registro do erro quebre a resposta principal.
      }
    }

    return NextResponse.json(
      {
        error: "Erro ao atualizar evento no Google Agenda.",
        details,
      },
      { status: 500 }
    );
  }
}
