"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("E-mail ou senha inválidos.");
      return;
    }

    router.push("/");
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      alert("Digite seu e-mail no campo de e-mail primeiro.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert("Erro ao enviar recuperação: " + error.message);
      return;
    }

    alert("Enviamos um link de recuperação para seu e-mail.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7ffff] to-[#dff3f2] p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl border border-[#d9eeee] bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#239d9a] text-2xl font-black text-white">
            H
          </div>

          <h1 className="text-2xl font-black text-slate-800">
            Acesso ao sistema
          </h1>

          <p className="mt-2 text-sm text-slate-500">Gestor Odontológico</p>
        </div>

        <div className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#c2dddd] p-3 outline-none focus:border-[#239d9a]"
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#c2dddd] p-3 outline-none focus:border-[#239d9a]"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] py-3 font-black text-white shadow-sm"
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            className="w-full text-sm font-bold text-[#239d9a] hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
      </form>
    </div>
  );
}