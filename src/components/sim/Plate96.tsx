/** Vista táctil del bloque de 96 pocillos; usa el mismo gradiente que el simulador. */
import { useState } from "react";
import { gradientColumns } from "@/lib/pcr/simulation";
import type { Step } from "@/lib/pcr/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Plate96({ step, temperature }: { step: Step; temperature: number }) {
  const [selected, setSelected] = useState({ row: 3, col: 5 });
  const columns = step.gradient ? gradientColumns(step) : Array(12).fill(temperature) as number[];
  const rows = "ABCDEFGH";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 font-mono text-xs">
        <span className="text-muted-foreground">BLOQUE 96 POCILLOS · {step.gradient ? `GRADIENTE ${step.gradient.low}–${step.gradient.high} °C` : "TEMPERATURA UNIFORME"}</span>
        <span className="text-ice">{rows[selected.row]}{selected.col + 1} <strong className="ml-2 text-foreground">{columns[selected.col]?.toFixed(1)} °C</strong></span>
      </div>
      <div className="w-full overflow-x-auto pb-2">
        <div className="mx-auto min-w-[560px] max-w-3xl space-y-1.5">
          <div className="grid grid-cols-[24px_repeat(12,minmax(0,1fr))] gap-1.5 text-center font-mono text-[10px] text-muted-foreground">
            <span />{columns.map((temp, col) => <span key={col}>{col + 1}<span className="block text-ice/70">{temp.toFixed(0)}°</span></span>)}
          </div>
          {Array.from(rows).map((row, ri) => (
            <div key={row} className="grid grid-cols-[24px_repeat(12,minmax(0,1fr))] items-center gap-1.5">
              <span className="text-center font-mono text-xs text-muted-foreground">{row}</span>
              {columns.map((temp, ci) => (
                <Button key={ci} type="button" variant="ghost" size="icon" aria-label={`Pozo ${row}${ci + 1}: ${temp.toFixed(1)} °C`} aria-pressed={selected.row === ri && selected.col === ci} onClick={() => setSelected({ row: ri, col: ci })}
                  className={cn("aspect-square h-auto w-full min-h-9 rounded-full border border-ice/25 bg-ice/10 p-0 text-ice active:scale-95", selected.row === ri && selected.col === ci && "border-amber bg-amber/25 text-amber ring-2 ring-amber/30")}>·</Button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="font-mono text-xs text-muted-foreground">{step.label} · {step.gradient ? "La temperatura varía por columna." : "Todos los pocillos muestran la temperatura del bloque."}</p>
    </div>
  );
}
