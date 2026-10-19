/**
 * Funciones de servidor de los perfiles del termociclador. Leer es libre;
 * guardar y eliminar piden la contraseña de docente.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Program } from "./pcr/types";

export const listProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const { readProfiles } = await import("./perfiles.server");
  return readProfiles();
});

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; program: Program }) => d)
  .handler(async ({ data }) => {
    const { passwordMatches } = await import("./ejercicios.server");
    const { isProgram, readProfiles, writeProfiles } = await import("./perfiles.server");
    if (!passwordMatches(String(data.password))) return { ok: false as const, error: "Contraseña incorrecta" };
    if (!isProgram(data.program)) return { ok: false as const, error: "Programa no válido" };
    try {
      const all = await readProfiles();
      const exists = all.some(p => p.id === data.program.id);
      const next = exists ? all.map(p => (p.id === data.program.id ? data.program : p)) : [...all, data.program];
      await writeProfiles(next, `${exists ? "chore: actualizar" : "feat: nuevo"} perfil ${data.program.name}`);
    } catch (e) { return { ok: false as const, error: (e as Error).message }; }
    return { ok: true as const };
  });

export const deleteProfile = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    const { passwordMatches } = await import("./ejercicios.server");
    const { readProfiles, writeProfiles } = await import("./perfiles.server");
    if (!passwordMatches(String(data.password))) return { ok: false as const, error: "Contraseña incorrecta" };
    try { await writeProfiles((await readProfiles()).filter(p => p.id !== data.id), "chore: eliminar perfil y renumerar"); } catch (e) { return { ok: false as const, error: (e as Error).message }; }
    return { ok: true as const };
  });
