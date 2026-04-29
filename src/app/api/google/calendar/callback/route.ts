import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const userId = request.nextUrl.searchParams.get("state");

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!code || !userId) {
      return NextResponse.redirect(
        `${appUrl}/agenda?googleCalendar=erro`
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const oauth2Client = getGoogleOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();

    const googleEmail = userInfo.data.email || null;

    const { error } = await supabaseAdmin
      .from("google_calendar_connections")
      .upsert(
        {
          user_id: userId,
          google_email: googleEmail,
          access_token: tokens.access_token || null,
          refresh_token: tokens.refresh_token || null,
          scope: tokens.scope || null,
          token_type: tokens.token_type || null,
          expiry_date: tokens.expiry_date || null,
          calendar_id: "primary",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Erro ao salvar conexão Google:", error);
      return NextResponse.redirect(
        `${appUrl}/agenda?googleCalendar=erro`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/agenda?googleCalendar=conectado`
    );
  } catch (error) {
    console.error("Erro no callback Google Calendar:", error);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.redirect(
      `${appUrl}/agenda?googleCalendar=erro`
    );
  }
}