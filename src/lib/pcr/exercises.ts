/**
 * Banco de ejercicios de la zona de entrenamiento (la evaluación vive en practice.ts).
 *
 * Cada ejercicio describe un caso práctico mediante una entrada de la
 * calculadora (`CalcInput`). La solución de referencia se obtiene con
 * `generateProtocol`, de modo que calculadora y entrenamiento usan
 * exactamente las mismas reglas.
 */
import { DEFAULT_INPUT, type CalcInput } from "./protocol";
import { POLYMERASES, REACTION_TYPES, TEMPLATES } from "./reagents";

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
  ex("i4", "intermedio", "Molde rico en GC", { polymeraseId: "taq", fwdTm: 66, revTm: 65, ampliconBp: 600, template: "genomic", highGC: true, additives: { dmso: 5, formamide: 0, extraMg: 0 } }, ["Alto GC: desnaturaliza a 98 °C.", "El 5 % de DMSO baja la Tm ~3 °C."]),
  ex("i5", "intermedio", "RT-PCR en un paso", { reaction: "rt-onestep", polymeraseId: "hs-taq", fwdTm: 60, revTm: 60, ampliconBp: 400, template: "cdna" }, ["Primero RT a 50 °C 15 min.", "cDNA: 35 ciclos."]),
  ex("a1", "avanzado", "qPCR SYBR Green", { reaction: "qpcr-sybr", polymeraseId: "hs-taq", fwdTm: 60, revTm: 60, ampliconBp: 150, template: "cdna" }, ["40 ciclos de dos pasos: 95 °C 15 s / 60 °C 60 s.", "Añade curva de fusión, sin extensión final."]),
  ex("a2", "avanzado", "qPCR TaqMan", { reaction: "qpcr-probe", polymeraseId: "hs-taq", fwdTm: 59, revTm: 60, ampliconBp: 120, template: "cdna" }, ["Igual que SYBR pero sin curva de fusión."]),
  ex("a3", "avanzado", "Touchdown con Tm descompensadas", { reaction: "touchdown", polymeraseId: "taq", fwdTm: 58, revTm: 64, ampliconBp: 900, template: "genomic" }, ["10 ciclos desde Ta + 10 °C bajando 1 °C/ciclo.", "Usa el campo Δ/ciclo = −1."]),
  ex("a4", "avanzado", "PCR larga de 12 kb", { reaction: "long", polymeraseId: "longamp", fwdTm: 63, revTm: 64, ampliconBp: 12000, template: "genomic" }, ["LongAmp: 94 °C, extensión a 65 °C, 50 s/kb.", "Extensión final 10 min."]),
  ex("a5", "avanzado", "Phusion con DMSO y GC alto", { polymeraseId: "phusion", fwdTm: 70, revTm: 69, ampliconBp: 1200, template: "genomic", highGC: true, additives: { dmso: 3, formamide: 0, extraMg: 0 } }, ["3 % DMSO baja la Tm ~1,8 °C.", "Ta = Tm + 3 °C pero nunca > 72 °C."]),
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
