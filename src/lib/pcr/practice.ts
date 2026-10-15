/**
 * Casos prácticos (termociclador + master mix) y su verificación.
 * Cada caso guarda el programa y la mezcla correctos. Los casos viven como
 * JSON individuales en la carpeta `ejercicios/`, accesible solo desde el servidor.
 */
import { masterMix, type CalcInput, type MixOptions } from "./protocol";
import { POLYMERASES } from "./reagents";
import { formatTime, type Program } from "./types";

export interface MasterMixSettings {
  input: CalcInput;
  volume: number;
  samples: number;
  options: MixOptions;
}

export interface PracticeCase {
  id: string;
  title: string;
  /** Líneas del enunciado que ve el alumno. */
  statement: string[];
  /** Programa correcto del termociclador. */
  program: Program;
  /** Master mix correcto. */
  mix: MasterMixSettings;
  /** Parte evaluada; sin valor equivale a "both" (casos antiguos). */
  mode?: PracticeMode | undefined;
}

export type PracticeMode = "both" | "cycler" | "mix";
export const MODE_LABEL: Record<PracticeMode, string> = { both: "Completo", cycler: "Solo termociclador", mix: "Solo master mix" };

export interface PracticeCheck { label: string; correct: boolean; detail: string }

/** Verifica todos los pasos y los parámetros de mezcla contra los valores guardados del caso. */
export function verifyPractice(program: Program, mix: MasterMixSettings | null, exercise: PracticeCase) {
  const mode = exercise.mode ?? "both";
  const reference = exercise.program;
  const target = exercise.mix;
  const checks: PracticeCheck[] = [];
  const check = (label: string, actual: number | undefined, expected: number, tolerance: number, unit: string) => {
    const correct = actual !== undefined && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
    checks.push({ label, correct, detail: `${actual ?? "—"} ${unit} · esperado ${expected} ${unit}` });
  };
  if (mode !== "mix") {
  const actualSteps = program.stages.flatMap(s => s.steps);
  const expectedSteps = reference.stages.flatMap(s => s.steps);
  check("Número de pasos", actualSteps.length, expectedSteps.length, 0, "pasos");
  reference.stages.forEach((stage, si) => {
    check(`Etapa ${si + 1} · repeticiones`, program.stages[si]?.repeats, stage.repeats, 0, "×");
  });
  expectedSteps.forEach((step, index) => {
    const actual = actualSteps[index];
    check(`Col. ${index + 1} · ${step.label} · temperatura`, actual?.temp, step.temp, 1, "°C");
    const correct = actual !== undefined && (step.time === 0 ? actual.time === 0 : actual.time > 0 && Math.abs(actual.time - step.time) <= Math.max(5, step.time * 0.1));
    checks.push({ label: `Col. ${index + 1} · duración`, correct, detail: `${actual ? formatTime(actual.time) : "—"} · esperado ${formatTime(step.time)}` });
  });
  }
  if (mode !== "cycler" && mix) {
  const polName = POLYMERASES.find(p => p.id === target.input.polymeraseId)?.name ?? target.input.polymeraseId;
  checks.push({ label: "Master mix · polimerasa", correct: mix.input.polymeraseId === target.input.polymeraseId, detail: `Esperada: ${polName}` });
  check("Master mix · volumen", mix.volume, target.volume, 0.01, "µL");
  check("Master mix · muestras", mix.samples, target.samples, 0, "");
  check("Master mix · Mg²⁺ del tampón", mix.input.mgMM, target.input.mgMM, 0.01, "mM");
  check("Master mix · MgCl₂ extra", mix.input.additives.extraMg, target.input.additives.extraMg, 0.01, "mM");
  check("Master mix · DMSO", mix.input.additives.dmso, target.input.additives.dmso, 0.01, "%");
  const wantColony = target.input.template === "colony";
  checks.push({ label: "Master mix · molde", correct: (mix.input.template === "colony") === wantColony, detail: wantColony ? "PCR de colonia." : "Molde de ADN medido por reacción, no PCR de colonia." });
  const fields: [keyof MixOptions, string, string][] = [
    ["templateUL", "Molde", "µL"], ["enzymeStockU", "Stock de enzima", "U/µL"],
    ["enzymeUnits", "Enzima por reacción", "U"], ["primerStockUM", "Stock de cebadores", "µM"],
    ["primerFinalUM", "Cebadores finales", "µM"], ["dntpStockMM", "Stock de dNTPs", "mM"],
    ["dntpFinalMM", "dNTPs finales", "mM"], ["mgStockMM", "Stock de MgCl₂", "mM"],
  ];
  fields.forEach(([key, label, unit]) => {
    if (wantColony && key === "templateUL") return;
    const expected = target.options[key];
    if (expected !== undefined) check(`Master mix · ${label}`, mix.options[key], expected, 0.001, unit);
  });
  checks.push({ label: "Master mix · balance de volúmenes", correct: !masterMix(mix.input, mix.volume, mix.samples, mix.options).overflow, detail: "La suma de reactivos y molde no debe superar el volumen por reacción." });
  } else if (mode !== "cycler") checks.push({ label: "Master mix", correct: false, detail: "Falta preparar la mezcla." });
  const score = Math.round(checks.filter(c => c.correct).length / checks.length * 100);
  return { checks, score, correct: checks.every(c => c.correct) };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Comprueba la forma mínima de un caso para no cargar archivos corruptos. */
export function isCase(v: unknown): v is PracticeCase {
  const c = v as PracticeCase;
  return !!c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.statement) && c.statement.every(l => typeof l === "string")
    && !!c.program && Array.isArray(c.program.stages) && c.program.stages.length > 0
    && c.program.stages.every(s => isNum(s.repeats) && Array.isArray(s.steps) && s.steps.length > 0 && s.steps.every(p => isNum(p.temp) && isNum(p.time) && typeof p.label === "string"))
    && !!c.mix && isNum(c.mix.volume) && isNum(c.mix.samples) && !!c.mix.input && typeof c.mix.input.polymeraseId === "string" && !!c.mix.input.additives && !!c.mix.options;
}

/** Datos que puede ver el alumno: estructura del programa sin valores correctos. */
export interface PublicCase {
  id: string;
  title: string;
  statement: string[];
  /** Mismas etapas y pasos que la solución, con temperaturas y tiempos neutros. */
  skeleton: Program;
  samples: number;
  volume: number;
  mode: PracticeMode;
}

/** Oculta la solución: conserva etapas, nombres y holds, pero no temperaturas, tiempos ni ciclos. */
export function toPublic(c: PracticeCase): PublicCase {
  const p = c.program;
  return {
    id: c.id, title: c.title, statement: c.statement, samples: c.mix.samples, volume: c.mix.volume, mode: c.mode ?? "both",
    skeleton: { ...p, stages: p.stages.map(st => ({ ...st, repeats: st.repeats > 1 ? 10 : 1,
      steps: st.steps.map(s => ({ id: s.id, label: s.label, temp: s.time === 0 ? 20 : 50, time: s.time === 0 ? 0 : 10 })) })) },
  };
}
