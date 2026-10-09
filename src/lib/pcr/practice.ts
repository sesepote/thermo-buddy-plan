/** Casos prácticos: las referencias usan los mismos cálculos que la calculadora. */
import { EXERCISES } from "./exercises";
import { DEFAULT_INPUT, generateProtocol, masterMix, type CalcInput, type MixOptions } from "./protocol";
import { formatTime, type Program } from "./types";

export interface MasterMixSettings {
  input: CalcInput;
  volume: number;
  samples: number;
  options: MixOptions;
}

export const PRACTICE_CASES = EXERCISES.filter(e => e.id === "b1" || e.id === "b3").map((exercise, index) => ({
  ...exercise,
  id: `practice-${exercise.id}`,
  title: index === 0 ? "PCR de un plásmido · Taq" : "ADN genómico · Hot-start",
  mix: {
    input: exercise.input,
    volume: index === 0 ? 25 : 50,
    samples: index === 0 ? 6 : 8,
    options: {
      templateUL: index === 0 ? 1 : 2,
      enzymeStockU: 5,
      enzymeUnits: index === 0 ? 1.25 : 2,
      primerStockUM: index === 0 ? 10 : 20,
      primerFinalUM: 0.5,
      dntpStockMM: 10,
      dntpFinalMM: 0.2,
      mgStockMM: 25,
    },
  } satisfies MasterMixSettings,
}));
// El segundo caso requiere suplementar el magnesio para practicar su cálculo.
PRACTICE_CASES[1]?.mix.input && (PRACTICE_CASES[1].mix.input = {
  ...PRACTICE_CASES[1].mix.input,
  additives: { ...DEFAULT_INPUT.additives, extraMg: 0.5 },
});

export type PracticeCase = typeof PRACTICE_CASES[number];
export interface PracticeCheck { label: string; correct: boolean; detail: string }

/** Verifica todos los pasos y los parámetros de mezcla sin un segundo motor de PCR. */
export function verifyPractice(program: Program, mix: MasterMixSettings, exercise: PracticeCase) {
  const reference = generateProtocol(exercise.input, "practice-reference").program;
  const checks: PracticeCheck[] = [];
  const check = (label: string, actual: number | undefined, expected: number, tolerance: number, unit: string) => {
    const correct = actual !== undefined && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
    checks.push({ label, correct, detail: `${actual ?? "—"} ${unit} · esperado ${expected} ${unit}` });
  };
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
  checks.push({ label: "Master mix · polimerasa", correct: mix.input.polymeraseId === exercise.mix.input.polymeraseId, detail: `Esperada: ${exercise.mix.input.polymeraseId === "taq" ? "Taq" : "Hot-start Taq"}` });
  check("Master mix · volumen", mix.volume, exercise.mix.volume, 0.01, "µL");
  check("Master mix · muestras", mix.samples, exercise.mix.samples, 0, "");
  check("Master mix · Mg²⁺ del tampón", mix.input.mgMM, exercise.mix.input.mgMM, 0.01, "mM");
  check("Master mix · MgCl₂ extra", mix.input.additives.extraMg, exercise.mix.input.additives.extraMg, 0.01, "mM");
  check("Master mix · DMSO", mix.input.additives.dmso, 0, 0.01, "%");
  checks.push({ label: "Master mix · molde", correct: mix.input.template !== "colony", detail: "Molde de ADN medido por reacción, no PCR de colonia." });
  const fields: [keyof MixOptions, string, string][] = [
    ["templateUL", "Molde", "µL"], ["enzymeStockU", "Stock de enzima", "U/µL"],
    ["enzymeUnits", "Enzima por reacción", "U"], ["primerStockUM", "Stock de cebadores", "µM"],
    ["primerFinalUM", "Cebadores finales", "µM"], ["dntpStockMM", "Stock de dNTPs", "mM"],
    ["dntpFinalMM", "dNTPs finales", "mM"], ["mgStockMM", "Stock de MgCl₂", "mM"],
  ];
  fields.forEach(([key, label, unit]) => {
    const expected = exercise.mix.options[key];
    if (expected !== undefined) check(`Master mix · ${label}`, mix.options[key], expected, 0.001, unit);
  });
  checks.push({ label: "Master mix · balance de volúmenes", correct: !masterMix(mix.input, mix.volume, mix.samples, mix.options).overflow, detail: "La suma de reactivos y molde no debe superar el volumen por reacción." });
  const score = Math.round(checks.filter(c => c.correct).length / checks.length * 100);
  return { checks, score, correct: checks.every(c => c.correct) };
}