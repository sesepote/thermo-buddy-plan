/** Perfil táctil por pasos inspirado en el instrumento T5000; el motor sigue siendo Program/Segment. */
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
  const w = Math.max(880, steps.length * 128);
  const left = 48, right = w - 24;
  const span = (right - left) / Math.max(steps.length, 1);
  const y = (t: number) => 300 - Math.max(0, Math.min(105, t)) / 105 * 226;
  const pts = steps.map(({ step }, i) => ({ x1: left + i * span + 20, x2: left + (i + 1) * span - 20, y: y(step.temp) }));
  const path = pts.map((p, i) => `${i ? `L ${p.x1} ${p.y}` : `M ${p.x1} ${p.y}`} L ${p.x2} ${p.y}`).join(" ");
  return <div className="min-w-0 overflow-hidden border border-border bg-lcd" aria-label="Perfil térmico">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 font-mono text-xs">
      <span className="text-lcd-foreground">● PERFIL TÉRMICO <span className="ml-2 text-muted-foreground">{steps.length} PASOS · {program.sampleVolume ?? 25} µL</span></span>
      <div className="flex flex-wrap gap-2">{program.stages.map((st, si) => st.repeats > 1 && <Button key={st.id} variant="outline" className="h-9 border-amber/40 bg-amber/10 text-amber" disabled={locked} onClick={() => onCycles(si)}><Repeat2 /> Etapa {si + 1}: {st.repeats}×</Button>)}</div>
    </div>
    <div className="overflow-x-auto">
      <div style={{ width: w }}>
        <svg viewBox={`0 0 ${w} 360`} className="h-[310px] w-full sm:h-[360px]" role="img" aria-label="Curva de temperaturas por pasos">
          {[4, 37, 55, 72, 95, 105].map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="4 5" /><text x={left - 7} y={y(t) + 4} textAnchor="end" fill="var(--lcd-dim)" fontSize="11">{t}°</text></g>)}
          {steps.map(({stage, si, pi}, i) => {
            if (pi !== 0 || stage.repeats <= 1) return null;
            const n = stage.steps.length;
            const first = pts[i], last = pts[i + n - 1];
            if (!first || !last) return null;
            return <g key={stage.id}><rect x={first.x1 - 5} y="25" width={last.x2 - first.x1 + 10} height="286" fill="var(--amber)" fillOpacity="0.045" stroke="var(--amber)" strokeOpacity="0.35" strokeDasharray="4 4" rx="5" /><text x={(first.x1 + last.x2)/2} y="18" textAnchor="middle" fill="var(--amber)" fontSize="12">{stage.repeats}× CICLOS</text></g>;
          })}
          <path d={path} fill="none" stroke="var(--lcd-foreground)" strokeWidth="3" strokeLinejoin="round" />
          {steps.map(({step, si, pi}, i) => { const p = pts[i]; if (!p) return null; const active = current?.si === si && current?.pi === pi; const chosen = selected.si === si && selected.pi === pi;
            return <g key={step.id} onClick={() => onSelect({ si, pi })} className="cursor-pointer">
              <rect x={left + i * span} y="30" width={span} height="285" fill="transparent" />
              {chosen && <rect x={p.x1 - 7} y={p.y - 11} width={p.x2 - p.x1 + 14} height="22" rx="4" fill="var(--ice)" fillOpacity="0.24" stroke="var(--ice)" />}
              {active && <circle cx={(p.x1+p.x2)/2} cy={p.y} r="11" fill="var(--run)" fillOpacity="0.5" />}
              {step.gradient && <rect x={p.x1} y={y(step.gradient.high)} width={p.x2-p.x1} height={Math.max(5,y(step.gradient.low)-y(step.gradient.high))} fill="var(--amber)" fillOpacity="0.25" stroke="var(--amber)" strokeDasharray="3 3" />}
              <circle cx={(p.x1+p.x2)/2} cy={p.y} r="5" fill="var(--lcd-foreground)" />
              <text x={(p.x1+p.x2)/2} y={p.y-20} textAnchor="middle" fill="var(--foreground)" fontSize="13" fontWeight="bold">{step.temp.toFixed(1)}°</text>
              <text x={(p.x1+p.x2)/2} y={Math.min(324,p.y+24)} textAnchor="middle" fill="var(--ice)" fontSize="12">{formatTime(step.time)}</text>
              <text x={(p.x1+p.x2)/2} y="342" textAnchor="middle" fill={chosen ? "var(--ice)" : "var(--muted-foreground)"} fontSize="11">{step.label.slice(0,17)}</text>
            </g>;
          })}
        </svg>
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
