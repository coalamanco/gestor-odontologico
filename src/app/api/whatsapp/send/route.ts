import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeBrazilPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const [type, token] = authHeader.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}

export async function GET() {
  console.log("✅ ROTA WHATSAPP GET CHAMADA");

  return NextResponse.json({
    ok: true,
    message: "Rota /api/whatsapp/send está ativa.",
  });
}

export async function POST(request: Request) {
  console.log("🔥 ROTA WHATSAPP POST CHAMADA");

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Supabase não configurado.");
      return NextResponse.json(
        { error: "Supabase não configurado no servidor." },
        { status: 500 }
      );
    }

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      console.error("❌ Token de autorização ausente.");
      return NextResponse.json(
        { error: "Não autorizado. Faça login novamente no sistema." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("❌ Sessão inválida:", userError);
      return NextResponse.json(
        { error: "Sessão inválida ou expirada. Faça login novamente." },
        { status: 401 }
      );
    }

    console.log("✅ Usuário autenticado:", user.id);

    const { data: allowed, error: allowedError } = await supabase
      .from("allowed_users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (allowedError || !allowed) {
      console.error("❌ Usuário não autorizado:", allowedError);
      return NextResponse.json(
        { error: "Usuário não autorizado." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const phone = body?.phone;
    const message = body?.message;

    if (!phone || !message) {
      console.error("❌ Telefone ou mensagem ausente.");
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