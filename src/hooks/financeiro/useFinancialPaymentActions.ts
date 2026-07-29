"use client";

import { useState } from "react";
import { supabaseNoSchemaCache } from "@/lib/supabase";
import { toInputDate } from "@/lib/financeiro/financeiroUtils";
import type {
  FinancialRecord,
  PaymentTransaction,
} from "@/lib/financeiro/financeiroService";

type UseFinancialPaymentActionsParams = {
  reloadAll: () => Promise<void>;
  parseMoney: (value: unknown) => number;
  labelFormaPagamento: (value: unknown) => string;
};

export function useFinancialPaymentActions({
  reloadAll,
  parseMoney,
  labelFormaPagamento,
}: UseFinancialPaymentActionsParams) {
  const todayIso = toInputDate(new Date());

  const [isReceberOpen, setIsReceberOpen] = useState(false);
  const [receberTarget, setReceberTarget] = useState<FinancialRecord | null>(null);
  const [receberValor, setReceberValor] = useState("");
  const [receberFormaPagamento, setReceberFormaPagamento] = useState("Pix");
  const [receberRecibo, setReceberRecibo] = useState("nenhum");
  const [receberObservacao, setReceberObservacao] = useState("");
  const [receberSaving, setReceberSaving] = useState(false);

  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentTransaction | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Pix");
  const [editReceiptType, setEditReceiptType] = useState("nenhum");
  const [editReceivedAt, setEditReceivedAt] = useState(todayIso);
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);

  function openReceberModal(record: FinancialRecord) {
    const total = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);
    const remaining = Math.max(0, total - paid);
    const paymentLabel = labelFormaPagamento(record.payment_method);

    setReceberTarget(record);
    setReceberValor(remaining > 0 ? String(remaining.toFixed(2)) : "");
    setReceberFormaPagamento(paymentLabel === "—" ? "Pix" : paymentLabel);
    setReceberRecibo(String(record.receipt_type ?? "nenhum") || "nenhum");
    setReceberObservacao("");
    setIsReceberOpen(true);
  }

  function openEditPaymentModal(payment: PaymentTransaction) {
    const paymentLabel = labelFormaPagamento(payment.payment_method);

    setEditingPayment(payment);
    setEditPaymentAmount(String(parseMoney(payment.amount).toFixed(2)));
    setEditPaymentMethod(paymentLabel === "—" ? "Pix" : paymentLabel);
    setEditReceiptType(String(payment.receipt_type || "nenhum"));
    setEditReceivedAt(
      payment.received_at
        ? String(payment.received_at).slice(0, 10)
        : toInputDate(new Date())
    );
    setEditPaymentNote(payment.note || "");
    setIsEditPaymentOpen(true);
  }

  function closeEditPaymentModal() {
    if (editPaymentSaving) return;

    setIsEditPaymentOpen(false);
    setEditingPayment(null);
    setEditPaymentAmount("");
    setEditPaymentMethod("Pix");
    setEditReceiptType("nenhum");
    setEditReceivedAt(toInputDate(new Date()));
    setEditPaymentNote("");
  }

  async function recalculateFinancialRecordAfterPaymentEdit(financialRecordId: string) {
    const { data: recordData, error: recordError } = await supabaseNoSchemaCache
      .from("financial_records")
      .select("*")
      .eq("id", financialRecordId)
      .single();

    if (recordError) throw recordError;

    const { data: txData, error: txError } = await supabaseNoSchemaCache
      .from("payment_transactions")
      .select("*")
      .eq("financial_record_id", financialRecordId)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (txError) throw txError;

    const transactions = (txData || []) as PaymentTransaction[];
    const totalPaid = transactions.reduce((acc, tx) => acc + parseMoney(tx.amount), 0);
    const totalAmount = parseMoney((recordData as FinancialRecord).amount);
    const newStatus = totalPaid <= 0 ? "pendente" : totalPaid < totalAmount ? "parcial" : "pago";
    const latestPayment = transactions[0] || null;

    const { error: updateRecordError } = await supabaseNoSchemaCache
      .from("financial_records")
      .update({
        paid_amount: totalPaid,
        status: newStatus,
        payment_method: latestPayment?.payment_method || null,
        receipt_type: latestPayment?.receipt_type || "nenhum",
        paid_at: latestPayment?.received_at || null,
      })
      .eq("id", financialRecordId);

    if (updateRecordError) throw updateRecordError;
  }

  async function handleEditPaymentConfirmar() {
    if (!editingPayment || editPaymentSaving) return;

    const newAmount = parseFloat(String(editPaymentAmount).replace(",", "."));
    if (Number.isNaN(newAmount) || newAmount <= 0) {
      alert("Informe um valor válido para o pagamento.");
      return;
    }

    try {
      setEditPaymentSaving(true);

      const { data: recordData, error: recordError } = await supabaseNoSchemaCache
        .from("financial_records")
        .select("amount")
        .eq("id", editingPayment.financial_record_id)
        .single();

      if (recordError) throw recordError;

      const { data: otherPaymentsData, error: otherPaymentsError } =
        await supabaseNoSchemaCache
          .from("payment_transactions")
          .select("amount")
          .eq("financial_record_id", editingPayment.financial_record_id)
          .neq("id", editingPayment.id);

      if (otherPaymentsError) throw otherPaymentsError;

      const recordTotal = parseMoney(recordData?.amount);
      const otherPaymentsTotal = (otherPaymentsData || []).reduce(
        (sum, payment) => sum + parseMoney(payment.amount),
        0
      );
      const totalAfterEdit = otherPaymentsTotal + newAmount;
      const availableForThisPayment = Math.max(0, recordTotal - otherPaymentsTotal);

      if (totalAfterEdit - recordTotal > 0.005) {
        const availableFormatted = availableForThisPayment.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        alert(
          `O valor deste pagamento não pode ultrapassar ${availableFormatted}, pois os demais pagamentos já somam parte do débito.`
        );
        return;
      }

      const { error: updatePaymentError } = await supabaseNoSchemaCache
        .from("payment_transactions")
        .update({
          amount: newAmount,
          payment_method: editPaymentMethod,
          receipt_type: editReceiptType,
          note: editPaymentNote || null,
          received_at: new Date(`${editReceivedAt}T12:00:00`).toISOString(),
        })
        .eq("id", editingPayment.id);

      if (updatePaymentError) throw updatePaymentError;

      await recalculateFinancialRecordAfterPaymentEdit(editingPayment.financial_record_id);
      alert("Pagamento atualizado com sucesso.");
      closeEditPaymentModal();
      await reloadAll();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "erro inesperado";
      alert("Erro ao editar pagamento: " + message);
    } finally {
      setEditPaymentSaving(false);
    }
  }

  async function handleReceberConfirmar() {
    const target = receberTarget;
    if (!target?.id || receberSaving) return;

    const valorPagoAgora = parseFloat(String(receberValor).replace(",", "."));
    if (Number.isNaN(valorPagoAgora) || valorPagoAgora <= 0) {
      alert("Informe um valor válido para receber.");
      return;
    }

    const total = parseMoney(target.amount);
    const pagoAtual = parseMoney(target.paid_amount);
    const novoPago = pagoAtual + valorPagoAgora;

    if (novoPago > total) {
      alert("O valor recebido não pode ser maior que o saldo do débito.");
      return;
    }

    const novoStatus = novoPago <= 0 ? "pendente" : novoPago < total ? "parcial" : "pago";
    setReceberSaving(true);

    try {
      const { error: paymentInsertError } = await supabaseNoSchemaCache
        .from("payment_transactions")
        .insert([
          {
            financial_record_id: String(target.id),
            patient_id: target.patient_id || null,
            amount: valorPagoAgora,
            payment_method: receberFormaPagamento,
            receipt_type: receberRecibo,
            note: receberObservacao || null,
            received_at: new Date().toISOString(),
          },
        ]);

      if (paymentInsertError) throw paymentInsertError;

      const { error: recordUpdateError } = await supabaseNoSchemaCache
        .from("financial_records")
        .update({
          paid_amount: novoPago,
          payment_method: receberFormaPagamento,
          receipt_type: receberRecibo,
          status: novoStatus,
          paid_at: new Date().toISOString(),
        })
        .eq("id", String(target.id));

      if (recordUpdateError) throw recordUpdateError;

      setIsReceberOpen(false);
      setReceberTarget(null);
      setReceberValor("");
      setReceberObservacao("");
      await reloadAll();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "erro inesperado";
      alert("Erro ao registrar pagamento: " + message);
    } finally {
      setReceberSaving(false);
    }
  }

  return {
    isReceberOpen,
    setIsReceberOpen,
    receberTarget,
    receberValor,
    setReceberValor,
    receberFormaPagamento,
    setReceberFormaPagamento,
    receberRecibo,
    setReceberRecibo,
    receberObservacao,
    setReceberObservacao,
    receberSaving,
    isEditPaymentOpen,
    editingPayment,
    editPaymentAmount,
    setEditPaymentAmount,
    editPaymentMethod,
    setEditPaymentMethod,
    editReceiptType,
    setEditReceiptType,
    editReceivedAt,
    setEditReceivedAt,
    editPaymentNote,
    setEditPaymentNote,
    editPaymentSaving,
    openReceberModal,
    openEditPaymentModal,
    closeEditPaymentModal,
    handleEditPaymentConfirmar,
    handleReceberConfirmar,
  };
}
