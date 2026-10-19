/**
 * Perfiles guardados del termociclador en la carpeta `perfiles/` (solo servidor),
 * un archivo `perfil-N.json` por programa. Mismo almacenamiento que los ejercicios.
 */
import type { Program } from "./pcr/types";

const bundled = import.meta.glob<Program>("/perfiles/*.json", { eager: true, import: "default" });

export function isProgram(x: unknown): x is Program {
  const p = x as Program;
  return !!p && typeof p.id === "string" && typeof p.name === "string" && typeof p.lidTemp === "number"
    && Array.isArray(p.stages) && p.stages.length > 0
    && p.stages.every(s => typeof s.repeats === "number" && Array.isArray(s.steps) && s.steps.every(t => typeof t.temp === "number" && typeof t.time === "number"));
}

export async function readProfiles(): Promise<Program[]> {
  const { readJsonFolder } = await import("./ejercicios.github.server");
  return (await readJsonFolder("perfiles", "perfil", bundled)).filter(isProgram);
}

export async function writeProfiles(list: Program[], message: string) {
  const { writeJsonFolder } = await import("./ejercicios.github.server");
  return writeJsonFolder("perfiles", "perfil", list, message);
}
