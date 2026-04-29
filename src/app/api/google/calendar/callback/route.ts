import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const code = request.nextUrl.searchParams.get("code");
    const userId = request.nextUrl.searchParams.get("state");

    if (!code || !userId) {
      return NextResponse.redirect(`${appUrl}/agenda?googleCalendar=erro`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const oauth2Client = getGoogleOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    const { data: existingConnection } = await supabaseAdmin
      .from("google_calendar_connections")
      .select("refresh_token")
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("google_calendar_connections")
      .upsert(
        {
          user_id: userId,
          google_email: null,
          access_token: tokens.access_token || null,
          refresh_token:
            tokens.refresh_token ||
            existingConnection?.refresh_token ||
            null,
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
      return NextResponse.redirect(`${appUrl}/agenda?googleCalendar=erro`);
    }

    return NextResponse.redirect(`${appUrl}/agenda?googleCalendar=conectado`);
  } catch (error) {
    console.error("Erro no callback Google Calendar:", error);
    return NextResponse.redirect(`${appUrl}/agenda?googleCalendar=erro`);
  }
}