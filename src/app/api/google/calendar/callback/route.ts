import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

type GoogleConnectState = {
  userId: string;
  professionalId?: string | null;
  redirect?: string | null;
  origin?: string | null;
};

function decodeState(rawState: string | null): GoogleConnectState | null {
  if (!rawState) return null;

  try {
    const decoded = Buffer.from(rawState, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (parsed?.userId) {
      return {
        userId: parsed.userId,
        professionalId: parsed.professionalId || null,
        redirect: parsed.redirect || null,
        origin: parsed.origin || null,
      };
    }
  } catch {
    // Compatibilidade com conexão antiga.
  }

  return {
    userId: rawState,
    professionalId: null,
    redirect: null,
    origin: null,
  };
}

function safeRedirectPath(value?: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = decodeState(request.nextUrl.searchParams.get("state"));

    if (!code || !state?.userId) {
      return NextResponse.redirect(`${appUrl}/agenda?googleCalendar=erro`);
    }

    const userId = state.userId;
    const professionalId = state.professionalId || null;
    const origin = state.origin || null;
    const redirectPath = safeRedirectPath(state.redirect);

    const isDriveBackupConnection = origin === "google_drive_backup";

    const successRedirect =
      redirectPath ||
      (isDriveBackupConnection
        ? "/configuracoes?tab=backup&googleDrive=conectado"
        : professionalId
          ? "/configuracoes?tab=equipe&googleCalendar=conectado"
          : "/agenda?googleCalendar=conectado");

    const errorRedirect =
      redirectPath ||
      (isDriveBackupConnection
        ? "/configuracoes?tab=backup&googleDrive=erro"
        : professionalId
          ? "/configuracoes?tab=equipe&googleCalendar=erro"
          : "/agenda?googleCalendar=erro");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const oauth2Client = getGoogleOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
    });

    let googleCalendarId = "primary";
    let googleCalendarEmail: string | null = null;

    try {
      const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });

      const primaryCalendar = await calendar.calendars.get({
        calendarId: "primary",
      });

      googleCalendarId = primaryCalendar.data.id || "primary";
      googleCalendarEmail =
        primaryCalendar.data.id || primaryCalendar.data.summary || null;
    } catch (calendarError) {
      console.warn(
        "Não foi possível ler o calendário principal. Usando primary.",
        calendarError
      );
    }

    const { data: existingConnection } = await supabaseAdmin
      .from("google_calendar_connections")
      .select("refresh_token, scope")
      .eq("user_id", userId)
      .maybeSingle();

    const refreshToken =
      tokens.refresh_token || existingConnection?.refresh_token || null;

    const previousScope = String(existingConnection?.scope || "");
    const newScope = String(tokens.scope || "");

    const mergedScope = Array.from(
      new Set(
        `${previousScope} ${newScope}`
          .split(" ")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ).join(" ");

    const { error } = await supabaseAdmin
      .from("google_calendar_connections")
      .upsert(
        {
          user_id: userId,
          google_email: googleCalendarEmail,
          access_token: tokens.access_token || null,
          refresh_token: refreshToken,
          scope: mergedScope || null,
          token_type: tokens.token_type || null,
          expiry_date: tokens.expiry_date || null,
          calendar_id: googleCalendarId || "primary",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Erro ao salvar conexão Google:", error);
      return NextResponse.redirect(`${appUrl}${errorRedirect}`);
    }

    if (professionalId && !isDriveBackupConnection) {
      const { error: professionalError } = await supabaseAdmin
        .from("professionals")
        .update({
          google_calendar_id: googleCalendarId || "primary",
          google_calendar_email: googleCalendarEmail,
          google_connected: true,
        })
        .eq("id", professionalId);

      if (professionalError) {
        console.error(
          "Erro ao salvar conexão Google no profissional:",
          professionalError
        );

        return NextResponse.redirect(`${appUrl}${errorRedirect}`);
      }
    }

    return NextResponse.redirect(`${appUrl}${successRedirect}`);
  } catch (error) {
    console.error("Erro no callback Google Calendar:", error);
    return NextResponse.redirect(`${appUrl}/agenda?googleCalendar=erro`);
  }
}