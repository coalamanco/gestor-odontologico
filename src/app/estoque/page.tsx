"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseNoSchemaCache } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Download, Plus, X, PackageSearch, Minus } from "lucide-react";

type InventoryProduct = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  min_stock: number | null;
};

type InventoryHistory = {
  id: string;
  product_id: string;
  type: "in" | "out";
  quantity: number;
  responsible: string | null;
  created_at: string;
  inventory?: { name: string } | null;
};

function toCsvValue(value: unknown) {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function EstoquePage() {
  const [tab, setTab] = useState<"EM_ESTOQUE" | "HISTORICO">("EM_ESTOQUE");
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState<InventoryProduct[]>([]);
  const [historico, setHistorico] = useState<InventoryHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduto, setNewProduto] = useState({
    name: "",
    category: "",
    quantity: 0,
    min_stock: 5,
  });

  async function fetchProdutos() {
    const { data, error } = await supabaseNoSchemaCache
      .from("inventory")
      .select("*")
      .order("name", { ascending: true });

    if (error) return;

    setProdutos(
      (data || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name ?? ""),
        category: p.category ?? null,
        quantity: Number(p.quantity ?? 0),
        min_stock: p.min_stock == null ? null : Number(p.min_stock),
      }))
    );
  }

  async function fetchHistorico() {
    const { data, error } = await supabaseNoSchemaCache
      .from("inventory_history")
      .select("*, inventory (name)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return;

    setHistorico(
      (data || []).map((h: any) => ({
        id: String(h.id),
        product_id: String(h.product_id),
        type: h.type === "in" ? "in" : "out",
        quantity: Number(h.quantity ?? 0),
        responsible: h.responsible ?? null,
        created_at: String(h.created_at),
        inventory: h.inventory ?? null,
      }))
    );
  }

  useEffect(() => {
    fetchProdutos();
    fetchHistorico();
  }, []);

  const filteredProdutos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return produtos;
    return produtos.filter((p) => p.name.toLowerCase().includes(term));
  }, [produtos, search]);

  async function logHistorico(params: {
    product_id: string;
    type: "in" | "out";
    quantity: number;
    responsible?: string | null;
  }) {
    const { error } = await supabaseNoSchemaCache.from("inventory_history").insert([
      {
        product_id: params.product_id,
        type: params.type,
        quantity: params.quantity,
        responsible: params.responsible ?? null,
      },
    ]);
    if (!error) fetchHistorico();
  }

  async function adjustQuantidade(produto: InventoryProduct, delta: number) {
    if (delta === 0) return;
    const next = produto.quantity + delta;
    if (next < 0) return;

    const responsible = window.prompt(
      delta > 0 ? "Quem registrou a entrada?" : "Quem registrou a saída?",
      "Dr. Henrique"
    );

    setLoading(true);
    const { error } = await supabaseNoSchemaCache
      .from("inventory")
      .update({ quantity: next })
      .eq("id", produto.id);

    if (error) {
      alert("Erro ao atualizar estoque: " + error.message);
      setLoading(false);
      return;
    }

    await logHistorico({
      product_id: produto.id,
      type: delta > 0 ? "in" : "out",
      quantity: Math.abs(delta),
      responsible,
    });
    await fetchProdutos();
    setLoading(false);
  }

  async function handleNovaEntrada(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduto.name.trim()) return;
    setLoading(true);

    const { data, error } = await supabaseNoSchemaCache
      .from("inventory")
      .insert([
        {
          name: newProduto.name.trim(),
          category: newProduto.category.trim() || null,
          quantity: Number(newProduto.quantity || 0),
          min_stock: Number(newProduto.min_stock || 0),
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Erro ao cadastrar produto: " + error.message);
      setLoading(false);
      return;
    }

    if (data?.id && Number(newProduto.quantity) > 0) {
      await logHistorico({
        product_id: String(data.id),
        type: "in",
        quantity: Number(newProduto.quantity),
        responsible: "Entrada Inicial",
      });
    }

    setNewProduto({ name: "", category: "", quantity: 0, min_stock: 5 });
    setIsModalOpen(false);
    await fetchProdutos();
    setLoading(false);
  }

  function exportCsv() {
    const header = ["Produto", "Categoria", "Quantidade Atual", "Estoque Mínimo", "Status"];
    const rows = filteredProdutos.map((p) => {
      const minimo = p.min_stock ?? 5;
      const baixo = p.quantity <= minimo;
      return [p.name, p.category ?? "", p.quantity, minimo, baixo ? "BAIXO" : "OK"];
    });
    const csv = [header, ...rows].map((r) => r.map(toCsvValue).join(";")).join("\n");
    downloadFile(
      `estoque_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  function exportPdf() {
    const html = `
      <html>
        <head>
          <title>Estoque</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Estoque</h1>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProdutos
                .map((p) => {
                  const minimo = p.min_stock ?? 5;
                  const baixo = p.quantity <= minimo;
                  return `
                    <tr>
                      <td>${String(p.name)}</td>
                      <td>${String(p.category ?? "")}</td>
                      <td>${String(p.quantity)}</td>
                      <td>${baixo ? "BAIXO" : "OK"}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  const lowStockCount = useMemo(() => {
    return produtos.filter((p) => p.quantity <= (p.min_stock ?? 5)).length;
  }, [produtos]);

  const weekStartIso = useMemo(() => startOfWeek(new Date()).toISOString(), []);
  const historicoRetiradasSemana = useMemo(() => {
    return historico.filter((h) => h.type === "out" && h.created_at >= weekStartIso);
  }, [historico, weekStartIso]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Estoque
            </h1>
            <p className="text-slate-500 font-medium">
              Controle de materiais e consumo clínico.
            </p>
          </div>

          <div className="flex-1 max-w-xl mx-auto w-full">
            <div className="relative">
              <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Digite o nome do produto"
                className="pl-12 h-12 w-full bg-white border-[#d9eeee] focus:ring-[#85d4d2] rounded-2xl shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setExportMenuOpen((v) => !v)}
                className="rounded-2xl h-12 px-5 font-black text-xs uppercase tracking-widest border-[#d9eeee] text-slate-600 bg-white hover:bg-slate-50 flex gap-3"
              >
                <Download size={18} />
                Exportar
              </Button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#d9eeee] rounded-2xl shadow-xl overflow-hidden z-30">
                  <button
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportCsv();
                    }}
                    className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Excel (CSV)
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      Compatível com Excel
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportPdf();
                    }}
                    className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors border-t border-[#eef6f6]"
                  >
                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      PDF
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      Imprimir / Salvar como PDF
                    </p>
                  </button>
                </div>
              )}
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] hover:opacity-95 text-white rounded-2xl h-12 px-7 font-black text-xs uppercase tracking-widest shadow-sm flex gap-3"
            >
              <Plus size={20} />
              Nova Entrada
            </Button>
          </div>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-[2rem] shadow-sm border border-[#d9eeee] w-fit">
          <button
            onClick={() => setTab("EM_ESTOQUE")}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all",
              tab === "EM_ESTOQUE"
                ? "bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            Em Estoque
          </button>

          <button
            onClick={() => setTab("HISTORICO")}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all",
              tab === "HISTORICO"
                ? "bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            Histórico de Retiradas
          </button>
        </div>
      </div>

      {tab === "EM_ESTOQUE" && (
        <div className="grid grid-cols-1 gap-8">
          <Card className="border border-[#d9eeee] shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-[#eef6f6] py-7 px-8">
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
                Materiais em Estoque
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                Ajuste rápido por + e -
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#f7ffff]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-8">Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Quantidade Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right px-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredProdutos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-24">
                        <div className="flex flex-col items-center gap-4 text-slate-300">
                          <PackageSearch size={64} className="opacity-10" />
                          <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">
                            Nenhum produto encontrado
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProdutos.map((p) => {
                      const minimo = p.min_stock ?? 5;
                      const baixo = p.quantity <= minimo;

                      return (
                        <TableRow
                          key={p.id}
                          className="hover:bg-[#fbffff] transition-all duration-300 border-[#eef6f6]"
                        >
                          <TableCell className="px-8 py-5">
                            <span className="font-black text-slate-800 tracking-tight">
                              {p.name}
                            </span>
                          </TableCell>

                          <TableCell className="text-slate-600 font-bold">
                            {p.category || "-"}
                          </TableCell>

                          <TableCell className="font-black text-slate-800 text-lg">
                            {p.quantity}
                          </TableCell>

                          <TableCell>
                            <span
                              className={cn(
                                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                baixo
                                  ? "bg-rose-50 text-rose-600 border-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              )}
                            >
                              {baixo ? "Baixo" : "OK"}
                            </span>
                          </TableCell>

                          <TableCell className="text-right px-8">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={loading}
                                onClick={() => adjustQuantidade(p, -1)}
                                className="rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-[#eef6f6]"
                              >
                                <Minus size={18} />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={loading}
                                onClick={() => adjustQuantidade(p, +1)}
                                className="rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-[#eef6f6]"
                              >
                                <Plus size={18} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "HISTORICO" && (
        <Card className="border border-[#d9eeee] shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-[#eef6f6] py-7 px-8">
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
              Histórico de Retiradas
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
              Retiradas registradas automaticamente (semana: {historicoRetiradasSemana.length})
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#f7ffff]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="px-8">Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {historico.filter((h) => h.type === "out").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <PackageSearch size={64} className="opacity-10" />
                        <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">
                          Nenhuma retirada registrada
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  historico
                    .filter((h) => h.type === "out")
                    .map((h) => (
                      <TableRow
                        key={h.id}
                        className="hover:bg-[#fbffff] transition-all duration-300 border-[#eef6f6]"
                      >
                        <TableCell className="px-8 py-5 font-bold text-slate-600">
                          {new Date(h.created_at).toLocaleString("pt-BR")}
                        </TableCell>

                        <TableCell className="font-black text-slate-800">
                          {h.inventory?.name ?? h.product_id}
                        </TableCell>

                        <TableCell className="font-black text-rose-600">
                          {h.quantity}
                        </TableCell>

                        <TableCell className="text-slate-600 font-bold">
                          {h.responsible || "-"}
                        </TableCell>

                        <TableCell>
                          <span className="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                            Saída
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-xl border border-[#d9eeee] shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#eef6f6]">
              <div>
                <CardTitle className="text-[#239d9a]">Nova Entrada</CardTitle>
                <CardDescription>
                  Cadastre um novo material no estoque.
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full"
              >
                <X size={20} />
              </Button>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleNovaEntrada} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    Produto
                  </label>
                  <Input
                    required
                    className="rounded-xl h-12 border-[#d9eeee]"
                    value={newProduto.name}
                    onChange={(e) =>
                      setNewProduto((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Ex: Resina composta A2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      Categoria
                    </label>
                    <Input
                      className="rounded-xl h-12 border-[#d9eeee]"
                      value={newProduto.category}
                      onChange={(e) =>
                        setNewProduto((p) => ({ ...p, category: e.target.value }))
                      }
                      placeholder="Ex: Materiais"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      Estoque Mínimo
                    </label>
                    <Input
                      type="number"
                      min={0}
                      className="rounded-xl h-12 border-[#d9eeee]"
                      value={newProduto.min_stock}
                      onChange={(e) =>
                        setNewProduto((p) => ({
                          ...p,
                          min_stock: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    Quantidade Inicial
                  </label>
                  <Input
                    type="number"
                    min={0}
                    className="rounded-xl h-12 border-[#d9eeee]"
                    value={newProduto.quantity}
                    onChange={(e) =>
                      setNewProduto((p) => ({
                        ...p,
                        quantity: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl h-12 font-bold border-[#d9eeee]"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#7ccfce] text-white rounded-xl h-12 font-bold shadow-sm"
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : "Confirmar Entrada"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}