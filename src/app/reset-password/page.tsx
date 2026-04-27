"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      alert("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não conferem.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        alert("Erro ao trocar senha: " + error.message);
        return;
      }

      alert("Senha alterada com sucesso. Faça login novamente.");

      await supabase.auth.signOut();

      router.push("/login");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7ffff] to-[#dff3f2] p-6">
      <form
        onSubmit={handleUpdatePassword}
        className="w-full max-w-md rounded-3xl border border-[#d9eeee] bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#239d9a] text-2xl font-black text-white">
            H
          </div>

          <h1 className="text-2xl font-black text-slate-800">
            Criar nova senha
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Digite sua nova senha de acesso.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#c2dddd] p-3 outline-none focus:border-[#239d9a]"
          />

          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-[#c2dddd] p-3 outline-none focus:border-[#239d9a]"
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] py-3 font-black text-white shadow-sm disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </div>
      </form>
    </div>
  );
}