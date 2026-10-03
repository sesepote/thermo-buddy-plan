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
        const rampDur = Math.abs(target - temp) / rate;
        if (rampDur > 0) {
          segs.push({ ...base, kind: "ramp", start: t, duration: rampDur, fromTemp: temp, toTemp: target });
          t += rampDur;
        }
        // Meseta (time 0 = infinito).
        const holdDur = step.time > 0 ? step.time : Infinity;
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
    if (segs[mid].start <= t) lo = mid; else hi = mid - 1;
  }
  const seg = segs[lo];
  const local = Math.max(t - seg.start, 0);
  const temp = seg.kind === "ramp"
    ? seg.fromTemp + (seg.toTemp - seg.fromTemp) * Math.min(local / seg.duration, 1)
    : seg.toTemp;
  // Tiempo restante del paso = resto de la rampa + meseta completa.
  let remaining = seg.duration - local;
  if (seg.kind === "ramp" && segs[lo + 1]) remaining += segs[lo + 1].duration;
  const finished = !Number.isFinite(seg.duration) && seg.step.time === 0;
  return { temp, segment: seg, stepRemaining: remaining, finished };
}

/** Puntos (minuto, °C) del perfil completo para la gráfica. */
export function profilePoints(segs: Segment[]): { min: number; temp: number }[] {
  const pts: { min: number; temp: number }[] = [{ min: 0, temp: AMBIENT }];
  for (const s of segs) {
    const end = Number.isFinite(s.duration) ? s.start + s.duration : s.start + 120;
    pts.push({ min: end / 60, temp: s.toTemp });
  }
  return pts;
}

/** Temperaturas de las 12 columnas del bloque para un paso con gradiente. */
export function gradientColumns(step: Step): number[] {
  if (!step.gradient) return Array(12).fill(step.temp);
  const { low, high } = step.gradient;
  return Array.from({ length: 12 }, (_, i) => Math.round((low + ((high - low) * i) / 11) * 10) / 10);
}
