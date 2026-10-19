/**
 * Acceso a la carpeta `ejercicios/` (solo servidor).
 *
 * Este módulo nunca se envía al navegador: la contraseña y las soluciones
 * se quedan en el servidor. Para cambiar la contraseña, edita EXERCISE_PASSWORD
 * aquí y vuelve a publicar.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { isCase, type PracticeCase } from "./pcr/practice";

/** Contraseña para crear y eliminar ejercicios. */
const EXERCISE_PASSWORD = "bioPCRmol";

/** Comparación en tiempo constante (no revela cuántos caracteres coinciden). */
export function passwordMatches(input: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(EXERCISE_PASSWORD, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Copia incluida en la compilación del servidor, por si no hay disco escribible. */
const bundled = import.meta.glob<PracticeCase>("/ejercicios/*.json", { eager: true, import: "default" });

/** Lee los casos ordenados por número de archivo (caso-1, caso-2…). */
export async function readCases(): Promise<PracticeCase[]> {
  const { readJsonFolder } = await import("./ejercicios.github.server");
  return (await readJsonFolder("ejercicios", "caso", bundled)).filter(isCase);
}

/** Reescribe la carpeta con numeración consecutiva: caso-1.json … caso-N.json. */
export async function writeCases(cases: PracticeCase[], message = "Actualizar ejercicios") {
  const { writeJsonFolder } = await import("./ejercicios.github.server");
  return writeJsonFolder("ejercicios", "caso", cases, message);
}
