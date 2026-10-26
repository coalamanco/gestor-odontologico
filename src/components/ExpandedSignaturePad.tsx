"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (image: string) => void;
};

/** Captura ampliada com Pointer Events: caneta digitalizadora, mouse e toque. */
export default function ExpandedSignaturePad({ open, onClose, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHasInk(false);
    setFullScreen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
    };
  }, [open]);

  if (!open) return null;

  const position = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  };

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    const p = position(event);
    ctx.strokeStyle = "#122a3a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
    drawing.current = true;
    setHasInk(true);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = position(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const up = () => { drawing.current = false; };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    drawing.current = false;
    setHasInk(false);
  };

  return (
    <div className="xp-signature-modal fixed inset-0 z-[2147483646] flex items-center justify-center bg-slate-950/80 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Assinatura ampliada">
      <div className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${fullScreen ? "h-[98dvh] max-w-none" : "max-w-[1500px]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assinatura ampliada</h2>
            <p className="text-xs text-slate-600">Assine com a caneta XP-Pen, mouse ou toque. Depois confirme e salve no documento.</p>
          </div>
          <button type="button" onClick={() => setFullScreen(!fullScreen)} className="rounded-lg border px-3 py-2 text-sm text-slate-700">{fullScreen ? "Janela normal" : "Ampliar janela"}</button>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100 p-2 sm:p-4">
          <canvas
            ref={canvasRef}
            width={1200}
            height={550}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
            className="mx-auto block w-full touch-none cursor-crosshair rounded-xl border-2 border-teal-300 bg-white"
            style={{ aspectRatio: "1200 / 550", maxHeight: fullScreen ? "75dvh" : "65dvh" }}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t px-4 py-3">
          <button type="button" onClick={clear} className="rounded-xl border px-4 py-2 font-semibold text-slate-700">Limpar</button>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 font-semibold text-slate-700">Cancelar</button>
          <button type="button" disabled={!hasInk} onClick={() => { const canvas = canvasRef.current; if (canvas) onConfirm(canvas.toDataURL("image/png")); }} className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white disabled:opacity-40">Confirmar assinatura</button>
        </div>
      </div>
      <style>{`@media print { .xp-signature-modal { display: none !important; } }`}</style>
    </div>
  );
}
