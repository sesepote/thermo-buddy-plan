/**
 * Funciones de servidor de los ejercicios. El navegador solo recibe la
 * versión pública de cada caso; las soluciones se comparan en el servidor.
 * Crear, editar, clonar y borrar exigen credenciales de docente.
 */
import { createServerFn } from "@tanstack/react-start";
import { isCase, toPublic, verifyPractice, type ManualAnswer, type PracticeCase } from "./pcr/practice";
import type { Program } from "./pcr/types";
import type { Credentials } from "./docentes.types";

const denied = { ok: false as const, error: "Sesión docente no válida" };

/** Lista pública: enunciado y estructura, sin valores correctos. */
export const listExercises = createServerFn({ method: "GET" }).handler(async () => {
  const { readCases } = await import("./ejercicios.server");
  return (await readCases()).map(toPublic);
});

export const verifyExercise = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; program: Program; answer: ManualAnswer | null }) => d)
  .handler(async ({ data }) => {
    const { readCases } = await import("./ejercicios.server");
    const exercise = (await readCases()).find(c => c.id === data.id);
    if (!exercise) throw new Error("Ejercicio no encontrado");
    return verifyPractice(data.program, data.answer, exercise);
  });

/** Ejercicio completo (con soluciones) para editarlo o clonarlo; solo docentes. */
export const getExerciseForEdit = createServerFn({ method: "POST" })
  .inputValidator((d: { auth: Credentials; id: string }) => d)
  .handler(async ({ data }) => {
    const { authenticate } = await import("./docentes.server");
    if (!(await authenticate(data.auth))) return denied;
    const { readCases } = await import("./ejercicios.server");
    const exercise = (await readCases()).find(c => c.id === data.id);
    return exercise ? { ok: true as const, exercise } : { ok: false as const, error: "Ejercicio no encontrado" };
  });

/** Crea (id nuevo) o actualiza (id existente) un ejercicio: un único archivo. */
export const saveExercise = createServerFn({ method: "POST" })
  .inputValidator((d: { auth: Credentials; exercise: PracticeCase }) => d)
  .handler(async ({ data }) => {
    const { authenticate } = await import("./docentes.server");
    const teacher = await authenticate(data.auth);
    if (!teacher) return denied;
    if (!isCase(data.exercise)) return { ok: false as const, error: "Ejercicio no válido" };
    const { readCaseEntries, caseFileName, writeCase } = await import("./ejercicios.server");
    try {
      const all = await readCaseEntries();
      const prev = all.find(e => e.exercise.id === data.exercise.id);
      const order = prev?.exercise.order ?? Math.max(0, ...all.map(e => e.exercise.order ?? 0)) + 1;
      const exercise: PracticeCase = { ...data.exercise, order, author: prev?.exercise.author ?? teacher.nombre };
      const file = prev?.file ?? caseFileName(exercise.id, all.map(e => e.file));
      await writeCase(file, exercise, `${prev ? "chore: editar" : "feat: nuevo"} ejercicio ${exercise.title} (${teacher.usuario})`);
    } catch (e) { return { ok: false as const, error: (e as Error).message }; }
    return { ok: true as const };
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .inputValidator((d: { auth: Credentials; id: string }) => d)
  .handler(async ({ data }) => {
    const { authenticate } = await import("./docentes.server");
    const teacher = await authenticate(data.auth);
    if (!teacher) return denied;
    const { readCaseEntries, writeCase } = await import("./ejercicios.server");
    try {
      const entry = (await readCaseEntries()).find(e => e.exercise.id === data.id);
      if (!entry) return { ok: false as const, error: "Ejercicio no encontrado" };
      await writeCase(entry.file, null, `chore: eliminar ejercicio ${entry.exercise.title} (${teacher.usuario})`);
    } catch (e) { return { ok: false as const, error: (e as Error).message }; }
    return { ok: true as const };
  });
