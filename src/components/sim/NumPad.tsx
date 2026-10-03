/**
 * Teclado numérico táctil en un diálogo modal. Sustituye al teclado del
 * sistema en el kiosco: botones grandes y unidades claras.
 * Para tiempos permite introducir en segundos o minutos.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface NumPadRequest {
  title: string;
  value: number;
  unit: string;
  /** Campo de tiempo: muestra selector seg/min y permite 0 = ∞. */
  time?: boolean;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  onConfirm: (v: number) => void;
}

export function NumPad({ req, onClose }: { req: NumPadRequest | null; onClose: () => void }) {
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState(false);
  const [error, setError] = useState("");

  // Al abrir, carga el valor actual.
  useEffect(() => {
    if (!req) return;
    const useMin = !!req.time && req.value >= 120 && req.value % 60 === 0;
    setMinutes(useMin);
    setText(String(useMin ? req.value / 60 : req.value));
    setError("");
  }, [req]);

  if (!req) return null;

  const press = (k: string) => {
    setError("");
    if (k === "⌫") return setText((t) => t.slice(0, -1));
    if (k === "±") return setText((t) => (t.startsWith("-") ? t.slice(1) : "-" + t));
    if (k === "." && text.includes(".")) return;
    setText((t) => (t === "0" && k !== "." ? k : t + k).slice(0, 8));
  };

  const confirm = () => {
    let v = parseFloat(text || "0");
    if (Number.isNaN(v)) return setError("Valor no válido");
    if (req.time && minutes) v = v * 60;
    if (req.min !== undefined && v < req.min) return setError(`Mínimo ${req.min} ${req.unit}`);
    if (req.max !== undefined && v > req.max) return setError(`Máximo ${req.max} ${req.unit}`);
    req.onConfirm(Math.round(v * 10) / 10);
    onClose();
  };

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", req.allowNegative ? "±" : req.allowDecimal ? "." : "", "0", "⌫"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-panel">
        <DialogHeader>
          <DialogTitle>{req.title}</DialogTitle>
          <DialogDescription>{req.time ? "0 = indefinido (∞)" : `Unidad: ${req.unit}`}</DialogDescription>
        </DialogHeader>
        <div className="lcd lcd-glow flex h-20 items-center justify-end rounded-md px-4 text-4xl">
          {text || "0"}
          <span className="ml-2 text-lg text-lcd-dim">{req.time ? (minutes ? "min" : "s") : req.unit}</span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {req.time && (
          <div className="grid grid-cols-2 gap-2">
            {[false, true].map((m) => (
              <button
                key={String(m)}
                onClick={() => setMinutes(m)}
                className={cn("hw-key h-12 rounded-md font-mono", minutes === m && "bg-none bg-amber text-amber-foreground")}
              >
                {m ? "Minutos" : "Segundos"}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((k, i) =>
            k ? (
              <button key={i} onClick={() => press(k)} className="hw-key h-16 rounded-md font-mono text-2xl">
                {k}
              </button>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="hw-key h-14 rounded-md text-lg">Cancelar</button>
          <button onClick={confirm} className="h-14 rounded-md bg-run text-lg font-semibold text-run-foreground active:translate-y-0.5">
            Aceptar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
