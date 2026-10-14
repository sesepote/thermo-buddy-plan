/**
 * Base de datos estática de reactivos: polimerasas, tipos de reacción,
 * moldes y aditivos. Los valores son los recomendados habitualmente por los
 * fabricantes y por manuales de laboratorio; son orientativos.
 */

export interface Polymerase {
  id: string;
  name: string;
  /** Temperatura de desnaturalización en cada ciclo. */
  denatTemp: number;
  /** Tiempo de desnaturalización por ciclo (s). */
  denatTime: number;
  /** Desnaturalización / activación inicial (s). */
  initialTime: number;
  /** Temperatura de extensión. */
  extTemp: number;
  /** Segundos de extensión por kilobase de amplicón. */
  secPerKb: number;
  /** Desplazamiento de la Ta respecto a la Tm más baja (°C). */
  annealOffset: number;
  /** Tamaño máximo recomendado del amplicón (kb). */
  maxKb: number;
  /** Extensión final (s). */
  finalExtTime: number;
  /** Tampón de reacción (concentración del stock, "x"). */
  bufferX: number;
  /** Unidades de enzima por 50 µL y concentración del stock (U/µL). */
  unitsPer50: number;
  stockU: number;
  note: string;
}

export const POLYMERASES: Polymerase[] = [
  { id: "taq", name: "Taq polimerasa", denatTemp: 95, denatTime: 30, initialTime: 120, extTemp: 72, secPerKb: 60, annealOffset: -5, maxKb: 5, finalExtTime: 300, bufferX: 10, unitsPer50: 1.25, stockU: 5, note: "Estándar, deja extremos A (útil para clonación TA). Fidelidad baja." },
  { id: "hs-taq", name: "Hot-start Taq", denatTemp: 95, denatTime: 30, initialTime: 300, extTemp: 72, secPerKb: 60, annealOffset: -5, maxKb: 5, finalExtTime: 300, bufferX: 10, unitsPer50: 1.25, stockU: 5, note: "Requiere activación inicial prolongada; reduce productos inespecíficos." },
  { id: "pfu", name: "Pfu polimerasa", denatTemp: 95, denatTime: 30, initialTime: 120, extTemp: 72, secPerKb: 120, annealOffset: -5, maxKb: 5, finalExtTime: 600, bufferX: 10, unitsPer50: 2.5, stockU: 2.5, note: "Actividad correctora 3'→5'. Lenta: ~2 min/kb." },
  { id: "phusion", name: "Phusion (alta fidelidad)", denatTemp: 98, denatTime: 10, initialTime: 30, extTemp: 72, secPerKb: 30, annealOffset: 3, maxKb: 10, finalExtTime: 300, bufferX: 5, unitsPer50: 1, stockU: 2, note: "Tampón con mucha sal: la Ta suele ser Tm + 3 °C." },
  { id: "q5", name: "Q5 (alta fidelidad)", denatTemp: 98, denatTime: 10, initialTime: 30, extTemp: 72, secPerKb: 30, annealOffset: 3, maxKb: 10, finalExtTime: 120, bufferX: 5, unitsPer50: 1, stockU: 2, note: "Muy alta fidelidad. Ta = Tm + 3 °C (máx. 72 °C)." },
  { id: "kod", name: "KOD Hot Start", denatTemp: 95, denatTime: 20, initialTime: 120, extTemp: 70, secPerKb: 20, annealOffset: -5, maxKb: 6, finalExtTime: 300, bufferX: 10, unitsPer50: 1, stockU: 1, note: "Rápida (10–25 s/kb), extensión a 70 °C." },
  { id: "longamp", name: "LongAmp Taq", denatTemp: 94, denatTime: 30, initialTime: 30, extTemp: 65, secPerKb: 50, annealOffset: -5, maxKb: 30, finalExtTime: 600, bufferX: 5, unitsPer50: 5, stockU: 2.5, note: "Para amplicones largos (hasta 30 kb), extensión a 65 °C." },
];

export type ReactionType = "standard" | "touchdown" | "long" | "rt-onestep" | "qpcr-sybr" | "qpcr-probe" | "colony";

export const REACTION_TYPES: { id: ReactionType; name: string; desc: string }[] = [
  { id: "standard", name: "PCR estándar", desc: "Tres pasos: desnaturalización, anillamiento y extensión." },
  { id: "touchdown", name: "PCR touchdown", desc: "Ta inicial alta que baja 1 °C por ciclo para ganar especificidad." },
  { id: "long", name: "PCR larga", desc: "Amplicones > 5 kb: desnaturalización corta y extensión a menor temperatura." },
  { id: "rt-onestep", name: "RT-PCR (un paso)", desc: "Retrotranscripción de ARN a cDNA seguida de PCR en el mismo tubo." },
  { id: "qpcr-sybr", name: "qPCR SYBR Green", desc: "40 ciclos en dos pasos + curva de fusión." },
  { id: "qpcr-probe", name: "qPCR con sonda", desc: "40 ciclos en dos pasos (TaqMan), sin curva de fusión." },
  { id: "colony", name: "PCR de colonia", desc: "Desnaturalización inicial larga para lisar las bacterias." },
];

export type TemplateType = "genomic" | "plasmid" | "cdna" | "colony";

export const TEMPLATES: { id: TemplateType; name: string; cycles: number; amountNg: string }[] = [
  { id: "genomic", name: "ADN genómico", cycles: 32, amountNg: "10–100 ng" },
  { id: "plasmid", name: "Plásmido", cycles: 25, amountNg: "0,1–1 ng" },
  { id: "cdna", name: "cDNA / ARN", cycles: 35, amountNg: "1–10 µL de RT" },
  { id: "colony", name: "Colonia bacteriana", cycles: 30, amountNg: "una colonia" },
];

export interface Additives {
  /** % de DMSO (v/v). */
  dmso: number;
  /** % de formamida. */
  formamide: number;
  /** MgCl2 extra añadido en mM. */
  extraMg: number;
}

/**
 * Descenso aproximado de la Tm causado por los aditivos.
 * DMSO ≈ 0,6 °C por cada 1 %; formamida ≈ 0,65 °C por %; betaína ≈ 2 °C por M.
 */
export function additiveTmShift(a: Additives): number {
  return -(a.dmso * 0.6 + a.formamide * 0.65);
}
