import { supabase } from "@/lib/supabase";

export async function getUserRole() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return "admin";
  }

  return data?.role || "admin";
}

export function isAdmin(role?: string | null) {
  return role === "admin";
}

export function isSecretary(role?: string | null) {
  return role === "secretaria";
}