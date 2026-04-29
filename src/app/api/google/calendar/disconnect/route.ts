import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "userId não informado." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role não configurado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabaseAdmin
      .from("google_calendar_connections")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao desconectar Google Calendar:", error);

    return NextResponse.json(
      { error: "Erro ao desconectar Google Agenda." },
      { status: 500 }
    );
  }
}