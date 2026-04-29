import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient, GOOGLE_CALENDAR_SCOPES } from "@/lib/googleCalendar";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId não informado." },
        { status: 400 }
      );
    }

    const oauth2Client = getGoogleOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_CALENDAR_SCOPES,
      state: userId,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Erro ao iniciar conexão Google Calendar:", error);

    return NextResponse.json(
      { error: "Erro ao iniciar conexão com Google Agenda." },
      { status: 500 }
    );
  }
}