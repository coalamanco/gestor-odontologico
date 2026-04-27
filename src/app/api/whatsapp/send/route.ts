import { NextResponse } from "next/server";

function normalizeBrazilPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Rota /api/whatsapp/send está ativa.",
  });
}

export async function POST(request: Request) {
  console.log("🔥 ROTA WHATSAPP POST CHAMADA");

  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Telefone e mensagem são obrigatórios." },
        { status: 400 }
      );
    }

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (!instanceId || !token || !clientToken) {
      console.error("❌ Z-API não configurada:", {
        hasInstanceId: !!instanceId,
        hasToken: !!token,
        hasClientToken: !!clientToken,
      });

      return NextResponse.json(
        { error: "Z-API não configurada no servidor." },
        { status: 500 }
      );
    }

    const normalizedPhone = normalizeBrazilPhone(phone);

    console.log("📲 Enviando WhatsApp para:", normalizedPhone);

    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": clientToken,
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

    console.log("📩 Resposta Z-API:", {
      status: response.status,
      result,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Erro ao enviar WhatsApp.",
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
    console.error("💥 Erro inesperado WhatsApp:", error);

    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao enviar WhatsApp." },
      { status: 500 }
    );
  }
}