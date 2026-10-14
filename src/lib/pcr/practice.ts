/**
 * Casos prácticos (termociclador + master mix) y su verificación.
 * Cada caso guarda el programa correcto y la mezcla correcta; los casos
 * de serie se generan con el mismo motor que la calculadora y los creados
 * por el docente se importan/exportan como JSON.
 */
import { DEFAULT_INPUT, generateProtocol, masterMix, type CalcInput, type MixOptions } from "./protocol";
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
  /** true si lo creó el usuario (se puede borrar y exportar). */
  custom?: boolean | undefined;
}

const OPTS: MixOptions = { enzymeStockU: 5, primerFinalUM: 0.5, dntpStockMM: 10, dntpFinalMM: 0.2, mgStockMM: 25 };

/** Construye un caso de serie a partir de una entrada de la calculadora. */
function builtIn(id: string, title: string, over: Partial<CalcInput>, mix: Omit<MasterMixSettings, "input">, extraMg: number): PracticeCase {
  const input: CalcInput = { ...DEFAULT_INPUT, fwdSeq: "", revSeq: "", ...over, additives: { ...DEFAULT_INPUT.additives, extraMg } };
  const pol = POLYMERASES.find(p => p.id === input.polymeraseId)!;
  return {
    id, title, program: generateProtocol(input, `${id}-ref`).program, mix: { ...mix, input },
    statement: [`Polimerasa: ${pol.name}`, `Amplicón: ${input.ampliconBp.toLocaleString("es-ES")} pb`, `Tm cebadores: ${input.fwdTm} °C / ${input.revTm} °C`,
      `${mix.volume} µL por reacción · ${mix.samples} muestras`, `Molde: ${mix.options.templateUL} µL / tubo`,
      `Enzima: ${mix.options.enzymeStockU} U/µL → ${mix.options.enzymeUnits} U / tubo`, `Cebadores: ${mix.options.primerStockUM} µM → ${mix.options.primerFinalUM} µM`,
      "dNTPs: 10 mM cada uno → 0,2 mM", `Tampón: 1,5 mM Mg²⁺ · extra: ${extraMg} mM`, "Stock MgCl₂: 25 mM · sin DMSO"],
  };
}

export const PRACTICE_CASES: PracticeCase[] = [
  builtIn("practice-b1", "PCR de un plásmido · Taq", { polymeraseId: "taq", fwdTm: 60, revTm: 60, ampliconBp: 500, template: "plasmid" },
    { volume: 25, samples: 6, options: { ...OPTS, templateUL: 1, enzymeUnits: 1.25, primerStockUM: 10 } }, 0),
  builtIn("practice-b3", "ADN genómico · Hot-start", { polymeraseId: "hs-taq", fwdTm: 62, revTm: 62, ampliconBp: 800, template: "genomic" },
    { volume: 50, samples: 8, options: { ...OPTS, templateUL: 2, enzymeUnits: 2, primerStockUM: 20 } }, 0.5),
];

export interface PracticeCheck { label: string; correct: boolean; detail: string }

/** Verifica todos los pasos y los parámetros de mezcla contra los valores guardados del caso. */
export function verifyPractice(program: Program, mix: MasterMixSettings, exercise: PracticeCase) {
  const reference = exercise.program;
  const target = exercise.mix;
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
  const score = Math.round(checks.filter(c => c.correct).length / checks.length * 100);
  return { checks, score, correct: checks.every(c => c.correct) };
}

// --------------------------------------------------------------------------
// Exportar / importar JSON
// --------------------------------------------------------------------------

export const EXERCISE_FILE_FORMAT = "termociclador-ejercicios";

/** Serializa los ejercicios en el formato de archivo de la app. */
export function exportExercises(cases: PracticeCase[]): string {
  return JSON.stringify({ format: EXERCISE_FILE_FORMAT, version: 1, exercises: cases.map(c => ({ ...c, custom: undefined })) }, null, 2);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Comprueba la forma mínima de un caso para no cargar archivos corruptos. */
function isCase(v: unknown): v is PracticeCase {
  const c = v as PracticeCase;
  return !!c && typeof c.title === "string" && Array.isArray(c.statement) && c.statement.every(l => typeof l === "string")
    && !!c.program && Array.isArray(c.program.stages) && c.program.stages.length > 0
    && c.program.stages.every(s => isNum(s.repeats) && Array.isArray(s.steps) && s.steps.length > 0 && s.steps.every(p => isNum(p.temp) && isNum(p.time) && typeof p.label === "string"))
    && !!c.mix && isNum(c.mix.volume) && isNum(c.mix.samples) && !!c.mix.input && typeof c.mix.input.polymeraseId === "string" && !!c.mix.input.additives && !!c.mix.options;
}

/** Lee un archivo de ejercicios; acepta el formato de la app o una lista/caso suelto. Lanza Error si no es válido. */
export function importExercises(text: string, idPrefix: string): PracticeCase[] {
  const data: unknown = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data as { exercises?: unknown }).exercises ?? [data];
  if (!Array.isArray(list) || list.length === 0 || !list.every(isCase)) throw new Error("El archivo no contiene ejercicios válidos.");
  return list.map((c, i) => ({ ...c, id: `${idPrefix}-${i}`, custom: true }));
}
