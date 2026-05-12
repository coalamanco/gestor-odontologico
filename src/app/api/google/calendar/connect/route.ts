import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthClient,
  GOOGLE_CALENDAR_SCOPES,
} from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

type GoogleConnectState = {
  userId: string;
  professionalId?: string | null;
  redirect?: string | null;
  origin?: string | null;
};

function encodeState(state: GoogleConnectState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    const professionalId =
      request.nextUrl.searchParams.get("professionalId") ||
      request.nextUrl.searchParams.get("professional_id");

    const redirect = request.nextUrl.searchParams.get("redirect");
    const origin = request.nextUrl.searchParams.get("origin");

    if (!userId) {
      return NextResponse.json(
        { error: "userId não informado." },
        { status: 400 }
      );
    }

    const oauth2Client = getGoogleOAuthClient();

    const state = encodeState({
      userId,
      professionalId,
      redirect,
      origin,
    });

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent select_account",
      include_granted_scopes: true,
      scope: GOOGLE_CALENDAR_SCOPES,
      state,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Erro ao iniciar conexão Google:", error);

    return NextResponse.json(
      { error: "Erro ao iniciar conexão com Google." },
      { status: 500 }
    );
  }
}