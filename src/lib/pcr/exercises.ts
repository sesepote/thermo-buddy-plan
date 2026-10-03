/**
 * Banco de ejercicios de la zona de entrenamiento y evaluador.
 *
 * Cada ejercicio describe un caso práctico mediante una entrada de la
 * calculadora (`CalcInput`). La solución de referencia se obtiene con
 * `generateProtocol`, de modo que calculadora y entrenamiento usan
 * exactamente las mismas reglas.
 */
import { DEFAULT_INPUT, generateProtocol, type CalcInput } from "./protocol";
import { POLYMERASES, REACTION_TYPES, TEMPLATES } from "./reagents";
import type { Program, Stage, Step } from "./types";
import { formatTime } from "./types";

export type Level = "basico" | "intermedio" | "avanzado";

export interface Exercise {
  id: string;
  level: Level;
  title: string;
  input: CalcInput;
  hints: string[];
}

/** Atajo para definir ejercicios a partir de la entrada por defecto. */
const ex = (id: string, level: Level, title: string, over: Partial<CalcInput>, hints: string[]): Exercise => ({
  id, level, title, hints,
  input: { ...DEFAULT_INPUT, fwdSeq: "", revSeq: "", ...over, additives: { ...DEFAULT_INPUT.additives, ...(over.additives ?? {}) } },
});

export const EXERCISES: Exercise[] = [
  ex("b1", "basico", "Primer PCR con Taq", { polymeraseId: "taq", fwdTm: 60, revTm: 60, ampliconBp: 500, template: "plasmid" }, ["Taq: Ta = Tm − 5 °C.", "Taq extiende ~1 min/kb, mínimo 30 s.", "Plásmido: 25 ciclos bastan."]),
  ex("b2", "basico", "Fragmento de 1 kb en genómico", { polymeraseId: "taq", fwdTm: 58, revTm: 61, ampliconBp: 1000, template: "genomic" }, ["Usa la Tm más baja.", "ADN genómico: unos 32 ciclos."]),
  ex("b3", "basico", "Hot-start Taq", { polymeraseId: "hs-taq", fwdTm: 62, revTm: 62, ampliconBp: 800, template: "genomic" }, ["La hot-start necesita 5 min de activación a 95 °C."]),
  ex("b4", "basico", "PCR de colonia", { reaction: "colony", polymeraseId: "taq", fwdTm: 56, revTm: 57, ampliconBp: 700, template: "colony" }, ["Lisis: desnaturalización inicial de 5 min.", "30 ciclos."]),
  ex("b5", "basico", "Pfu para clonación", { polymeraseId: "pfu", fwdTm: 60, revTm: 59, ampliconBp: 1500, template: "plasmid" }, ["Pfu es lenta: 2 min/kb.", "Extensión final 10 min."]),
  ex("i1", "intermedio", "Phusion de alta fidelidad", { polymeraseId: "phusion", fwdTm: 64, revTm: 66, ampliconBp: 2500, template: "genomic" }, ["Phusion: 98 °C 10 s por ciclo.", "Ta = Tm + 3 °C.", "30 s/kb."]),
  ex("i2", "intermedio", "Q5 sobre plásmido", { polymeraseId: "q5", fwdTm: 62, revTm: 63, ampliconBp: 3000, template: "plasmid" }, ["Activación inicial 30 s a 98 °C.", "Extensión final 2 min."]),
  ex("i3", "intermedio", "KOD rápida", { polymeraseId: "kod", fwdTm: 60, revTm: 61, ampliconBp: 2000, template: "genomic" }, ["KOD extiende a 70 °C, 20 s/kb."]),
  ex("i4", "intermedio", "Molde rico en GC", { polymeraseId: "taq", fwdTm: 66, revTm: 65, ampliconBp: 600, template: "genomic", highGC: true, additives: { dmso: 5, betaine: 0, formamide: 0, extraMg: 0 } }, ["Alto GC: desnaturaliza a 98 °C.", "El 5 % de DMSO baja la Tm ~3 °C."]),
  ex("i5", "intermedio", "RT-PCR en un paso", { reaction: "rt-onestep", polymeraseId: "hs-taq", fwdTm: 60, revTm: 60, ampliconBp: 400, template: "cdna" }, ["Primero RT a 50 °C 15 min.", "cDNA: 35 ciclos."]),
  ex("a1", "avanzado", "qPCR SYBR Green", { reaction: "qpcr-sybr", polymeraseId: "hs-taq", fwdTm: 60, revTm: 60, ampliconBp: 150, template: "cdna" }, ["40 ciclos de dos pasos: 95 °C 15 s / 60 °C 60 s.", "Añade curva de fusión, sin extensión final."]),
  ex("a2", "avanzado", "qPCR TaqMan", { reaction: "qpcr-probe", polymeraseId: "hs-taq", fwdTm: 59, revTm: 60, ampliconBp: 120, template: "cdna" }, ["Igual que SYBR pero sin curva de fusión."]),
  ex("a3", "avanzado", "Touchdown con Tm descompensadas", { reaction: "touchdown", polymeraseId: "taq", fwdTm: 58, revTm: 64, ampliconBp: 900, template: "genomic" }, ["10 ciclos desde Ta + 10 °C bajando 1 °C/ciclo.", "Usa el campo Δ/ciclo = −1."]),
  ex("a4", "avanzado", "PCR larga de 12 kb", { reaction: "long", polymeraseId: "longamp", fwdTm: 63, revTm: 64, ampliconBp: 12000, template: "genomic" }, ["LongAmp: 94 °C, extensión a 65 °C, 50 s/kb.", "Extensión final 10 min."]),
  ex("a5", "avanzado", "Phusion con DMSO y GC alto", { polymeraseId: "phusion", fwdTm: 70, revTm: 69, ampliconBp: 1200, template: "genomic", highGC: true, additives: { dmso: 3, betaine: 0, formamide: 0, extraMg: 0 } }, ["3 % DMSO baja la Tm ~1,8 °C.", "Ta = Tm + 3 °C pero nunca > 72 °C."]),
];

/** Enunciado legible del ejercicio. */
export function describeExercise(e: Exercise): string[] {
  const i = e.input;
  const pol = POLYMERASES.find((p) => p.id === i.polymeraseId)!;
  const rt = REACTION_TYPES.find((r) => r.id === i.reaction)!;
  const tpl = TEMPLATES.find((t) => t.id === i.template)!;
  const lines = [
    `Tipo: ${rt.name}`,
    `Polimerasa: ${pol.name}`,
    `Molde: ${tpl.name}`,
    `Amplicón: ${i.ampliconBp.toLocaleString("es-ES")} pb`,
    `Tm cebadores: ${i.fwdTm} °C / ${i.revTm} °C`,
  ];
  if (i.highGC) lines.push("Molde rico en GC (> 65 %)");
  if (i.additives.dmso) lines.push(`Aditivo: ${i.additives.dmso} % DMSO`);
  return lines;
}

// --------------------------------------------------------------------------
// Evaluación
// --------------------------------------------------------------------------

/** Papeles que identificamos en un programa para compararlo con la referencia. */
interface Roles {
  rt?: Step | undefined;
  initial?: Step | undefined;
  touchdown?: Stage | undefined;
  cycling?: Stage | undefined;
  denat?: Step | undefined;
  anneal?: Step | undefined;
  ext?: Step | undefined;
  melt: boolean;
  finalExt?: Step | undefined;
  hold?: Step | undefined;
}

/** Extrae los papeles (desnaturalización inicial, ciclado, etc.) de un programa. */
function extractRoles(p: Program): Roles {
  const r: Roles = { melt: false };
  const stages = p.stages;
  // Etapa de ciclado principal = la de más repeticiones (sin touchdown).
  const cyclingIdx = stages.reduce((best, s, i) =>
    s.repeats > 1 && !s.steps.some((x) => x.deltaPerCycle) && (best < 0 || s.repeats > stages[best]!.repeats) ? i : best, -1);
  if (cyclingIdx >= 0) {
    const c = stages[cyclingIdx]!;
    r.cycling = c;
    const sorted = [...c.steps].sort((a, b) => b.temp - a.temp);
    r.denat = sorted[0];
    r.anneal = sorted[sorted.length - 1];
    r.ext = c.steps.length >= 3 ? sorted[1] : undefined;
  }
  r.touchdown = stages.find((s) => s.repeats > 1 && s.steps.some((x) => (x.deltaPerCycle ?? 0) < 0));
  const firstCycle = stages.findIndex((s) => s.repeats > 1);
  const before = stages.slice(0, firstCycle < 0 ? stages.length : firstCycle).flatMap((s) => s.steps);
  r.rt = before.find((s) => s.temp >= 37 && s.temp <= 60 && s.time >= 300);
  r.initial = before.find((s) => s.temp >= 90);
  const after = stages.slice(Math.max(cyclingIdx, 0) + 1).flatMap((s) => s.steps);
  r.melt = after.filter((s) => s.temp >= 90).length >= 1 && after.some((s) => s.temp >= 60 && s.temp <= 70 && s.time > 0 && s.time <= 120) && after.length >= 3;
  r.finalExt = after.find((s) => s.temp >= 62 && s.temp <= 75 && s.time >= 60);
  const last = stages.at(-1)?.steps.at(-1);
  if (last && last.time === 0) r.hold = last;
  return r;
}

export type Verdict = "ok" | "warn" | "bad";
export interface Check { label: string; verdict: Verdict; detail: string; points: number; max: number }

/** Compara un valor con la referencia: dentro de `ok` → completo, dentro de `warn` → la mitad. */
function compare(label: string, got: number | undefined, want: number, ok: number, warn: number, unit: string, max = 10, fmt = (n: number) => `${n} ${unit}`): Check {
  if (got === undefined) return { label, verdict: "bad", detail: `Falta este paso. Esperado: ${fmt(want)}.`, points: 0, max };
  const d = Math.abs(got - want);
  if (d <= ok) return { label, verdict: "ok", detail: `${fmt(got)} — correcto (referencia ${fmt(want)}).`, points: max, max };
  if (d <= warn) return { label, verdict: "warn", detail: `${fmt(got)} — aceptable, lo ideal es ${fmt(want)}.`, points: max / 2, max };
  return { label, verdict: "bad", detail: `${fmt(got)} — incorrecto, debería ser ≈ ${fmt(want)}.`, points: 0, max };
}

const t = (n: number) => formatTime(n);

/** Evalúa el programa del alumno contra la solución del ejercicio. */
export function evaluate(user: Program, exercise: Exercise) {
  const ref = generateProtocol(exercise.input, "ref");
  const R = extractRoles(ref.program);
  const U = extractRoles(user);
  const checks: Check[] = [];

  if (R.rt) checks.push(compare("Retrotranscripción (temperatura)", U.rt?.temp, R.rt.temp, 3, 8, "°C"));
  if (R.initial) {
    checks.push(compare("Desnaturalización inicial (temperatura)", U.initial?.temp, R.initial.temp, 1, 3, "°C"));
    checks.push(compare("Desnaturalización inicial (tiempo)", U.initial?.time, R.initial.time, R.initial.time * 0.25, R.initial.time, "s", 10, t));
  }
  if (R.touchdown) {
    const ok = !!U.touchdown;
    checks.push({ label: "Etapa touchdown", verdict: ok ? "ok" : "bad", detail: ok ? `${U.touchdown!.repeats} ciclos con descenso por ciclo — correcto.` : "Falta una etapa con Δ/ciclo negativo en el anillamiento.", points: ok ? 10 : 0, max: 10 });
  }
  if (R.cycling) {
    checks.push(compare("Número de ciclos", U.cycling?.repeats, R.cycling.repeats, 3, 7, "ciclos"));
    checks.push(compare("Desnaturalización (temperatura)", U.denat?.temp, R.denat!.temp, 1, 3, "°C"));
    checks.push(compare("Desnaturalización (tiempo)", U.denat?.time, R.denat!.time, 5, 20, "s", 10, t));
    checks.push(compare(R.ext ? "Anillamiento (temperatura)" : "Anillamiento/extensión (temperatura)", U.anneal?.temp, R.anneal!.temp, 2, 5, "°C", 15));
    if (R.ext) {
      checks.push(compare("Extensión (temperatura)", U.ext?.temp, R.ext.temp, 2, 4, "°C"));
      checks.push(compare("Extensión (tiempo)", U.ext?.time, R.ext.time, Math.max(R.ext.time * 0.2, 10), R.ext.time * 0.6, "s", 15, t));
    } else if (U.cycling && U.cycling.steps.length > 2) {
      checks.push({ label: "Estructura del ciclo", verdict: "warn", detail: "En qPCR se usan dos pasos (anillamiento y extensión combinados).", points: 5, max: 10 });
    }
  }
  if (R.melt) checks.push({ label: "Curva de fusión", verdict: U.melt ? "ok" : "bad", detail: U.melt ? "Incluida — correcto." : "Falta la curva de fusión (95 °C / 65 °C / 95 °C).", points: U.melt ? 10 : 0, max: 10 });
  if (R.finalExt) checks.push(compare("Extensión final (tiempo)", U.finalExt?.time, R.finalExt.time, R.finalExt.time * 0.5, R.finalExt.time * 1.5, "s", 10, t));
  else if (U.finalExt) checks.push({ label: "Extensión final", verdict: "warn", detail: "En qPCR no hace falta extensión final.", points: 5, max: 10 });
  checks.push(compare("Hold final", U.hold?.temp, 4, 2, 8, "°C", 5));
  checks.push(compare("Tapa calefactada", user.lidTemp, 105, 2, 6, "°C", 5));

  const score = checks.reduce((a, c) => a + c.points, 0);
  const max = checks.reduce((a, c) => a + c.max, 0);
  return { checks, score: Math.round((score / max) * 100), reference: ref };
}
