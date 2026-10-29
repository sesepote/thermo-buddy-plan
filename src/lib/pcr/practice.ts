/**
 * Casos prácticos (termociclador + master mix) y su verificación.
 * Cada caso guarda el programa y la mezcla correctos. Los casos viven como
 * JSON individuales en la carpeta `ejercicios/`, accesible solo desde el servidor.
 */
import { reactionVolumes, type CalcInput, type MixOptions } from "./protocol";
import { formatTime, type Program } from "./types";

export interface MasterMixSettings {
  input: CalcInput;
  volume: number;
  samples: number;
  options: MixOptions;
  /** Solución escrita por el docente en el editor de tubos; los casos antiguos usan química. */
  manual?: { rows: ReagentRow[]; totals?: Partial<Record<ReagentKey, number>> | undefined } | undefined;
}

export interface PracticeCase {
  id: string;
  title: string;
  /** Etiqueta de la tarjeta (p. ej. «Tema 3»); sin valor muestra «Caso N». */
  topic?: string | undefined;
  /** Líneas del enunciado que ve el alumno. */
  statement: string[];
  /** Programa correcto del termociclador. */
  program: Program;
  /** Master mix correcto. */
  mix: MasterMixSettings;
  /** Parte evaluada; sin valor equivale a "both" (casos antiguos). */
  mode?: PracticeMode | undefined;
  /** Posición en la lista (cada ejercicio es un archivo independiente). */
  order?: number | undefined;
  /** Docente que lo creó. */
  author?: string | undefined;
}

export type PracticeMode = "both" | "cycler" | "mix";
export const MODE_LABEL: Record<PracticeMode, string> = { both: "Completo", cycler: "Solo termociclador", mix: "Solo master mix" };

export interface PracticeCheck { label: string; correct: boolean; detail: string }

/** Componentes de la tabla de volúmenes manual, en orden de pipeteo. */
export type ReagentKey = "buffer" | "mg" | "dntp" | "fwd" | "rev" | "dmso" | "enzyme" | "template" | "water";
export interface ReagentRow { key: ReagentKey; label: string; per: number }

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Volúmenes correctos para 1 reacción; el agua completa el volumen final. */
export function expectedRows(mix: MasterMixSettings): ReagentRow[] {
  if (mix.manual) return mix.manual.rows.map(r => ({ ...r }));
  const { pol, stockU, pStock, dStock, mgStock, bufferX, per } = reactionVolumes(mix.input, mix.volume, mix.options);
  const rows: ReagentRow[] = [
    { key: "buffer", label: `Tampón de reacción (${bufferX}×)`, per: per.buffer },
    ...(per.mg > 0 ? [{ key: "mg" as const, label: `MgCl₂ (${mgStock} mM)`, per: per.mg }] : []),
    { key: "dntp", label: `dNTPs (${dStock} mM c/u)`, per: per.dntp },
    { key: "fwd", label: `Cebador F (${pStock} µM)`, per: per.fwd },
    { key: "rev", label: `Cebador R (${pStock} µM)`, per: per.rev },
    ...(per.dmso > 0 ? [{ key: "dmso" as const, label: "DMSO", per: per.dmso }] : []),
    { key: "enzyme", label: `${pol.name} (${stockU} U/µL)`, per: per.enzyme },
    { key: "template", label: "ADN molde", per: per.template },
  ];
  const used = rows.reduce((a, r) => a + r.per, 0);
  return [...rows, { key: "water" as const, label: "Agua libre de nucleasas", per: Math.max(mix.volume - used, 0) }].map(r => ({ ...r, per: round3(r.per) }));
}

/** Respuesta escrita a mano por el alumno: 1 reacción y master mix (sin molde). */
export interface ManualAnswer {
  single: Partial<Record<ReagentKey, number>>;
  tubes?: number | undefined;
  mix: Partial<Record<ReagentKey, number>>;
}

/** Master mix correcta: volumen de 1 reacción × nº de tubos, sin molde; el agua no cambia. */
export const mixVolume = (row: ReagentRow, tubes: number) => row.key === "template" ? 0 : round3(row.per * tubes);

const close = (actual: number | undefined, expected: number) =>
  actual !== undefined && Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(0.05, expected * 0.02);

const hasData = (v: Partial<Record<ReagentKey, number>> | undefined) => !!v && Object.values(v).some(n => typeof n === "number" && n > 0);

/** Corrige solo las pestañas con datos (1 reacción y/o master mix); si ninguna tiene datos, ambas. */
function checkManual(answer: ManualAnswer | null, target: MasterMixSettings, checks: PracticeCheck[]) {
  const rows = expectedRows(target);
  const single = hasData(answer?.single), mix = hasData(answer?.mix);
  const doSingle = single || !mix, doMix = mix || !single;
  if (doSingle) rows.forEach(r => checks.push({ label: `1 reacción · ${r.label}`, correct: close(answer?.single[r.key], r.per), detail: `${answer?.single[r.key] ?? "—"} µL · esperado ${r.per} µL` }));
  if (!doMix) return;
  checks.push({ label: "Master mix · nº de reacciones", correct: answer?.tubes === target.samples, detail: `${answer?.tubes ?? "—"} · esperado ${target.samples} (muestras + controles + pipeteo)` });
  rows.forEach(r => {
    const expected = target.manual?.totals?.[r.key] ?? mixVolume(r, target.samples);
    checks.push({ label: `Master mix · ${r.label}`, correct: close(answer?.mix[r.key] ?? (r.key === "template" ? 0 : undefined), expected), detail: `${answer?.mix[r.key] ?? "—"} µL · esperado ${expected} µL` });
  });
}

/** Verifica todos los pasos y los parámetros de mezcla contra los valores guardados del caso. */
export function verifyPractice(program: Program, answer: ManualAnswer | null, exercise: PracticeCase) {
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
  if (mode !== "cycler") checkManual(answer, target, checks);
  const score = Math.round(checks.filter(c => c.correct).length / checks.length * 100);
  return { checks, score, correct: checks.every(c => c.correct) };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const REAGENT_KEYS: ReagentKey[] = ["buffer", "mg", "dntp", "fwd", "rev", "dmso", "enzyme", "template", "water"];

/** Valida las respuestas docentes antes de guardar un archivo. */
export function isManualSolution(v: unknown): v is NonNullable<MasterMixSettings["manual"]> {
  if (!v || typeof v !== "object") return false;
  const { rows, totals } = v as NonNullable<MasterMixSettings["manual"]>;
  return Array.isArray(rows) && rows.length > 0 && rows.length <= REAGENT_KEYS.length
    && new Set(rows.map(r => r?.key)).size === rows.length
    && rows.every(r => r && REAGENT_KEYS.includes(r.key) && typeof r.label === "string" && r.label.trim().length > 0 && isNum(r.per) && r.per >= 0 && r.per <= 5000)
    && (totals === undefined || (!!totals && typeof totals === "object" && rows.every(r => isNum(totals[r.key]) && (totals[r.key] ?? -1) >= 0 && (totals[r.key] ?? Infinity) <= 5000) && (totals.template === undefined || totals.template === 0)));
}

/** Comprueba la forma mínima de un caso para no cargar archivos corruptos. */
export function isCase(v: unknown): v is PracticeCase {
  const c = v as PracticeCase;
  return !!c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.statement) && c.statement.every(l => typeof l === "string")
    && !!c.program && Array.isArray(c.program.stages) && (c.program.stages.length > 0 || c.mode === "mix")
    && c.program.stages.every(s => isNum(s.repeats) && Array.isArray(s.steps) && s.steps.length > 0 && s.steps.every(p => isNum(p.temp) && isNum(p.time) && typeof p.label === "string"))
    && !!c.mix && isNum(c.mix.volume) && c.mix.volume > 0 && isNum(c.mix.samples) && c.mix.samples > 0 && !!c.mix.input && typeof c.mix.input.polymeraseId === "string" && !!c.mix.input.additives && !!c.mix.options
    && (c.mix.manual === undefined || isManualSolution(c.mix.manual));
}

/** Datos que puede ver el alumno: estructura del programa sin valores correctos. */
export interface PublicCase {
  id: string;
  title: string;
  topic?: string | undefined;
  statement: string[];
  /** Mismas etapas y pasos que la solución, con temperaturas y tiempos neutros. */
  skeleton: Program;
  samples: number;
  volume: number;
  mode: PracticeMode;
  /** Filas de la tabla manual (nombre y stock, sin volúmenes). */
  reagents: { key: ReagentKey; label: string }[];
}

/** Oculta la solución: conserva etapas, nombres y holds, pero no temperaturas, tiempos ni ciclos. */
export function toPublic(c: PracticeCase): PublicCase {
  const p = c.program;
  return {
    id: c.id, title: c.title, topic: c.topic, statement: c.statement, samples: c.mix.samples, volume: c.mix.volume, mode: c.mode ?? "both",
    reagents: expectedRows(c.mix).map(({ key, label }) => ({ key, label })),
    skeleton: { ...p, stages: p.stages.map(st => ({ ...st, repeats: st.repeats > 1 ? 10 : 1,
      steps: st.steps.map(s => ({ id: s.id, label: s.label, temp: s.time === 0 ? 20 : 50, time: s.time === 0 ? 0 : 10 })) })) },
  };
}
