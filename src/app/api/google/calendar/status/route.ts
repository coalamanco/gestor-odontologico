import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { connected: false, error: "userId não informado." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseAdmin
      .from("google_calendar_connections")
      .select("google_email, calendar_id, connected_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      connected: !!data,
      googleEmail: data?.google_email || null,
      calendarId: data?.calendar_id || null,
      connectedAt: data?.connected_at || null,
      updatedAt: data?.updated_at || null,
    });
  } catch (error) {
    console.error("Erro ao verificar status Google Calendar:", error);

    return NextResponse.json(
      { connected: false, error: "Erro ao verificar conexão." },
      { status: 500 }
    );
  }
}