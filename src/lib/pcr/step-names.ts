/**
 * Nombres de paso: sugerencia automática según el paso anterior y lista de
 * nombres habituales. Solo lee el modelo Step/Program, no toca la interfaz.
 */
import type { Program, Step } from "./types";

/** Nombres habituales agrupados por la función que cumplen en la reacción. */
export const STEP_NAME_GROUPS: { group: string; names: string[] }[] = [
  { group: "Amplificación", names: ["Desnaturalización", "Anillamiento", "Extensión", "Anillamiento/extensión"] },
  { group: "Preparación de la muestra", names: ["Desnaturalización inicial", "Lisis bacteriana", "Retrotranscripción", "Inactivación RT"] },
  { group: "Cierre y lectura", names: ["Extensión final", "Conservación", "Curva de fusión", "Pausa"] },
];

/** Todos los nombres disponibles, sin repetir. */
export const STEP_NAMES: string[] = [...new Set(STEP_NAME_GROUPS.flatMap(g => g.names))];

/**
 * Propone el nombre del paso siguiente según el paso anterior y la temperatura
 * objetivo: sigue la secuencia de un programa PCR estándar.
 */
export function suggestStepLabel(previous: Step | undefined, temp = 72): string {
  const prev = (previous?.label ?? "").toLowerCase();
  const is = (re: RegExp) => re.test(prev);
  if (temp <= 10) return "Conservación";
  if (!prev) return temp >= 90 ? "Desnaturalización inicial" : "Desnaturalización";
  if (is(/extensión final|curva de fusión|conservación/)) return "Conservación";
  if (is(/inicial|lisis|retrotranscri|cdna|\brt\b|inactivaci|paso nuevo/)) return temp >= 90 ? "Desnaturalización" : temp >= 68 ? "Extensión" : "Anillamiento";
  if (is(/desnaturaliz/)) return temp >= 68 ? "Extensión" : "Anillamiento";
  if (is(/anillamiento|hibridaz/)) return temp >= 68 ? "Extensión" : "Anillamiento/extensión";
  if (is(/extensión/)) return temp >= 68 ? "Extensión final" : "Anillamiento";
  return temp >= 90 ? "Desnaturalización" : temp >= 68 ? "Extensión" : "Anillamiento";
}

/** Índice global de un paso (su columna en el gráfico). */
export function globalStepIndex(program: Program, si: number, pi: number): number {
  return program.stages.slice(0, si).reduce((n, s) => n + s.steps.length, 0) + pi;
}

/** Nombre sugerido para un paso concreto, según el paso que lo precede. */
export function suggestionFor(program: Program, si: number, pi: number): string {
  const flat = program.stages.flatMap(s => s.steps);
  const index = globalStepIndex(program, si, pi);
  return suggestStepLabel(flat[index - 1], flat[index]?.temp ?? 72);
}
