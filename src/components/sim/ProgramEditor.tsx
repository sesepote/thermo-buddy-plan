/**
 * Editor táctil de programas. Se usa en el termociclador y en la zona de
 * entrenamiento. Cada valor se toca para abrir el teclado numérico.
 * El editor es "controlado": recibe el programa y devuelve una copia
 * modificada mediante `onChange` (nunca muta el original).
 */
import { useState } from "react";
import { Plus, Trash2, Thermometer, Repeat, ArrowDownRight, Columns3 } from "lucide-react";
import type { Program, Stage, Step } from "@/lib/pcr/types";
import { formatTime, uid } from "@/lib/pcr/types";
import { NumPad, type NumPadRequest } from "./NumPad";
import { cn } from "@/lib/utils";

interface Props {
  program: Program;
  onChange: (p: Program) => void;
  /** Oculta funciones avanzadas (gradiente) si no se necesitan. */
  allowGradient?: boolean;
}

export function ProgramEditor({ program, onChange, allowGradient = true }: Props) {
  const [pad, setPad] = useState<NumPadRequest | null>(null);

  // --- Utilidades inmutables para modificar etapas y pasos ---------------
  const updateStage = (si: number, fn: (s: Stage) => Stage) =>
    onChange({ ...program, stages: program.stages.map((s, i) => (i === si ? fn(s) : s)) });
  const updateStep = (si: number, pi: number, patch: Partial<Step>) =>
    updateStage(si, (s) => ({ ...s, steps: s.steps.map((x, i) => (i === pi ? { ...x, ...patch } : x)) }));
  const removeStep = (si: number, pi: number) => {
    const st = program.stages[si]!;
    if (st.steps.length === 1) onChange({ ...program, stages: program.stages.filter((_, i) => i !== si) });
    else updateStage(si, (s) => ({ ...s, steps: s.steps.filter((_, i) => i !== pi) }));
  };
  const addStep = (si: number) =>
    updateStage(si, (s) => ({ ...s, steps: [...s.steps, { id: uid(), label: "Paso", temp: 72, time: 30 }] }));
  const addStage = () => {
    const stages = [...program.stages];
    // Inserta antes del hold final si existe.
    const last = stages.at(-1);
    const idx = last && last.steps.at(-1)?.time === 0 ? stages.length - 1 : stages.length;
    stages.splice(idx, 0, { id: uid(), repeats: 1, steps: [{ id: uid(), label: "Paso", temp: 72, time: 60 }] });
    onChange({ ...program, stages });
  };

  const field = "hw-key flex min-h-12 items-center justify-center gap-1 rounded-md px-3 font-mono text-lg";

  return (
    <div className="space-y-4">
      {/* Parámetros generales del programa */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={program.name}
          onChange={(e) => onChange({ ...program, name: e.target.value })}
          className="h-12 min-w-0 flex-1 rounded-md border bg-input/40 px-3 text-lg"
          aria-label="Nombre del programa"
        />
        <button className={field} onClick={() => setPad({ title: "Temperatura de la tapa", value: program.lidTemp, unit: "°C", min: 30, max: 115, onConfirm: (v) => onChange({ ...program, lidTemp: v }) })}>
          <span className="text-xs text-muted-foreground">TAPA</span> {program.lidTemp}°C
        </button>
        <button className={field} onClick={() => setPad({ title: "Velocidad de rampa", value: program.rampRate, unit: "°C/s", allowDecimal: true, min: 0.1, max: 6, onConfirm: (v) => onChange({ ...program, rampRate: v }) })}>
          <span className="text-xs text-muted-foreground">RAMPA</span> {program.rampRate}°C/s
        </button>
      </div>

      {/* Etapas en horizontal, como en la pantalla de un termociclador */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {program.stages.map((stage, si) => (
          <div key={stage.id} className="flex shrink-0 flex-col gap-2 rounded-lg border bg-panel p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etapa {si + 1}</span>
              <button
                className={cn(field, "min-h-10 text-base", stage.repeats > 1 && "text-amber")}
                onClick={() => setPad({ title: `Repeticiones de la etapa ${si + 1}`, value: stage.repeats, unit: "×", min: 1, max: 99, onConfirm: (v) => updateStage(si, (s) => ({ ...s, repeats: Math.round(v) })) })}
              >
                <Repeat className="size-4" /> {stage.repeats}×
              </button>
            </div>
            <div className="flex gap-2">
              {stage.steps.map((step, pi) => (
                <div key={step.id} className="flex w-44 flex-col gap-2 rounded-md bg-background/60 p-2">
                  <input
                    value={step.label}
                    onChange={(e) => updateStep(si, pi, { label: e.target.value })}
                    className="h-9 rounded border-0 bg-transparent px-1 text-sm text-muted-foreground"
                    aria-label="Nombre del paso"
                  />
                  <button className={field} onClick={() => setPad({ title: `${step.label}: temperatura`, value: step.temp, unit: "°C", allowDecimal: true, min: 4, max: 100, onConfirm: (v) => updateStep(si, pi, { temp: v }) })}>
                    <Thermometer className="size-4 text-amber" /> {step.temp}°C
                  </button>
                  <button className={field} onClick={() => setPad({ title: `${step.label}: tiempo`, value: step.time, unit: "s", time: true, min: 0, max: 36000, onConfirm: (v) => updateStep(si, pi, { time: Math.round(v) }) })}>
                    {formatTime(step.time)}
                  </button>
                  <div className="flex gap-2">
                    <button
                      className={cn(field, "min-h-10 flex-1 text-sm", step.deltaPerCycle && "text-amber")}
                      aria-label="Variación por ciclo (touchdown)"
                      onClick={() => setPad({ title: "Δ temperatura por ciclo (touchdown)", value: step.deltaPerCycle ?? 0, unit: "°C", allowNegative: true, allowDecimal: true, min: -5, max: 5, onConfirm: (v) => updateStep(si, pi, { deltaPerCycle: v || undefined }) })}
                    >
                      <ArrowDownRight className="size-4" /> {step.deltaPerCycle ?? 0}
                    </button>
                    {allowGradient && (
                      <button
                        className={cn(field, "min-h-10 px-2", step.gradient && "bg-none bg-amber text-amber-foreground")}
                        aria-label="Gradiente"
                        onClick={() => updateStep(si, pi, { gradient: step.gradient ? undefined : { low: step.temp - 5, high: step.temp + 5 } })}
                      >
                        <Columns3 className="size-4" />
                      </button>
                    )}
                    <button className={cn(field, "min-h-10 px-2 text-destructive")} aria-label="Eliminar paso" onClick={() => removeStep(si, pi)}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {step.gradient && (
                    <div className="flex gap-1 text-sm">
                      <button className={cn(field, "min-h-10 flex-1 px-1 text-sm")} onClick={() => setPad({ title: "Gradiente: mínimo", value: step.gradient!.low, unit: "°C", allowDecimal: true, min: 30, max: 99, onConfirm: (v) => updateStep(si, pi, { gradient: { ...step.gradient!, low: v } }) })}>
                        {step.gradient.low}
                      </button>
                      <button className={cn(field, "min-h-10 flex-1 px-1 text-sm")} onClick={() => setPad({ title: "Gradiente: máximo", value: step.gradient!.high, unit: "°C", allowDecimal: true, min: 30, max: 99, onConfirm: (v) => updateStep(si, pi, { gradient: { ...step.gradient!, high: v } }) })}>
                        {step.gradient.high}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => addStep(si)} className="hw-key flex w-12 items-center justify-center rounded-md" aria-label="Añadir paso">
                <Plus className="size-5" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={addStage} className="hw-key flex w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-lg text-sm">
          <Plus className="size-6" /> Etapa
        </button>
      </div>
      <NumPad req={pad} onClose={() => setPad(null)} />
    </div>
  );
}
