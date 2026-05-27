import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type FinancialRecord = {
  id: string;
  patient_id: string | null;
  description: string | null;
  amount: number | string | null;
  paid_amount: number | string | null;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  installment_number: number | null;
  installments: number | null;
  last_charge_at: string | null;
  charge_stage: string | null;
};

type Patient = {
  id: string;
  name: string | null;
  phone: string | null;
};

type ChargeStage =
  | "pre_vencimento"
  | "vence_hoje"
  | "atraso_3_dias"
  | "atraso_7_dias"
  | "atraso_15_dias"
  | "atraso_30_dias";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "";
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

const CRON_SECRET =
  process.env.CRON_SECRET ||
  process.env.WHATSAPP_REMINDERS_SECRET ||
  process.env.FINANCIAL_REMINDERS_SECRET ||
  "";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  const normalized = String(value)
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  return Number(normalized) || 0;
}

function normalizeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function isPaid(record: FinancialRecord) {
  const amount = parseMoney(record.amount);
  const paid = parseMoney(record.paid_amount);
  const status = normalizeStatus(record.status);

  return paid >= amount || status === "pago" || status === "paid" || status === "quitado";
}

function getBalance(record: FinancialRecord) {
  const amount = parseMoney(record.amount);
  const paid = parseMoney(record.paid_amount);

  return Math.max(0, amount - paid);
}

function getDueDate(record: FinancialRecord) {
  if (record.due_date) {
    return new Date(`${String(record.due_date).slice(0, 10)}T12:00:00`);
  }

  if (!record.created_at) return null;

  const baseDate = new Date(record.created_at);

  if (Number.isNaN(baseDate.getTime())) return null;

  baseDate.setHours(12, 0, 0, 0);

  const installmentNumber = Math.max(1, Number(record.installment_number || 1));
  baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);

  return baseDate;
}

function getDaysDifferenceFromToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getChargeStage(record: FinancialRecord): ChargeStage | null {
  const dueDate = getDueDate(record);
  if (!dueDate) return null;

  const daysUntilDue = getDaysDifferenceFromToday(dueDate);

  if (daysUntilDue === 1) return "pre_vencimento";
  if (daysUntilDue === 0) return "vence_hoje";
  if (daysUntilDue === -3) return "atraso_3_dias";
  if (daysUntilDue === -7) return "atraso_7_dias";
  if (daysUntilDue === -15) return "atraso_15_dias";
  if (daysUntilDue === -30) return "atraso_30_dias";

  return null;
}

function shouldSkipBecauseAlreadyCharged(record: FinancialRecord, stage: ChargeStage) {
  if (record.charge_stage !== stage) return false;

  if (!record.last_charge_at) return false;

  const lastCharge = new Date(record.last_charge_at);

  if (Number.isNaN(lastCharge.getTime())) return false;

  const hoursSince =
    (Date.now() - lastCharge.getTime()) / (1000 * 60 * 60);

  return hoursSince < 20;
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeBrazilianPhone(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) return digits;

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function getFirstName(name?: string | null) {
  const clean = String(name || "paciente").trim();

  return clean.split(" ")[0] || "paciente";
}

function buildMessage(record: FinancialRecord, patient: Patient, stage: ChargeStage) {
  const name = getFirstName(patient.name);
  const balance = formatCurrency(getBalance(record));
  const description = record.description || "tratamento odontológico";

  if (stage === "pre_vencimento") {
    return (
      `Olá, ${name}! Tudo bem?\n\n` +
      `Passando para lembrar que amanhã vence um pagamento referente a:\n` +
      `🦷 ${description}\n\n` +
      `💰 Valor: ${balance}\n\n` +
      `Qualquer dúvida, estamos à disposição.`
    );
  }

  if (stage === "vence_hoje") {
    return (
      `Olá, ${name}! Tudo bem?\n\n` +
      `Seu pagamento referente a ${description} vence hoje.\n\n` +
      `💰 Valor: ${balance}\n\n` +
      `Se já realizou o pagamento, por favor desconsidere esta mensagem.`
    );
  }

  if (stage === "atraso_3_dias") {
    return (
      `Olá, ${name}! Tudo bem?\n\n` +
      `Identificamos um saldo em aberto referente a:\n` +
      `🦷 ${description}\n\n` +
      `💰 Valor em aberto: ${balance}\n\n` +
      `Quando puder, nos avise para organizarmos a melhor forma de pagamento.`
    );
  }

  if (stage === "atraso_7_dias") {
    return (
      `Olá, ${name}.\n\n` +
      `Seu pagamento referente a ${description} permanece em aberto.\n\n` +
      `💰 Saldo: ${balance}\n\n` +
      `Podemos te ajudar a organizar a regularização.`
    );
  }

  if (stage === "atraso_15_dias") {
    return (
      `Olá, ${name}.\n\n` +
      `Consta em nosso sistema um pagamento pendente referente a ${description}.\n\n` +
      `💰 Valor em aberto: ${balance}\n\n` +
      `Pedimos, por gentileza, que entre em contato para regularizarmos.`
    );
  }

  return (
    `Olá, ${name}.\n\n` +
    `Estamos entrando em contato sobre um saldo pendente há mais tempo referente a ${description}.\n\n` +
    `💰 Valor em aberto: ${balance}\n\n` +
    `Por favor, fale conosco para alinharmos a melhor forma de regularização.`
  );
}

async function sendWhatsappMessage(phone: string, message: string) {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
    throw new Error("Z-API não configurada. Verifique ZAPI_INSTANCE_ID e ZAPI_TOKEN.");
  }

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (ZAPI_CLIENT_TOKEN) {
    headers["Client-Token"] = ZAPI_CLIENT_TOKEN;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone,
      message,
    }),
  });

  const responseText = await response.text();

  let responseJson: any = null;

  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = {
      raw: responseText,
    };
  }

  if (!response.ok) {
    throw new Error(
      `Erro Z-API ${response.status}: ${responseText || "sem resposta"}`
    );
  }

  return responseJson;
}

function isAuthorized(request: Request) {
  if (!CRON_SECRET) return true;

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  const querySecret = new URL(request.url).searchParams.get("secret") || "";

  return bearer === CRON_SECRET || querySecret === CRON_SECRET;
}

export async function GET(request: Request) {
  return runFinancialReminders(request);
}

export async function POST(request: Request) {
  return runFinancialReminders(request);
}

async function runFinancialReminders(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Não autorizado.",
        },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase admin não configurado.",
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const limit = Math.min(Number(url.searchParams.get("limit") || 30), 100);

    const { data: records, error: recordsError } = await supabaseAdmin
      .from("financial_records")
      .select(
        "id, patient_id, description, amount, paid_amount, status, due_date, created_at, installment_number, installments, last_charge_at, charge_stage"
      )
      .order("due_date", { ascending: true })
      .limit(500);

    if (recordsError) throw recordsError;

    const candidates = ((records || []) as FinancialRecord[])
      .filter((record) => record.patient_id)
      .filter((record) => !isPaid(record))
      .filter((record) => getBalance(record) > 0)
      .map((record) => ({
        record,
        stage: getChargeStage(record),
      }))
      .filter((item): item is { record: FinancialRecord; stage: ChargeStage } =>
        Boolean(item.stage)
      )
      .filter((item) => !shouldSkipBecauseAlreadyCharged(item.record, item.stage))
      .slice(0, limit);

    const patientIds = Array.from(
      new Set(candidates.map((item) => String(item.record.patient_id)))
    );

    const { data: patients, error: patientsError } =
      patientIds.length > 0
        ? await supabaseAdmin
            .from("patients")
            .select("id, name, phone")
            .in("id", patientIds)
        : { data: [], error: null };

    if (patientsError) throw patientsError;

    const patientsById = new Map<string, Patient>();

    ((patients || []) as Patient[]).forEach((patient) => {
      patientsById.set(patient.id, patient);
    });

    const results: any[] = [];

    for (const item of candidates) {
      const record = item.record;
      const stage = item.stage;
      const patient = patientsById.get(String(record.patient_id));

      if (!patient) {
        results.push({
          recordId: record.id,
          ok: false,
          skipped: true,
          reason: "Paciente não encontrado.",
        });
        continue;
      }

      const phone = normalizeBrazilianPhone(patient.phone);

      if (!phone) {
        results.push({
          recordId: record.id,
          patientId: patient.id,
          ok: false,
          skipped: true,
          reason: "Paciente sem telefone.",
        });
        continue;
      }

      const message = buildMessage(record, patient, stage);

      if (dryRun) {
        results.push({
          recordId: record.id,
          patientId: patient.id,
          stage,
          phone,
          message,
          dryRun: true,
        });
        continue;
      }

      try {
        const response = await sendWhatsappMessage(phone, message);

        await supabaseAdmin.from("financial_charge_logs").insert({
          financial_record_id: record.id,
          patient_id: patient.id,
          phone,
          stage,
          message,
          success: true,
          response,
        });

        await supabaseAdmin
          .from("financial_records")
          .update({
            last_charge_at: new Date().toISOString(),
            charge_stage: stage,
          })
          .eq("id", record.id);

        results.push({
          recordId: record.id,
          patientId: patient.id,
          stage,
          phone,
          ok: true,
        });
      } catch (error: any) {
        const errorMessage = error?.message || "erro inesperado";

        await supabaseAdmin.from("financial_charge_logs").insert({
          financial_record_id: record.id,
          patient_id: patient.id,
          phone,
          stage,
          message,
          success: false,
          error: errorMessage,
        });

        results.push({
          recordId: record.id,
          patientId: patient.id,
          stage,
          phone,
          ok: false,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      totalCandidates: candidates.length,
      sent: results.filter((item) => item.ok).length,
      skipped: results.filter((item) => item.skipped).length,
      failed: results.filter((item) => item.ok === false && !item.skipped).length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "erro inesperado",
      },
      { status: 500 }
    );
  }
}
