/**
 * Funciones de servidor de los ejercicios. El navegador solo recibe la
 * versión pública de cada caso; las soluciones se comparan en el servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { isCase, toPublic, verifyPractice, type MasterMixSettings, type PracticeCase } from "./pcr/practice";
import type { Program } from "./pcr/types";

/** Lista pública: enunciado y estructura, sin valores correctos. */
export const listExercises = createServerFn({ method: "GET" }).handler(async () => {
  const { readCases } = await import("./ejercicios.server");
  return (await readCases()).map(toPublic);
});

export const verifyExercise = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; program: Program; mix: MasterMixSettings }) => d)
  .handler(async ({ data }) => {
    const { readCases } = await import("./ejercicios.server");
    const exercise = (await readCases()).find(c => c.id === data.id);
    if (!exercise) throw new Error("Ejercicio no encontrado");
    return verifyPractice(data.program, data.mix, exercise);
  });

export const checkExercisePassword = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const { passwordMatches } = await import("./ejercicios.server");
    return { ok: passwordMatches(String(data.password)) };
  });

export const createExercise = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; exercise: PracticeCase }) => d)
  .handler(async ({ data }) => {
    const { passwordMatches, readCases, writeCases } = await import("./ejercicios.server");
    if (!passwordMatches(String(data.password))) return { ok: false as const, error: "Contraseña incorrecta" };
    if (!isCase(data.exercise)) return { ok: false as const, error: "Ejercicio no válido" };
    try {
      const all = await readCases();
      await writeCases([...all, data.exercise], `feat: nuevo caso ${all.length + 1}`);
    } catch (e) { return { ok: false as const, error: (e as Error).message }; }
    return { ok: true as const };
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    const { passwordMatches, readCases, writeCases } = await import("./ejercicios.server");
    if (!passwordMatches(String(data.password))) return { ok: false as const, error: "Contraseña incorrecta" };
    try { await writeCases((await readCases()).filter(c => c.id !== data.id), "chore: eliminar caso y renumerar"); } catch (e) { return { ok: false as const, error: (e as Error).message }; }
    return { ok: true as const };
  });
