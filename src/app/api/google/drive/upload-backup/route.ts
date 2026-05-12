import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { Readable } from "node:stream";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GoogleConnection = {
  refresh_token?: string | null;
  access_token?: string | null;
  expiry_date?: number | null;
};

const DRIVE_BACKUP_FOLDER_NAME = "Backups Gestor Odontológico";

function sanitizeFileName(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) {
    return `backup-consultorio-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
  }

  const safe = raw
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return safe.toLowerCase().endsWith(".json") ? safe : `${safe}.json`;
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isReconnectRequired(error: any) {
  const message = String(error?.message || error?.errors?.[0]?.message || "").toLowerCase();
  const reason = String(error?.errors?.[0]?.reason || "").toLowerCase();
  const code = Number(error?.code || error?.status || 0);

  return (
    code === 401 ||
    code === 403 ||
    reason.includes("insufficient") ||
    message.includes("insufficient") ||
    message.includes("invalid_grant") ||
    message.includes("unauthorized")
  );
}

async function getOrCreateBackupFolder(drive: any) {
  const escapedName = escapeDriveQueryValue(DRIVE_BACKUP_FOLDER_NAME);

  const existing = await drive.files.list({
    q: `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 10,
  });

  const folder = existing.data.files?.[0];

  if (folder?.id) {
    return folder;
  }

  const created = await drive.files.create({
    requestBody: {
      name: DRIVE_BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name",
  });

  if (!created.data.id) {
    throw new Error("Google Drive não retornou o ID da pasta de backups.");
  }

  return created.data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body?.userId || "").trim();
    const backup = body?.backup;
    const fileName = sanitizeFileName(body?.fileName);

    if (!userId) {
      return NextResponse.json(
        { error: "userId não informado." },
        { status: 400 }
      );
    }

    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
      return NextResponse.json(
        { error: "Backup JSON inválido ou não informado." },
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
      .select("access_token, refresh_token, expiry_date")
      .eq("user_id", userId)
      .maybeSingle<GoogleConnection>();

    if (connectionError) throw connectionError;

    if (!connection?.refresh_token) {
      return NextResponse.json(
        {
          error: "Google não conectado. Reconecte o Google Agenda antes de enviar backup ao Drive.",
          reconnectRequired: true,
        },
        { status: 400 }
      );
    }

    const oauth2Client = getGoogleOAuthClient();

    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token,
      access_token: connection.access_token || undefined,
      expiry_date: connection.expiry_date || undefined,
    });

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    const folder = await getOrCreateBackupFolder(drive);

    const backupPayload = {
      ...backup,
      google_drive_uploaded_at: new Date().toISOString(),
      google_drive_folder_name: DRIVE_BACKUP_FOLDER_NAME,
    };

    const buffer = Buffer.from(JSON.stringify(backupPayload, null, 2), "utf8");

    const createdFile = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/json",
        parents: [folder.id],
      },
      media: {
        mimeType: "application/json",
        body: Readable.from(buffer),
      },
      fields: "id, name, webViewLink, size, createdTime",
    });

    if (!createdFile.data.id) {
      throw new Error("Google Drive não retornou o ID do arquivo criado.");
    }

    return NextResponse.json({
      success: true,
      fileId: createdFile.data.id,
      fileName: createdFile.data.name || fileName,
      webViewLink: createdFile.data.webViewLink || null,
      size: createdFile.data.size || null,
      createdTime: createdFile.data.createdTime || null,
      folderId: folder.id,
      folderName: folder.name || DRIVE_BACKUP_FOLDER_NAME,
    });
  } catch (error: any) {
    console.error("Erro ao enviar backup para Google Drive:", error);

    const reconnectRequired = isReconnectRequired(error);

    return NextResponse.json(
      {
        error: reconnectRequired
          ? "Google Drive não autorizado. Reconecte o Google Agenda para liberar a permissão do Drive."
          : "Erro ao enviar backup para Google Drive.",
        details: error?.message || String(error),
        reconnectRequired,
      },
      { status: reconnectRequired ? 400 : 500 }
    );
  }
}
