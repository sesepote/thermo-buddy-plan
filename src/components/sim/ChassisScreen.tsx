/** Pantalla integrada estándar del modo chasis: columnas numeradas, casillas de temperatura y fila de tiempos.
 * Es solo otra vista del mismo Program; las ediciones usan los mismos callbacks que ThermalProfile. */
import type { Program } from "@/lib/pcr/types";
import { formatTime } from "@/lib/pcr/types";
import type { StepPosition } from "./ThermalProfile";
import { cn } from "@/lib/utils";

type Col = { kind: "step"; si: number; pi: number; n: number; temp: number; time: number } | { kind: "goto"; si: number; target: number; repeats: number };

export function ChassisScreen({ program, selected, current, onSelect, onTemperature, onTime, onCycles, locked }: {
  program: Program; selected: StepPosition; current?: StepPosition | undefined; locked: boolean;
  onSelect: (p: StepPosition) => void; onTemperature: (p: StepPosition) => void; onTime: (p: StepPosition) => void; onCycles: (si: number) => void;
}) {
  const cols: Col[] = [];
  let n = 0;
  program.stages.forEach((stage, si) => {
    const first = n + 1;
    stage.steps.forEach((step, pi) => cols.push({ kind: "step", si, pi, n: ++n, temp: step.temp, time: step.time }));
    if (stage.repeats > 1) cols.push({ kind: "goto", si, target: first, repeats: stage.repeats - 1 });
  });
  const count = Math.max(7, cols.length);
  // Altura relativa (0-100) de una temperatura dentro de la zona del gráfico.
  const y = (t: number) => 92 - Math.max(0, Math.min(105, t)) / 105 * 80;
  const pts = cols.flatMap((c, i) => c.kind === "step" ? [{ x1: i * 100 + 12, x2: i * 100 + 88, y: y(c.temp) }] : []);
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${p.x1} ${p.y} L ${p.x2} ${p.y}`).join(" ");
  const isOn = (c: Col) => c.kind === "step" && (current ? current.si === c.si && current.pi === c.pi : selected.si === c.si && selected.pi === c.pi);
  const grid = { gridTemplateColumns: `repeat(${count}, minmax(96px, 1fr))` };

  return <div className="flex h-full min-h-[360px] flex-col overflow-x-auto bg-screen font-sans text-screen-foreground">
    <div className="grid border-b border-screen-bar/40 bg-screen-column text-center text-sm font-semibold" style={grid}>
      {Array.from({ length: count }, (_, i) => <div key={i} className="border-r border-screen-bar/20 py-1">{i < cols.length ? i + 1 : ""}</div>)}
    </div>
    <div className="relative flex-1">
      <div className="absolute inset-0 grid" style={grid}>
        {Array.from({ length: count }, (_, i) => { const c = cols[i];
          return <button key={i} type="button" disabled={!c || locked} aria-label={c ? `Columna ${i + 1}` : undefined} className={cn("relative border-r border-screen-bar/20", c && isOn(c) ? "bg-screen-active" : "bg-screen")} onClick={() => c && (c.kind === "step" ? onSelect({ si: c.si, pi: c.pi }) : onCycles(c.si))}>
            {c?.kind === "goto" && <span className="absolute inset-x-0 top-[12%] flex flex-col items-center text-base font-bold leading-tight">{"GOTO".split("").map(l => <span key={l}>{l}</span>)}</span>}
          </button>; })}
      </div>
      <svg viewBox={`0 0 ${count * 100} 100`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><path d={path} fill="none" stroke="var(--screen-foreground)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg>
      <div className="pointer-events-none absolute inset-0 grid" style={grid}>
        {cols.map((c, i) => <div key={i} className="relative">
          {c.kind === "step"
            ? <button type="button" disabled={locked} className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -translate-y-full rounded-sm border border-screen-bar/50 bg-screen-tile px-2 py-1 text-sm font-semibold tabular-nums shadow" style={{ top: `${y(c.temp)}%` }} onClick={() => { onSelect({ si: c.si, pi: c.pi }); onTemperature({ si: c.si, pi: c.pi }); }}>{c.temp.toFixed(1)}°C</button>
            : <button type="button" disabled={locked} className="pointer-events-auto absolute left-1/2 top-[70%] -translate-x-1/2 rounded-sm border border-screen-bar/50 bg-screen-tile px-2 py-1 text-sm font-semibold shadow" onClick={() => onCycles(c.si)}>Step {c.target}</button>}
        </div>)}
      </div>
    </div>
    <div className="grid border-t border-screen-bar/40 bg-screen-column text-center text-sm font-semibold tabular-nums" style={grid}>
      {Array.from({ length: count }, (_, i) => { const c = cols[i];
        return <button key={i} type="button" disabled={!c || locked} className="h-10 border-r border-screen-bar/20" onClick={() => c && (c.kind === "step" ? onTime({ si: c.si, pi: c.pi }) : onCycles(c.si))}>{!c ? "" : c.kind === "goto" ? `${c.repeats} X` : c.time === 0 ? "∞" : formatTime(c.time)}</button>; })}
    </div>
  </div>;
}
