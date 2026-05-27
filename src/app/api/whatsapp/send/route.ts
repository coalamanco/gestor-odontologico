import { NextResponse } from "next/server";

function normalizeBrazilPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Rota /api/whatsapp/send está ativa.",
    hasInstanceId: Boolean(process.env.ZAPI_INSTANCE_ID),
    hasToken: Boolean(process.env.ZAPI_TOKEN),
  });
}

export async function POST(request: Request) {
  console.log("🔥 ROTA WHATSAPP CHAMADA");

  try {
    const { phone, message } = await request.json();

    const instanceId = process.env.ZAPI_INSTANCE_ID || "";
    const token = process.env.ZAPI_TOKEN || "";
    const clientToken = process.env.ZAPI_CLIENT_TOKEN || "";

    console.log("🔎 ZAPI ENV:", {
      hasInstanceId: Boolean(instanceId),
      hasToken: Boolean(token),
      hasClientToken: Boolean(clientToken),
      instanceIdStart: instanceId.slice(0, 6),
      tokenStart: token.slice(0, 6),
    });

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Telefone e mensagem são obrigatórios." },
        { status: 400 }
      );
    }

    if (!instanceId || !token) {
      return NextResponse.json(
        {
          error: "Z-API não configurada.",
          hasInstanceId: Boolean(instanceId),
          hasToken: Boolean(token),
        },
        { status: 500 }
      );
    }

    const normalizedPhone = normalizeBrazilPhone(phone);

    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clientToken ? { "Client-Token": clientToken } : {}),
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          message,
        }),
      }
    );

    const text = await response.text();

    let result: any = null;

    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      result = text;
    }

    console.log("📩 Z-API:", {
      status: response.status,
      ok: response.ok,
      result,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Erro ao enviar WhatsApp pela Z-API.",
          status: response.status,
          details: result,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      phone: normalizedPhone,
      result,
    });
  } catch (error: any) {
    console.error("❌ ERRO:", error);

    return NextResponse.json(
      { error: error?.message || "Erro ao enviar WhatsApp." },
      { status: 500 }
    );
  }
}