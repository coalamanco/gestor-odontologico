"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ToothFace = "M" | "D" | "V" | "L" | "O";

interface OdontogramaProps {
  selectedTeeth: number[];
  selectedFacesByTooth: Record<number, ToothFace[]>;
  onToggleTooth: (tooth: number) => void;
  onToggleFace: (tooth: number, face: ToothFace) => void;
  onClearSelection: () => void;
}

const TOOTH_FACE_ORDER: ToothFace[] = ["M", "O", "D", "V", "L"];

const ToothInteractive = ({
  number,
  selected,
  selectedFaces,
  onToggleTooth,
  onToggleFace,
}: {
  number: number;
  selected: boolean;
  selectedFaces: ToothFace[];
  onToggleTooth: (tooth: number) => void;
  onToggleFace: (tooth: number, face: ToothFace) => void;
}) => {
  const isFaceSelected = (face: ToothFace) => selectedFaces.includes(face);
  const hasFaces = selectedFaces.length > 0;

  const faceFill = (face: ToothFace) => (isFaceSelected(face) ? "#961516" : "#ffffff");
  const faceStroke = (face: ToothFace) => (isFaceSelected(face) ? "#630d0d" : "#cbd5e1");

  return (
    <div className={cn("flex flex-col items-center gap-1", selected ? "scale-[1.03]" : "")}>
      <div
        className={cn(
          "rounded-xl border bg-white shadow-sm p-1 transition-colors",
          selected ? "border-[#630d0d]" : "border-slate-200"
        )}
      >
        <svg width="44" height="54" viewBox="0 0 44 54">
          <rect x="0.5" y="0.5" width="43" height="43" rx="10" fill="#ffffff" stroke={selected ? "#630d0d" : "#e2e8f0"} />

          <rect
            x="13"
            y="4"
            width="18"
            height="10"
            rx="4"
            fill={faceFill("V")}
            stroke={faceStroke("V")}
            strokeWidth="1.5"
            onClick={() => onToggleFace(number, "V")}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="13"
            y="30"
            width="18"
            height="10"
            rx="4"
            fill={faceFill("L")}
            stroke={faceStroke("L")}
            strokeWidth="1.5"
            onClick={() => onToggleFace(number, "L")}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="4"
            y="15"
            width="10"
            height="18"
            rx="4"
            fill={faceFill("M")}
            stroke={faceStroke("M")}
            strokeWidth="1.5"
            onClick={() => onToggleFace(number, "M")}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="30"
            y="15"
            width="10"
            height="18"
            rx="4"
            fill={faceFill("D")}
            stroke={faceStroke("D")}
            strokeWidth="1.5"
            onClick={() => onToggleFace(number, "D")}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="15"
            y="15"
            width="14"
            height="18"
            rx="5"
            fill={faceFill("O")}
            stroke={faceStroke("O")}
            strokeWidth="1.5"
            onClick={() => onToggleFace(number, "O")}
            style={{ cursor: "pointer" }}
          />

          {selected && (
            <circle cx="38" cy="6" r="4" fill="#630d0d" stroke="#ffffff" strokeWidth="2" />
          )}

          {hasFaces && (
            <text x="22" y="52" textAnchor="middle" fontSize="9" fontWeight="800" fill="#64748b">
              {selectedFaces
                .slice()
                .sort((a, b) => TOOTH_FACE_ORDER.indexOf(a) - TOOTH_FACE_ORDER.indexOf(b))
                .join("")}
            </text>
          )}
        </svg>
      </div>

      <button
        type="button"
        onClick={() => onToggleTooth(number)}
        className={cn(
          "h-7 px-2 rounded-lg text-[10px] font-black tracking-widest border transition-colors",
          selected ? "bg-[#630d0d] text-white border-[#630d0d]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
        )}
        aria-label={`Selecionar dente ${number}`}
      >
        {number}
      </button>
    </div>
  );
};

export default function Odontograma({ 
  selectedTeeth,
  selectedFacesByTooth,
  onToggleTooth,
  onToggleFace,
  onClearSelection,
}: OdontogramaProps) {
  const [tab, setTab] = useState<"Permanentes" | "Decíduos" | "HOF">("Permanentes");

  const renderTeethRow = (teeth: number[]) => (
    <div className="flex justify-center gap-2">
      {teeth.map(n => (
        <ToothInteractive
          key={n} 
          number={n} 
          selected={selectedTeeth.includes(n)}
          selectedFaces={selectedFacesByTooth[n] ?? []}
          onToggleTooth={onToggleTooth}
          onToggleFace={onToggleFace}
        />
      ))}
    </div>
  );

  const permanentUpperLeft = [18, 17, 16, 15, 14, 13, 12, 11];
  const permanentUpperRight = [21, 22, 23, 24, 25, 26, 27, 28];
  const permanentLowerLeft = [48, 47, 46, 45, 44, 43, 42, 41];
  const permanentLowerRight = [31, 32, 33, 34, 35, 36, 37, 38];

  const deciduousUpperLeft = [55, 54, 53, 52, 51];
  const deciduousUpperRight = [61, 62, 63, 64, 65];
  const deciduousLowerLeft = [85, 84, 83, 82, 81];
  const deciduousLowerRight = [71, 72, 73, 74, 75];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-8 shadow-sm">
      {/* Abas do Odontograma */}
      <div className="flex justify-center gap-2 p-1.5 bg-slate-50 rounded-2xl w-fit mx-auto">
        {["Permanentes", "Decíduos", "HOF"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              tab === t 
                ? "bg-white text-[#630d0d] shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-12 py-4">
        {tab === "Permanentes" && (
          <div className="space-y-10">
            {/* Superior */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Arcada Superior</span>
              <div className="flex gap-8">
                {renderTeethRow(permanentUpperLeft)}
                <div className="w-px bg-slate-100 h-12" />
                {renderTeethRow(permanentUpperRight)}
              </div>
            </div>
            
            {/* Inferior */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-8">
                {renderTeethRow(permanentLowerLeft)}
                <div className="w-px bg-slate-100 h-12" />
                {renderTeethRow(permanentLowerRight)}
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Arcada Inferior</span>
            </div>
          </div>
        )}

        {tab === "Decíduos" && (
          <div className="space-y-10">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Arcada Superior</span>
              <div className="flex gap-8">
                {renderTeethRow(deciduousUpperLeft)}
                <div className="w-px bg-slate-100 h-12" />
                {renderTeethRow(deciduousUpperRight)}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-8">
                {renderTeethRow(deciduousLowerLeft)}
                <div className="w-px bg-slate-100 h-12" />
                {renderTeethRow(deciduousLowerRight)}
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Arcada Inferior</span>
            </div>
          </div>
        )}

        {tab === "HOF" && (
          <div className="flex flex-col items-center justify-center py-10 space-y-6 text-slate-400 italic">
            <div className="w-64 h-80 bg-slate-50 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
              <span className="text-xs uppercase tracking-widest font-black">Mapa Facial HOF</span>
            </div>
            <p className="text-xs">Marcações faciais interativas em breve...</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {selectedTeeth.length > 0 
            ? `Dente(s) Selecionado(s): ${selectedTeeth.sort().join(", ")}` 
            : "Selecione um dente para iniciar"}
        </p>
        {selectedTeeth.length > 0 && (
          <button 
            onClick={onClearSelection}
            className="text-[10px] font-black text-[#630d0d] uppercase tracking-widest hover:underline"
          >
            Limpar Seleção
          </button>
        )}
      </div>
    </div>
  );
}
