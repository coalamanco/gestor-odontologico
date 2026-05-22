import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function sendZapiText(
  phone: string,
  message: string
) {
  const instanceId =
    process.env.ZAPI_INSTANCE_ID || "";

  const token =
    process.env.ZAPI_TOKEN || "";

  const clientToken =
    process.env.ZAPI_CLIENT_TOKEN || "";

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken
          ? {
              "Client-Token":
                clientToken,
            }
          : {}),
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(text);
  }
}

export async function GET() {
  try {
    const supabase =
      getSupabaseAdmin();

    const now =
      new Date().toISOString();

    const { data: messages } =
      await supabase
        .from(
          "crm_whatsapp_campaign_messages"
        )
        .select("*")
        .eq("status", "pendente")
        .lte("scheduled_for", now)
        .order("scheduled_for", {
          ascending: true,
        })
        .limit(1);

    const message = messages?.[0];

    if (!message) {
      return NextResponse.json({
        ok: true,
        message:
          "Nenhuma mensagem pendente.",
      });
    }

    await supabase
      .from(
        "crm_whatsapp_campaign_messages"
      )
      .update({
        status: "processando",
      })
      .eq("id", message.id);

    try {
      await sendZapiText(
        message.phone,
        message.message
      );

      await supabase
        .from(
          "crm_whatsapp_campaign_messages"
        )
        .update({
          status: "enviado",
          sent_at:
            new Date().toISOString(),
        })
        .eq("id", message.id);

      return NextResponse.json({
        ok: true,
        sent: true,
      });
    } catch (error: any) {
      await supabase
        .from(
          "crm_whatsapp_campaign_messages"
        )
        .update({
          status: "erro",
          error_message:
            error?.message ||
            "Erro ao enviar.",
        })
        .eq("id", message.id);

      return NextResponse.json({
        ok: false,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro processando fila.",
      },
      {
        status: 500,
      }
    );
  }
}