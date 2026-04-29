import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const appointmentId = body?.appointmentId;
    const userId = body?.userId;

    if (!appointmentId || !userId) {
      return NextResponse.json(
        {
          error: "appointmentId e userId são obrigatórios.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: appointment, error: appointmentError } =
      await supabaseAdmin
        .from("appointments")
        .select("google_event_id")
        .eq("id", appointmentId)
        .maybeSingle();

    if (appointmentError) {
      throw appointmentError;
    }

    if (!appointment?.google_event_id) {
      return NextResponse.json({
        success: true,
        skipped: true,
      });
    }

    const { data: connection, error: connectionError } =
      await supabaseAdmin
        .from("google_calendar_connections")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (connectionError) {
      throw connectionError;
    }

    if (!connection?.refresh_token) {
      return NextResponse.json(
        {
          error: "Google Agenda não conectado.",
        },
        {
          status: 400,
        }
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

    await calendar.events.delete({
      calendarId: connection.calendar_id || "primary",
      eventId: appointment.google_event_id,
    });

    await supabaseAdmin
      .from("appointments")
      .update({
        google_event_id: null,
      })
      .eq("id", appointmentId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao excluir evento Google:",
      error
    );

    return NextResponse.json(
      {
        error: "Erro ao excluir evento Google.",
      },
      {
        status: 500,
      }
    );
  }
}
