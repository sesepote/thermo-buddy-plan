/**
 * Acceso a la carpeta `ejercicios/` (solo servidor). Cada ejercicio es un
 * archivo independiente; crear, editar o borrar toca solo ese archivo.
 * El orden en pantalla lo marca el campo `order`.
 */
import { isCase, type PracticeCase } from "./pcr/practice";

/** Copia incluida en la compilación del servidor, por si no hay disco escribible. */
const bundled = import.meta.glob<PracticeCase>("/ejercicios/*.json", { eager: true, import: "default" });

export interface CaseEntry { file: string; exercise: PracticeCase }

export async function readCaseEntries(): Promise<CaseEntry[]> {
  const { readFileEntries } = await import("./ejercicios.github.server");
  return (await readFileEntries("ejercicios", bundled))
    .filter((e): e is { file: string; item: PracticeCase } => isCase(e.item))
    .map(e => ({ file: e.file, exercise: e.item }))
    .sort((a, b) => (a.exercise.order ?? Infinity) - (b.exercise.order ?? Infinity) || a.file.localeCompare(b.file));
}

export async function readCases(): Promise<PracticeCase[]> {
  return (await readCaseEntries()).map(e => e.exercise);
}

/** Nombre de archivo seguro y único para un ejercicio nuevo. */
export function caseFileName(id: string, taken: string[]) {
  const base = `ejercicio-${id.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 60) || "nuevo"}`;
  let f = `${base}.json`, k = 2;
  while (taken.includes(f)) f = `${base}-${k++}.json`;
  return f;
}

export async function writeCase(file: string, exercise: PracticeCase | null, message: string) {
  const { writeOneFile } = await import("./ejercicios.github.server");
  return writeOneFile("ejercicios", file, exercise, message, bundled);
}
