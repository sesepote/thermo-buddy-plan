/**
 * Motor de simulación del termociclador.
 *
 * El programa se "aplana" en una lista de segmentos consecutivos:
 *  - rampa: el bloque cambia de temperatura a `rampRate` °C/s.
 *  - meseta: el bloque se mantiene a la temperatura del paso.
 * Con esa lista podemos saber el estado exacto del equipo en cualquier
 * instante simulado `t` sin acumular errores de integración.
 */
import type { Program, Step } from "./types";

export interface Segment {
  kind: "ramp" | "hold";
  start: number; // segundo de inicio
  duration: number; // Infinity para el hold final
  fromTemp: number;
  toTemp: number;
  stageIndex: number;
  stepIndex: number;
  cycle: number; // 1..repeats
  repeats: number;
  step: Step;
}

/** Temperatura ambiente desde la que arranca el bloque. */
export const AMBIENT = 25;

/** Temperatura real de un paso en un ciclo concreto (aplica touchdown). */
export function stepTempAt(step: Step, cycle: number): number {
  return step.temp + (step.deltaPerCycle ?? 0) * (cycle - 1);
}

/** Convierte el programa en segmentos de rampa + meseta. */
export function buildSegments(program: Program): Segment[] {
  const segs: Segment[] = [];
  let t = 0;
  let temp = AMBIENT;
  const rate = Math.max(program.rampRate, 0.1);

  program.stages.forEach((stage, si) => {
    for (let c = 1; c <= stage.repeats; c++) {
      stage.steps.forEach((step, pi) => {
        const target = stepTempAt(step, c);
        const base = { stageIndex: si, stepIndex: pi, cycle: c, repeats: stage.repeats, step };
        // Rampa hasta la temperatura objetivo.
        const rampDur = Math.abs(target - temp) / Math.max(step.rampRate ?? rate, 0.1);
        if (rampDur > 0) {
          segs.push({ ...base, kind: "ramp", start: t, duration: rampDur, fromTemp: temp, toTemp: target });
          t += rampDur;
        }
        // Meseta (time 0 = infinito).
        const holdDur = step.time > 0 ? Math.max(1, step.time + (step.timeIncrement ?? 0) * (c - 1)) : Infinity;
        segs.push({ ...base, kind: "hold", start: t, duration: holdDur, fromTemp: target, toTemp: target });
        t += holdDur;
        temp = target;
      });
    }
  });
  return segs;
}

/** Duración total finita del programa (sin contar el hold infinito). */
export function totalDuration(segs: Segment[]): number {
  let total = 0;
  for (const s of segs) if (Number.isFinite(s.duration)) total = s.start + s.duration;
  else { total = s.start; break; }
  return total;
}

export interface SimState {
  temp: number;
  segment: Segment | null;
  /** Segundos restantes del paso actual (Infinity en el hold). */
  stepRemaining: number;
  finished: boolean;
}

/** Busca (búsqueda binaria) el segmento activo en el instante `t`. */
export function stateAt(segs: Segment[], t: number): SimState {
  if (!segs.length) return { temp: AMBIENT, segment: null, stepRemaining: 0, finished: true };
  let lo = 0, hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid]!.start <= t) lo = mid; else hi = mid - 1;
  }
  const seg = segs[lo]!;
  const local = Math.max(t - seg.start, 0);
  const temp = seg.kind === "ramp"
    ? seg.fromTemp + (seg.toTemp - seg.fromTemp) * Math.min(local / seg.duration, 1)
    : seg.toTemp;
  // Tiempo restante del paso = resto de la rampa + meseta completa.
  let remaining = seg.duration - local;
  const next = segs[lo + 1];
  if (seg.kind === "ramp" && next?.kind === "hold" && next.stepIndex === seg.stepIndex && next.stageIndex === seg.stageIndex && next.cycle === seg.cycle) remaining += next.duration;
  // Una conservación infinita concluye la PCR, aunque la temperatura siga visible.
  // También concluye un programa cuyo último paso sea finito.
  const finished = (!Number.isFinite(seg.duration) && seg.step.time === 0) || (!next && Number.isFinite(seg.duration) && t >= seg.start + seg.duration);
  return { temp, segment: seg, stepRemaining: remaining, finished };
}
