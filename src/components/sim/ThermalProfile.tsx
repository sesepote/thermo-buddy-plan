/** Perfil térmico táctil: siete columnas visibles; el modelo Program/Segment no cambia. */
import { Button } from "@/components/ui/button";
import type { Program } from "@/lib/pcr/types";
import { formatTime } from "@/lib/pcr/types";
import { Repeat2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StepPosition { si: number; pi: number }
export function ThermalProfile({ program, selected, current, cycle, onSelect, onCycles, onLoopRange, onTemperature, onTime, onRename, locked, showHeader = true }: {
  program: Program; selected: StepPosition; current?: StepPosition | undefined; cycle?: number | undefined;
  onSelect: (p: StepPosition) => void; onCycles: (si: number) => void; onLoopRange: (si: number, start: number, end: number) => void; onTemperature: (p: StepPosition) => void; onTime: (p: StepPosition) => void; onRename?: ((p: StepPosition) => void) | undefined; locked: boolean;
  showHeader?: boolean;
}) {
  const graph = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ si: number; edge: "start" | "end"; start: number; end: number } | null>(null);
  const [drag, setDrag] = useState<typeof dragRef.current>(null);
  const steps = program.stages.flatMap((stage, si) => stage.steps.map((step, pi) => ({ stage, step, si, pi })));
  // El ancho mínimo siempre corresponde a siete pasos. Los adicionales se recorren horizontalmente.
  const columns = Math.max(7, steps.length);
  const width = 56 + columns * 150 + 24;
  const left = 56;
  const right = width - 24;
  const span = (right - left) / columns;
  const y = (t: number) => 300 - Math.max(0, Math.min(105, t)) / 105 * 210;
  const points = steps.map(({ step }, i) => ({ x1: left + i * span + 20, x2: left + (i + 1) * span - 20, y: y(step.temp) }));
  const path = points.map((p, i) => `${i ? `L ${p.x1} ${p.y}` : `M ${p.x1} ${p.y}`} L ${p.x2} ${p.y}`).join(" ");
  const percent = (n: number) => `${n / width * 100}%`;
  const loops = steps.flatMap(({ stage, si, pi }, i) => pi === 0 && stage.repeats > 1 ? [{ stage, si, start: drag?.si === si ? drag.start : i, end: drag?.si === si ? drag.end : i + stage.steps.length - 1 }] : []);
  // Pointer capture mantiene el arrastre activo con ratón y con el dedo fuera del tirador.
  const moveEdge = (clientX: number) => {
    const rect = graph.current?.getBoundingClientRect();
    const moving = dragRef.current;
    if (!rect || !moving) return;
    const boundary = Math.round(((clientX - rect.left) / rect.width * width - left) / span);
    const column = Math.max(0, Math.min(steps.length - 1, boundary - (moving.edge === "end" ? 1 : 0)));
    const next = { ...moving, ...(moving.edge === "start" ? { start: Math.min(column, moving.end) } : { end: Math.max(column, moving.start) }) };
    dragRef.current = next; setDrag(next);
  };

  return <div className="min-w-0 overflow-hidden border border-border bg-lcd" aria-label="Perfil térmico">
    {showHeader && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 font-mono text-xs">
      <span className="text-lcd-foreground">● PERFIL TÉRMICO <span className="ml-2 text-muted-foreground">{steps.length} PASOS · {program.sampleVolume ?? 25} µL</span></span>
      <div className="flex flex-wrap gap-2">{loops.map(loop => <Button key={loop.stage.id} variant="outline" className="h-9 border-amber/40 bg-amber/10 text-amber" disabled={locked} onClick={() => onCycles(loop.si)}><Repeat2 /> Columnas {loop.start + 1}–{loop.end + 1}: {loop.stage.repeats}×</Button>)}</div>
    </div>}
    <div className="overflow-x-auto">
      <div ref={graph} className="relative h-[424px] w-full" style={{ minWidth: width }}>
        <svg viewBox={`0 0 ${width} 424`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Curva de temperaturas por pasos, siete columnas visibles">
          {Array.from({ length: columns }, (_, i) => <line key={`col-${i}`} x1={left + i * span} x2={left + i * span} y1="44" y2="342" stroke="var(--border)" strokeOpacity="0.55" />)}
          {[4, 37, 55, 72, 95, 105].map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="4 5" /><text x={left - 8} y={y(t) + 5} textAnchor="end" fill="var(--lcd-foreground)" fontSize="15">{t}°</text></g>)}
          {loops.map(loop => <rect key={loop.stage.id} x={left + loop.start * span} y="43" width={(loop.end - loop.start + 1) * span} height="300" fill="var(--amber)" fillOpacity="0.045" stroke="var(--amber)" strokeOpacity="0.7" strokeDasharray="4 4" rx="5" />)}
          <path d={path} fill="none" stroke="var(--lcd-foreground)" strokeWidth="3" strokeLinejoin="round" />
          {steps.map(({ step, si, pi }, i) => { const p = points[i]; if (!p) return null; const active = current?.si === si && current?.pi === pi; const chosen = selected.si === si && selected.pi === pi;
            return <g key={step.id}>
              {chosen && <rect x={p.x1 - 7} y={p.y - 11} width={p.x2 - p.x1 + 14} height="22" rx="4" fill="var(--ice)" fillOpacity="0.24" stroke="var(--ice)" />}
              {active && <circle cx={(p.x1+p.x2)/2} cy={p.y} r="11" fill="var(--run)" fillOpacity="0.5" />}
              <circle cx={(p.x1+p.x2)/2} cy={p.y} r="5" fill="var(--lcd-foreground)" />
            </g>;
          })}
        </svg>
        {loops.flatMap(loop => (["start", "end"] as const).map(edge => <Button key={`${loop.stage.id}-${edge}`} variant="ghost" disabled={locked} aria-label={`${edge === "start" ? "Inicio" : "Final"} del bucle de columnas ${loop.start + 1} a ${loop.end + 1}`} className="absolute top-[43px] z-10 h-[300px] w-12 -translate-x-1/2 touch-none cursor-ew-resize rounded-none p-0 text-amber hover:bg-transparent hover:text-amber" style={{ left: percent(left + (edge === "start" ? loop.start : loop.end + 1) * span) }}
          onPointerDown={e => { if (locked) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const next = { si: loop.si, edge, start: loop.start, end: loop.end }; dragRef.current = next; setDrag(next); }}
          onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) moveEdge(e.clientX); }}
          onPointerUp={e => { const moving = dragRef.current; if (!moving) return; e.currentTarget.releasePointerCapture(e.pointerId); dragRef.current = null; setDrag(null); onLoopRange(moving.si, moving.start, moving.end); }}
          onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
          onKeyDown={e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); const delta = e.key === "ArrowLeft" ? -1 : 1; onLoopRange(loop.si, edge === "start" ? Math.max(0, Math.min(loop.end, loop.start + delta)) : loop.start, edge === "end" ? Math.min(steps.length - 1, Math.max(loop.start, loop.end + delta)) : loop.end); }}><span className="flex h-12 w-5 items-center justify-center rounded-sm border border-amber bg-panel font-mono text-lg">↔</span></Button>))}
        {steps.map(({ stage, step, si, pi }, i) => {
          const point = points[i]; if (!point) return null;
          const pos = { si, pi };
          const center = percent((point.x1 + point.x2) / 2);
          return <div key={step.id}>
            {/* Toda la columna es táctil: selecciona el paso y muestra la barra azul. */}
            <button type="button" aria-label={`Seleccionar columna ${i + 1}: ${step.label}`} className="absolute top-[43px] h-[300px] cursor-pointer bg-transparent" style={{ left: percent(left + i * span), width: percent(span) }} onClick={() => onSelect(pos)} />
            {/* Nombre del paso bajo cada columna, con la columna número como referencia. */}
            <div className="absolute top-[349px] px-1 text-center" style={{ left: percent(left + i * span), width: percent(span) }}>
              <span className="block font-mono text-[11px] leading-none text-muted-foreground">Col. {i + 1}</span>
              {onRename
                ? <button type="button" aria-label={`Cambiar el nombre de la columna ${i + 1}: ${step.label}`} className="mt-1 line-clamp-2 block w-full cursor-pointer font-mono text-[12px] leading-tight text-lcd-foreground" onClick={() => onRename(pos)}>{step.label}</button>
                : <span className="mt-1 line-clamp-2 block font-mono text-[12px] leading-tight text-lcd-foreground">{step.label}</span>}
            </div>
            {pi === 0 && stage.repeats > 1 && <Button variant="ghost" disabled={locked} aria-label={`Ciclos etapa ${si + 1}: ${stage.repeats}`} className="absolute top-0 h-10 -translate-x-1/2 px-2 font-mono text-base font-bold text-amber" style={{ left: percent((point.x1 + (points[i + stage.steps.length - 1]?.x2 ?? point.x2)) / 2) }} onClick={() => onCycles(si)}>{stage.repeats}× <Repeat2 /></Button>}
            <Button variant="ghost" disabled={locked} aria-label={`Temperatura ${step.label}: ${step.temp.toFixed(1)} grados`} className="absolute h-11 -translate-x-1/2 px-2 font-mono text-xl font-bold tabular-nums text-lcd-foreground" style={{ left: center, top: point.y - 59 }} onClick={() => { onSelect(pos); onTemperature(pos); }}>{step.temp.toFixed(1)}°</Button>
            <Button variant="ghost" disabled={locked} aria-label={`Tiempo ${step.label}: ${formatTime(step.time)}`} className="absolute h-11 -translate-x-1/2 px-2 font-mono text-lg font-semibold tabular-nums text-ice" style={{ left: center, top: point.y + 11 }} onClick={() => { onSelect(pos); onTime(pos); }}>{formatTime(step.time)}</Button>
          </div>;
        })}
      </div>
    </div>
    {cycle && <p className="border-t border-border px-4 py-2 font-mono text-xs text-amber">CICLO {cycle}</p>}
  </div>;
}
