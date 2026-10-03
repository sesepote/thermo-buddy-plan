/**
 * Modelo de datos de un programa de termociclador.
 *
 * Un programa se compone de "etapas" (stages). Cada etapa se repite N veces
 * (repeats) y contiene uno o varios "pasos" (steps) con temperatura y tiempo.
 * Esta es la misma estructura que usan la mayoría de termocicladores
 * comerciales (Bio-Rad, Eppendorf, Applied Biosystems).
 */

/** Un paso individual: mantener el bloque a `temp` durante `time` segundos. */
export interface Step {
  id: string;
  /** Nombre descriptivo (p. ej. "Desnaturalización"). */
  label: string;
  /** Temperatura objetivo en °C. */
  temp: number;
  /** Duración en segundos. 0 significa "infinito" (hold final). */
  time: number;
  /**
   * Variación de temperatura por ciclo (°C). Se usa en PCR touchdown,
   * p. ej. -1 baja un grado en cada repetición de la etapa.
   */
  deltaPerCycle?: number;
  /** Gradiente opcional a lo largo del bloque (12 columnas). */
  gradient?: { low: number; high: number };
}

/** Una etapa: grupo de pasos que se repite `repeats` veces. */
export interface Stage {
  id: string;
  repeats: number;
  steps: Step[];
}

/** Programa completo. */
export interface Program {
  id: string;
  name: string;
  /** Temperatura de la tapa calefactada (evita condensación). */
  lidTemp: number;
  /** Velocidad de rampa del bloque en °C/s. */
  rampRate: number;
  stages: Stage[];
}

/** Genera un identificador único. Llamar solo en tiempo de ejecución (nunca a nivel de módulo). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Formatea segundos como mm:ss, o "∞" para el hold infinito. */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return "∞";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Copia profunda de un programa asignando ids nuevos (para duplicar). */
export function cloneProgram(p: Program, name?: string): Program {
  return {
    ...p,
    id: uid(),
    name: name ?? p.name,
    stages: p.stages.map((st) => ({
      ...st,
      id: uid(),
      steps: st.steps.map((s) => ({ ...s, id: uid(), gradient: s.gradient ? { ...s.gradient } : undefined })),
    })),
  };
}
