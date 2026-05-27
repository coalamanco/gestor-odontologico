"use client";

import { useState } from "react";

export default function TesteWhatsApp() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [details, setDetails] = useState("");

  async function enviar() {
    setStatus("Enviando...");
    setDetails("");

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          message: "Teste do sistema odontológico 🚀",
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setStatus("Mensagem enviada com sucesso ✅");
        setDetails(JSON.stringify(data, null, 2));
      } else {
        setStatus("Erro ao enviar ❌");
        setDetails(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setStatus("Erro na conexão ❌");
      setDetails(err?.message || String(err));
    }
  }

  return (
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-black">Teste WhatsApp</h1>

      <input
        placeholder="Telefone ex: 554899850090"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border p-3 rounded w-full max-w-sm"
      />

      <button
        onClick={enviar}
        className="bg-green-500 text-white px-6 py-3 rounded"
      >
        Enviar mensagem
      </button>

      <div className="font-bold">{status}</div>

      {details && (
        <pre className="max-w-2xl overflow-auto rounded-xl bg-slate-900 p-4 text-sm text-white">
          {details}
        </pre>
      )}
    </div>
  );
}