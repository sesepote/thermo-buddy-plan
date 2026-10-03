/**
 * Cálculo de la temperatura de fusión (Tm) de cebadores.
 *
 * - Para cebadores cortos (< 14 nt) se usa la regla de Wallace:
 *     Tm = 2·(A+T) + 4·(G+C)
 * - Para el resto se usa el modelo "nearest-neighbor" de SantaLucia (1998),
 *   que suma la entalpía (ΔH) y entropía (ΔS) de cada par de bases vecinas,
 *   con corrección por sales (Na+ y Mg2+) según von Ahsen et al. (2001).
 */

/** Parámetros termodinámicos unificados SantaLucia 1998: [ΔH kcal/mol, ΔS cal/(K·mol)]. */
const NN: Record<string, [number, number]> = {
  AA: [-7.9, -22.2],
  AT: [-7.2, -20.4],
  TA: [-7.2, -21.3],
  CA: [-8.5, -22.7],
  GT: [-8.4, -22.4],
  CT: [-7.8, -21.0],
  GA: [-8.2, -22.2],
  CG: [-10.6, -27.2],
  GC: [-9.8, -24.4],
  GG: [-8.0, -19.9],
};

/** Cada dinucleótido es equivalente a su complementario inverso (p. ej. TT = AA). */
const ALIAS: Record<string, string> = {
  AA: "AA", TT: "AA",
  AT: "AT", TA: "TA",
  CA: "CA", TG: "CA",
  GT: "GT", AC: "GT",
  CT: "CT", AG: "CT",
  GA: "GA", TC: "GA",
  CG: "CG", GC: "GC",
  GG: "GG", CC: "GG",
};

const R = 1.987; // constante de los gases en cal/(K·mol)

/** Limpia una secuencia: mayúsculas y solo A/C/G/T. */
export function cleanSeq(seq: string): string {
  return seq.toUpperCase().replace(/[^ACGT]/g, "");
}

/** Porcentaje de G+C de una secuencia. */
export function gcContent(seq: string): number {
  const s = cleanSeq(seq);
  if (!s.length) return 0;
  const gc = [...s].filter((b) => b === "G" || b === "C").length;
  return (gc / s.length) * 100;
}

export interface TmOptions {
  /** Concentración de Na+/K+ monovalente en mM (por defecto 50). */
  naMM?: number;
  /** Concentración de Mg2+ en mM (por defecto 1.5). */
  mgMM?: number;
  /** Concentración de dNTPs totales en mM (los dNTPs secuestran Mg2+). */
  dntpMM?: number;
  /** Concentración de cebador en µM (por defecto 0.5). */
  primerUM?: number;
}

/** Calcula la Tm de un cebador en °C. Devuelve NaN si la secuencia es demasiado corta. */
export function calcTm(seq: string, opts: TmOptions = {}): number {
  const s = cleanSeq(seq);
  if (s.length < 6) return NaN;

  // Cebadores muy cortos: regla de Wallace (rápida y suficientemente precisa).
  if (s.length < 14) {
    let at = 0, gc = 0;
    for (const b of s) (b === "A" || b === "T" ? at++ : gc++);
    return 2 * at + 4 * gc;
  }

  const { naMM = 50, mgMM = 1.5, dntpMM = 0.8, primerUM = 0.5 } = opts;

  // 1) Suma de contribuciones de cada par de bases vecinas.
  let dH = 0, dS = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const [h, e] = NN[ALIAS[s.slice(i, i + 2)]];
    dH += h;
    dS += e;
  }

  // 2) Iniciación: depende de si los extremos son G·C o A·T.
  for (const end of [s[0], s[s.length - 1]]) {
    if (end === "G" || end === "C") { dH += 0.1; dS += -2.8; }
    else { dH += 2.3; dS += 4.1; }
  }

  // 3) Corrección por sales: el Mg2+ libre equivale a mucho más Na+.
  const freeMg = Math.max(mgMM - dntpMM, 0);
  const naEq = (naMM + 120 * Math.sqrt(freeMg)) / 1000; // en mol/L
  dS += 0.368 * (s.length - 1) * Math.log(naEq);

  // 4) Tm = ΔH / (ΔS + R·ln(Ct/4)), con ΔH en cal/mol y resultado en °C.
  const ct = primerUM * 1e-6;
  const tmK = (dH * 1000) / (dS + R * Math.log(ct / 4));
  return tmK - 273.15;
}

/** Redondea a 0,1 °C. */
export const round1 = (n: number) => Math.round(n * 10) / 10;
