"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  draftItem: any;
  setDraftItem: any;
};

type ToothSelection = {
  tooth: string;
  faces: string[];
};

type TabType = "permanentes" | "deciduos";

const dentesSuperioresPermanentes = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const dentesInferioresPermanentes = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const dentesSuperioresDeciduos = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const dentesInferioresDeciduos = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

function normalizeFaces(faceString: string) {
  if (!faceString) return [];
  return faceString
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

function parseMultipleSelection(valueTooth: string, valueFace: string): ToothSelection[] {
  if (!valueTooth) return [];

  const teeth = valueTooth
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (teeth.length <= 1) {
    return teeth.map((tooth) => ({
      tooth,
      faces: normalizeFaces(valueFace),
    }));
  }

  if (!String(valueFace || "").includes("|")) {
    return teeth.map((tooth) => ({
      tooth,
      faces: [],
    }));
  }

  const faceMap = new Map<string, string[]>();

  String(valueFace)
    .split("|")
    .forEach((entry) => {
      const [tooth, faces] = entry.split(":");
      if (tooth?.trim()) {
        faceMap.set(tooth.trim(), normalizeFaces(faces || ""));
      }
    });

  return teeth.map((tooth) => ({
    tooth,
    faces: faceMap.get(tooth) || [],
  }));
}

function serializeSelections(selections: ToothSelection[]) {
  const teeth = selections.map((s) => s.tooth).join(", ");

  if (selections.length === 1) {
    const first = selections[0];
    return {
      tooth: teeth,
      face: first?.faces.join(", ") || "",
    };
  }

  const encodedFaces = selections
    .map((s) => `${s.tooth}:${s.faces.join(", ")}`)
    .join("|");

  return { tooth: teeth, face: encodedFaces };
}

function getFaceSides(tooth: number) {
  const quadranteEsquerdoDaTela =
    (tooth >= 11 && tooth <= 18) ||
    (tooth >= 41 && tooth <= 48) ||
    (tooth >= 51 && tooth <= 55) ||
    (tooth >= 81 && tooth <= 85);

  return quadranteEsquerdoDaTela
    ? { esquerda: "D", direita: "M" }
    : { esquerda: "M", direita: "D" };
}

function FaceCell({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-md border text-[8px] font-bold transition ${
        active
          ? "bg-[#21b8b4] border-[#16918e] text-white shadow-sm"
          : "bg-white border-[#d9eeee] text-slate-600 hover:bg-[#eefafa]"
      } w-5 h-5`}
    >
      {label}
    </button>
  );
}

function GeometricTooth({
  tooth,
  selectedFaces,
  onToggleTooth,
  onToggleFace,
}: {
  tooth: number;
  selectedFaces: string[];
  onToggleTooth: () => void;
  onToggleFace: (face: string) => void;
}) {
  const selected = selectedFaces.length > 0;
  const { esquerda, direita } = getFaceSides(tooth);

  return (
    <div
      className={`flex flex-col items-center rounded-2xl border p-1.5 w-[48px] transition ${
        selected
          ? "border-[#1db7b3] bg-[#f4ffff] shadow-sm"
          : "border-[#d9eeee] bg-white hover:bg-[#fbffff]"
      }`}
    >
      <button
        type="button"
        onClick={onToggleTooth}
        className={`text-[10px] font-black mb-1.5 leading-none ${
          selected ? "text-[#178f8c]" : "text-slate-800"
        }`}
      >
        {tooth}
      </button>

      <div className="grid grid-cols-3 gap-1">
        <div />
        <FaceCell
          label="V"
          active={selectedFaces.includes("V")}
          onClick={() => onToggleFace("V")}
        />
        <div />

        <FaceCell
          label={esquerda}
          active={selectedFaces.includes(esquerda)}
          onClick={() => onToggleFace(esquerda)}
        />
        <FaceCell
          label="O"
          active={selectedFaces.includes("O")}
          onClick={() => onToggleFace("O")}
        />
        <FaceCell
          label={direita}
          active={selectedFaces.includes(direita)}
          onClick={() => onToggleFace(direita)}
        />

        <div />
        <FaceCell
          label="L"
          active={selectedFaces.includes("L")}
          onClick={() => onToggleFace("L")}
        />
        <div />
      </div>
    </div>
  );
}

export default function OdontogramaNovo({ draftItem, setDraftItem }: Props) {
  const [selections, setSelections] = useState<ToothSelection[]>([]);
  const [tab, setTab] = useState<TabType>("permanentes");

  useEffect(() => {
    setSelections(parseMultipleSelection(draftItem.tooth || "", draftItem.face || ""));
  }, []);

  useEffect(() => {
    const serialized = serializeSelections(selections);
    setDraftItem((prev: any) => ({
      ...prev,
      tooth: serialized.tooth,
      face: serialized.face,
    }));
  }, [selections, setDraftItem]);

  const resumo = useMemo(() => {
    if (selections.length === 0) return "-";
    return selections
      .map((s) => `${s.tooth}${s.faces.length ? ` (${s.faces.join(", ")})` : ""}`)
      .join(" • ");
  }, [selections]);

  const toggleTooth = (tooth: number) => {
    setSelections((prev) => {
      const exists = prev.find((s) => s.tooth === String(tooth));
      if (exists) {
        return prev.filter((s) => s.tooth !== String(tooth));
      }
      return [...prev, { tooth: String(tooth), faces: [] }];
    });
  };

  const toggleFaceForTooth = (tooth: number, face: string) => {
    setSelections((prev) => {
      const exists = prev.find((s) => s.tooth === String(tooth));

      if (!exists) {
        return [...prev, { tooth: String(tooth), faces: [face] }];
      }

      const nextFaces = exists.faces.includes(face)
        ? exists.faces.filter((f) => f !== face)
        : [...exists.faces, face];

      if (nextFaces.length === 0) {
        return prev.filter((s) => s.tooth !== String(tooth));
      }

      return prev.map((s) =>
        s.tooth === String(tooth) ? { ...s, faces: nextFaces } : s
      );
    });
  };

  const superiores = tab === "permanentes" ? dentesSuperioresPermanentes : dentesSuperioresDeciduos;
  const inferiores = tab === "permanentes" ? dentesInferioresPermanentes : dentesInferioresDeciduos;

  return (
    <div className="bg-white border border-[#d9eeee] rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            Odontograma interativo
          </div>
          <div className="text-xs text-slate-400">
            Clique no número para ligar ou desligar o dente. Clique nas faces para marcar.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelections([])}
          className="px-3 py-2 rounded-xl border border-[#f2caca] bg-white text-xs font-semibold text-rose-500 hover:bg-rose-50 transition"
        >
          Limpar
        </button>
      </div>

      <div className="flex gap-6 text-sm border-b border-[#eef6f6] mb-4">
        <button
          type="button"
          onClick={() => setTab("permanentes")}
          className={`pb-3 border-b-2 font-semibold ${
            tab === "permanentes"
              ? "border-[#1db7b3] text-[#1b8f8d]"
              : "border-transparent text-slate-500"
          }`}
        >
          PERMANENTES
        </button>

        <button
          type="button"
          onClick={() => setTab("deciduos")}
          className={`pb-3 border-b-2 font-semibold ${
            tab === "deciduos"
              ? "border-[#1db7b3] text-[#1b8f8d]"
              : "border-transparent text-slate-500"
          }`}
        >
          DECÍDUOS
        </button>
      </div>

      <div className="space-y-5 overflow-x-auto">
        <div className={`space-y-5 ${tab === "permanentes" ? "min-w-[820px]" : "min-w-[560px]"}`}>
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Arcada superior
            </div>
            <div className="flex items-start justify-center gap-1 mx-auto">
              {superiores.map((tooth) => {
                const selection = selections.find((s) => s.tooth === String(tooth));
                return (
                  <GeometricTooth
                    key={tooth}
                    tooth={tooth}
                    selectedFaces={selection?.faces || []}
                    onToggleTooth={() => toggleTooth(tooth)}
                    onToggleFace={(face) => toggleFaceForTooth(tooth, face)}
                  />
                );
              })}
            </div>
          </div>

          <div className="border-t border-dashed border-[#d9eeee]" />

          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Arcada inferior
            </div>
            <div className="flex items-start justify-center gap-1 mx-auto">
              {inferiores.map((tooth) => {
                const selection = selections.find((s) => s.tooth === String(tooth));
                return (
                  <GeometricTooth
                    key={tooth}
                    tooth={tooth}
                    selectedFaces={selection?.faces || []}
                    onToggleTooth={() => toggleTooth(tooth)}
                    onToggleFace={(face) => toggleFaceForTooth(tooth, face)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#f7ffff] border border-[#d9eeee] px-4 py-3 text-sm text-slate-700">
        Seleção atual: <span className="font-bold text-slate-900">{resumo}</span>
      </div>
    </div>
  );
}
