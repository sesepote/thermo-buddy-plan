/** Perfil térmico táctil: siete columnas visibles; el modelo Program/Segment no cambia. */
import { Button } from "@/components/ui/button";
import type { Program } from "@/lib/pcr/types";
import { formatTime } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";
import { Repeat2, Flame } from "lucide-react";

export interface StepPosition { si: number; pi: number }
export function ThermalProfile({ program, selected, current, cycle, onSelect, onCycles, onGradient, onTemperature, onTime, locked }: {
  program: Program; selected: StepPosition; current?: StepPosition | undefined; cycle?: number | undefined;
  onSelect: (p: StepPosition) => void; onCycles: (si: number) => void; onGradient: (p: StepPosition) => void; onTemperature: (p: StepPosition) => void; onTime: (p: StepPosition) => void; locked: boolean;
}) {
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

  return <div className="min-w-0 overflow-hidden border border-border bg-lcd" aria-label="Perfil térmico">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 font-mono text-xs">
      <span className="text-lcd-foreground">● PERFIL TÉRMICO <span className="ml-2 text-muted-foreground">{steps.length} PASOS · {program.sampleVolume ?? 25} µL</span></span>
      <div className="flex flex-wrap gap-2">{program.stages.map((st, si) => st.repeats > 1 && <Button key={st.id} variant="outline" className="h-9 border-amber/40 bg-amber/10 text-amber" disabled={locked} onClick={() => onCycles(si)}><Repeat2 /> Etapa {si + 1}: {st.repeats}×</Button>)}</div>
    </div>
    <div className="overflow-x-auto">
      <div className="relative h-[390px] w-full" style={{ minWidth: width }}>
        <svg viewBox={`0 0 ${width} 390`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Curva de temperaturas por pasos, siete columnas visibles">
          {Array.from({ length: columns }, (_, i) => <line key={`col-${i}`} x1={left + i * span} x2={left + i * span} y1="44" y2="342" stroke="var(--border)" strokeOpacity="0.55" />)}
          {[4, 37, 55, 72, 95, 105].map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="4 5" /><text x={left - 8} y={y(t) + 5} textAnchor="end" fill="var(--lcd-foreground)" fontSize="15">{t}°</text></g>)}
          {steps.map(({ stage, si, pi }, i) => {
            if (pi !== 0 || stage.repeats <= 1) return null;
            const first = points[i], last = points[i + stage.steps.length - 1];
            if (!first || !last) return null;
            return <rect key={stage.id} x={first.x1 - 10} y="43" width={last.x2 - first.x1 + 20} height="300" fill="var(--amber)" fillOpacity="0.045" stroke="var(--amber)" strokeOpacity="0.35" strokeDasharray="4 4" rx="5" />;
          })}
          <path d={path} fill="none" stroke="var(--lcd-foreground)" strokeWidth="3" strokeLinejoin="round" />
          {steps.map(({ step, si, pi }, i) => { const p = points[i]; if (!p) return null; const active = current?.si === si && current?.pi === pi; const chosen = selected.si === si && selected.pi === pi;
            return <g key={step.id}>
              {chosen && <rect x={p.x1 - 7} y={p.y - 11} width={p.x2 - p.x1 + 14} height="22" rx="4" fill="var(--ice)" fillOpacity="0.24" stroke="var(--ice)" />}
              {active && <circle cx={(p.x1+p.x2)/2} cy={p.y} r="11" fill="var(--run)" fillOpacity="0.5" />}
              {step.gradient && <rect x={p.x1} y={y(step.gradient.high)} width={p.x2-p.x1} height={Math.max(5,y(step.gradient.low)-y(step.gradient.high))} fill="var(--amber)" fillOpacity="0.25" stroke="var(--amber)" strokeDasharray="3 3" />}
              <circle cx={(p.x1+p.x2)/2} cy={p.y} r="5" fill="var(--lcd-foreground)" />
            </g>;
          })}
        </svg>
        {steps.map(({ stage, step, si, pi }, i) => {
          const point = points[i]; if (!point) return null;
          const pos = { si, pi };
          const center = percent((point.x1 + point.x2) / 2);
          return <div key={step.id}>
            {pi === 0 && stage.repeats > 1 && <Button variant="ghost" disabled={locked} aria-label={`Ciclos etapa ${si + 1}: ${stage.repeats}`} className="absolute top-0 h-10 -translate-x-1/2 px-2 font-mono text-base font-bold text-amber" style={{ left: percent((point.x1 + (points[i + stage.steps.length - 1]?.x2 ?? point.x2)) / 2) }} onClick={() => onCycles(si)}>{stage.repeats}× <Repeat2 /></Button>}
            <Button variant="ghost" disabled={locked} aria-label={`Temperatura ${step.label}: ${step.temp.toFixed(1)} grados`} className="absolute h-11 -translate-x-1/2 px-2 font-mono text-xl font-bold tabular-nums text-lcd-foreground" style={{ left: center, top: point.y - 59 }} onClick={() => { onSelect(pos); onTemperature(pos); }}>{step.temp.toFixed(1)}°</Button>
            <Button variant="ghost" disabled={locked} aria-label={`Tiempo ${step.label}: ${formatTime(step.time)}`} className="absolute h-11 -translate-x-1/2 px-2 font-mono text-lg font-semibold tabular-nums text-ice" style={{ left: center, top: point.y + 11 }} onClick={() => { onSelect(pos); onTime(pos); }}>{formatTime(step.time)}</Button>
            <Button variant="ghost" aria-pressed={selected.si === si && selected.pi === pi} className={cn("absolute top-[344px] h-11 max-w-[142px] -translate-x-1/2 truncate px-1 font-mono text-sm", selected.si === si && selected.pi === pi ? "text-ice" : "text-muted-foreground")} style={{ left: center }} onClick={() => onSelect(pos)} title={step.label}>#{i + 1} {step.label}</Button>
          </div>;
        })}
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto border-t border-border p-3">{steps.map(({step,si,pi},i) => <div key={step.id} className={cn("flex shrink-0 flex-col gap-1 border-l-2 px-2", current?.si === si && current?.pi === pi ? "border-run" : selected.si === si && selected.pi === pi ? "border-ice" : "border-border")}>
      <Button variant="ghost" aria-pressed={selected.si === si && selected.pi === pi} className="h-10 justify-start px-1 font-mono text-xs" onClick={() => onSelect({si,pi})}>#{i+1} {step.label}</Button>
      <div className="flex gap-1"><Button variant="ghost" disabled={locked} className="h-9 px-1 font-mono text-xs text-ice" aria-label={`Temperatura ${step.label}`} onClick={() => onTemperature({si,pi})}>{step.temp}°</Button><Button variant="ghost" disabled={locked} className="h-9 px-1 font-mono text-xs text-ice" aria-label={`Tiempo ${step.label}`} onClick={() => onTime({si,pi})}>{formatTime(step.time)}</Button></div>
      {step.gradient && <Button variant="ghost" disabled={locked} className="h-8 justify-start px-1 text-amber" onClick={() => onGradient({si,pi})}><Flame /> Gradiente</Button>}
    </div>)}</div>
    {cycle && <p className="border-t border-border px-4 py-2 font-mono text-xs text-amber">CICLO {cycle}</p>}
  </div>;
}
