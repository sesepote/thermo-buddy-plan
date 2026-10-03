/**
 * Generador de protocolos PCR.
 *
 * A partir de las entradas (polimerasa, tipo de reacción, cebadores, tamaño
 * del amplicón, molde y aditivos) construye un programa completo de
 * termociclador y una lista de explicaciones y avisos para el usuario.
 */
import type { Program, Stage, Step } from "./types";
import { calcTm, gcContent, round1 } from "./tm";
import {
  POLYMERASES,
  TEMPLATES,
  additiveTmShift,
  type Additives,
  type ReactionType,
  type TemplateType,
} from "./reagents";

export interface CalcInput {
  reaction: ReactionType;
  polymeraseId: string;
  /** Secuencias de cebadores (opcional si se dan las Tm manuales). */
  fwdSeq: string;
  revSeq: string;
  /** Tm manuales: se usan si no hay secuencia válida. */
  fwdTm: number;
  revTm: number;
  /** Tamaño del amplicón en pares de bases. */
  ampliconBp: number;
  template: TemplateType;
  highGC: boolean;
  additives: Additives;
  /** Mg2+ base del tampón en mM. */
  mgMM: number;
}

export const DEFAULT_INPUT: CalcInput = {
  reaction: "standard",
  polymeraseId: "taq",
  fwdSeq: "AGCGGATAACAATTTCACACAGGA",
  revSeq: "GTAAAACGACGGCCAGTGAATTC",
  fwdTm: 60,
  revTm: 60,
  ampliconBp: 1000,
  template: "plasmid",
  highGC: false,
  additives: { dmso: 0, betaine: 0, formamide: 0, extraMg: 0 },
  mgMM: 1.5,
};

export interface CalcResult {
  program: Program;
  fwdTm: number;
  revTm: number;
  ta: number;
  extTime: number;
  cycles: number;
  explanations: string[];
  warnings: string[];
}

/** Redondea tiempos a múltiplos de 5 s, como se programan en la práctica. */
const round5 = (s: number) => Math.max(5, Math.round(s / 5) * 5);

/** Genera el programa a partir de las entradas. `programId` permite ids estables. */
export function generateProtocol(input: CalcInput, programId = "calc"): CalcResult {
  const pol = POLYMERASES.find((p) => p.id === input.polymeraseId) ?? POLYMERASES[0]!;
  const tpl = TEMPLATES.find((t) => t.id === input.template) ?? TEMPLATES[0]!;
  const explanations: string[] = [];
  const warnings: string[] = [];

  // Contador local para ids de pasos/etapas deterministas.
  let n = 0;
  const id = () => `${programId}-${++n}`;
  const step = (label: string, temp: number, time: number, extra: Partial<Step> = {}): Step => ({
    id: id(), label, temp: round1(temp), time, ...extra,
  });
  const stage = (repeats: number, steps: Step[]): Stage => ({ id: id(), repeats, steps });

  // ---- 1. Tm de los cebadores --------------------------------------------
  const mg = input.mgMM + input.additives.extraMg;
  const tmOf = (seq: string, manual: number) => {
    const t = calcTm(seq, { mgMM: mg });
    return Number.isFinite(t) ? round1(t) : manual;
  };
  const shift = additiveTmShift(input.additives);
  const fwdTm = round1(tmOf(input.fwdSeq, input.fwdTm) + shift);
  const revTm = round1(tmOf(input.revSeq, input.revTm) + shift);
  const lowTm = Math.min(fwdTm, revTm);
  explanations.push(`Tm cebadores: directo ${fwdTm} °C, reverso ${revTm} °C (modelo nearest-neighbor, Mg²⁺ ${mg} mM).`);
  if (shift !== 0) explanations.push(`Los aditivos bajan la Tm unos ${round1(-shift)} °C (DMSO ≈ 0,6 °C/%, betaína ≈ 2 °C/M).`);
  if (Math.abs(fwdTm - revTm) > 5) warnings.push("Las Tm de los cebadores difieren más de 5 °C: rediseña uno de ellos o usa touchdown.");
  for (const [name, seq] of [["directo", input.fwdSeq], ["reverso", input.revSeq]] as const) {
    if (seq.trim()) {
      const gc = gcContent(seq);
      if (gc < 40 || gc > 60) warnings.push(`El cebador ${name} tiene ${round1(gc)} % GC (ideal 40–60 %).`);
    }
  }

  // ---- 2. Temperatura de anillamiento (Ta) -------------------------------
  let ta = lowTm + pol.annealOffset;
  ta = Math.min(ta, 72);
  ta = Math.max(ta, 45);
  ta = round1(ta);
  explanations.push(`Anillamiento: Tm más baja ${pol.annealOffset >= 0 ? "+" : "−"} ${Math.abs(pol.annealOffset)} °C según ${pol.name} → ${ta} °C.`);

  // ---- 3. Extensión ------------------------------------------------------
  const kb = input.ampliconBp / 1000;
  const isLong = input.reaction === "long";
  const extTemp = isLong ? Math.min(pol.extTemp, 68) : pol.extTemp;
  const extTime = round5(Math.max(kb * pol.secPerKb, pol.secPerKb >= 60 ? 30 : 15));
  explanations.push(`Extensión: ${kb} kb × ${pol.secPerKb} s/kb → ${extTime} s a ${extTemp} °C.`);
  if (kb > pol.maxKb) warnings.push(`${pol.name} no se recomienda para ${kb} kb (máx. ${pol.maxKb} kb). Usa LongAmp o Phusion.`);

  // ---- 4. Desnaturalización ---------------------------------------------
  let denatTemp = pol.denatTemp;
  if (input.highGC && denatTemp < 98) {
    denatTemp = 98;
    explanations.push("Molde rico en GC: desnaturalización elevada a 98 °C.");
  }
  if (input.highGC && input.additives.dmso === 0 && input.additives.betaine === 0)
    warnings.push("Con alto GC se recomienda añadir 3–5 % DMSO o 1 M betaína.");
  let initialTime = pol.initialTime;
  if (input.reaction === "colony") {
    initialTime = Math.max(initialTime, 300);
    explanations.push("PCR de colonia: desnaturalización inicial de 5 min para lisar las células.");
  }

  // ---- 5. Número de ciclos -----------------------------------------------
  let cycles = tpl.cycles;
  if (input.reaction === "qpcr-sybr" || input.reaction === "qpcr-probe") cycles = 40;
  explanations.push(`Ciclos: ${cycles} (molde: ${tpl.name}${cycles === 40 ? ", qPCR" : ""}).`);
  if (cycles > 35 && !input.reaction.startsWith("qpcr")) warnings.push("Más de 35 ciclos aumenta los productos inespecíficos.");

  // ---- 6. Construcción del programa por tipo de reacción -----------------
  const stages: Stage[] = [];

  if (input.reaction === "rt-onestep") {
    stages.push(stage(1, [step("Retrotranscripción", 50, 900)]));
    explanations.push("Retrotranscripción: 50 °C durante 15 min antes de activar la polimerasa.");
  }

  const initLabel = pol.id === "hs-taq" || input.reaction.startsWith("qpcr") ? "Activación inicial" : "Desnaturalización inicial";
  const initTime = input.reaction.startsWith("qpcr") ? Math.max(initialTime, 120) : initialTime;
  stages.push(stage(1, [step(initLabel, Math.max(denatTemp, 95), initTime)]));

  if (input.reaction === "qpcr-sybr" || input.reaction === "qpcr-probe") {
    // qPCR en dos pasos: anillamiento y extensión combinados a ~60 °C.
    const combined = round1(Math.min(Math.max(ta, 58), 62));
    stages.push(stage(cycles, [
      step("Desnaturalización", 95, 15),
      step("Anillamiento/extensión + lectura", combined, 60),
    ]));
    explanations.push(`qPCR: dos pasos, anillamiento/extensión combinados a ${combined} °C con lectura de fluorescencia.`);
    if (input.reaction === "qpcr-sybr") {
      stages.push(stage(1, [
        step("Curva de fusión: 95 °C", 95, 15),
        step("Curva de fusión: 65 °C", 65, 60),
        step("Curva de fusión: 95 °C", 95, 15),
      ]));
      explanations.push("SYBR Green: curva de fusión al final para comprobar un único producto.");
    }
  } else if (input.reaction === "touchdown") {
    // Touchdown: 10 ciclos con Ta inicial +10 °C que baja 1 °C/ciclo,
    // seguidos de los ciclos restantes a la Ta calculada.
    stages.push(stage(10, [
      step("Desnaturalización", denatTemp, pol.denatTime),
      step("Anillamiento touchdown", Math.min(ta + 10, 72), 30, { deltaPerCycle: -1 }),
      step("Extensión", extTemp, extTime),
    ]));
    stages.push(stage(Math.max(cycles - 10, 15), [
      step("Desnaturalización", denatTemp, pol.denatTime),
      step("Anillamiento", ta, 30),
      step("Extensión", extTemp, extTime),
    ]));
    explanations.push(`Touchdown: 10 ciclos desde ${Math.min(ta + 10, 72)} °C bajando 1 °C/ciclo, luego ${Math.max(cycles - 10, 15)} ciclos a ${ta} °C.`);
  } else {
    const denatTime = isLong ? Math.min(pol.denatTime, 10) : pol.denatTime;
    stages.push(stage(cycles, [
      step("Desnaturalización", denatTemp, denatTime),
      step("Anillamiento", ta, pol.secPerKb <= 30 ? 20 : 30),
      step("Extensión", extTemp, extTime),
    ]));
  }

  if (!input.reaction.startsWith("qpcr")) {
    const finalTime = isLong ? 600 : pol.finalExtTime;
    stages.push(stage(1, [step("Extensión final", extTemp, finalTime)]));
    explanations.push(`Extensión final: ${finalTime / 60} min para completar todos los productos.`);
  }
  stages.push(stage(1, [step("Conservación", 4, 0)]));
  explanations.push("Hold a 4 °C indefinido hasta recoger las muestras. Tapa a 105 °C.");

  const program: Program = {
    id: programId,
    name: `${pol.name} · ${input.ampliconBp} pb`,
    lidTemp: 105,
    rampRate: 3,
    stages,
  };
  return { program, fwdTm, revTm, ta, extTime, cycles, explanations, warnings };
}

/** Mezcla de reacción (master mix) para `samples` reacciones de `volume` µL, con 10 % extra. */
export function masterMix(input: CalcInput, volume: number, samples: number) {
  const pol = POLYMERASES.find((p) => p.id === input.polymeraseId) ?? POLYMERASES[0]!;
  const factor = samples * 1.1;
  const per = {
    buffer: volume / pol.bufferX,
    dntp: (volume * 0.2) / 10, // stock 10 mM → 200 µM final
    fwd: (volume * 0.5) / 10, // stock 10 µM → 0,5 µM final
    rev: (volume * 0.5) / 10,
    enzyme: (pol.unitsPer50 * (volume / 50)) / pol.stockU,
    dmso: (volume * input.additives.dmso) / 100,
    template: input.template === "colony" ? 0 : 1,
  };
  const used = Object.values(per).reduce((a, b) => a + b, 0);
  const rows = [
    { name: `Tampón ${pol.bufferX}x`, per: per.buffer },
    { name: "dNTPs 10 mM", per: per.dntp },
    { name: "Cebador directo 10 µM", per: per.fwd },
    { name: "Cebador reverso 10 µM", per: per.rev },
    ...(per.dmso > 0 ? [{ name: "DMSO", per: per.dmso }] : []),
    { name: `${pol.name} (${pol.stockU} U/µL)`, per: per.enzyme },
    { name: "Agua libre de nucleasas", per: Math.max(volume - used, 0) },
  ];
  return {
    rows: rows.map((r) => ({ ...r, total: r.per * factor })),
    template: per.template,
    factor,
  };
}
