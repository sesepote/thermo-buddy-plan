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

const fileNumber = (name: string) => Number(/caso-(\d+)\.json$/.exec(name)?.[1] ?? 0);

async function dir() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const d = path.join(process.cwd(), "ejercicios");
  await fs.mkdir(d, { recursive: true });
  return { fs, path, d };
}

/** Lee los casos ordenados por número de archivo (caso-1, caso-2…). */
export async function readCases(): Promise<PracticeCase[]> {
  const { githubConfig, readCasesGithub } = await import("./ejercicios.github.server");
  const cfg = githubConfig();
  if (cfg) {
    try { return await readCasesGithub(cfg); } catch { /* si GitHub falla, usa la copia incluida */ }
  }
  try {
    const { fs, path, d } = await dir();
    const names = (await fs.readdir(d)).filter(n => /^caso-\d+\.json$/.test(n)).sort((x, y) => fileNumber(x) - fileNumber(y));
    const list = await Promise.all(names.map(async n => JSON.parse(await fs.readFile(path.join(d, n), "utf8")) as unknown));
    return list.filter(isCase);
  } catch {
    return Object.entries(bundled).sort(([x], [y]) => fileNumber(x) - fileNumber(y)).map(([, c]) => c).filter(isCase);
  }
}

/** Reescribe la carpeta con numeración consecutiva: caso-1.json … caso-N.json. */
export async function writeCases(cases: PracticeCase[], message = "Actualizar ejercicios") {
  const { githubConfig, writeCasesGithub } = await import("./ejercicios.github.server");
  const cfg = githubConfig();
  if (cfg) return writeCasesGithub(cfg, cases, message);
  let disk;
  try { disk = await dir(); } catch { throw new Error("Este servidor no permite guardar archivos y faltan GITHUB_TOKEN / GITHUB_REPO."); }
  const { fs, path, d } = disk;
  for (const n of await fs.readdir(d)) if (/^caso-\d+\.json$/.test(n)) await fs.unlink(path.join(d, n));
  for (const [i, c] of cases.entries()) await fs.writeFile(path.join(d, `caso-${i + 1}.json`), JSON.stringify(c, null, 2) + "\n");
}
