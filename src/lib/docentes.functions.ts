/** Acceso docente: lista de nombres, inicio de sesión y cambio de contraseña. */
import { createServerFn } from "@tanstack/react-start";
import type { Credentials } from "./docentes.server";

export const listTeachers = createServerFn({ method: "GET" }).handler(async () => {
  const { readTeachers } = await import("./docentes.server");
  return (await readTeachers()).map(t => ({ usuario: t.usuario, nombre: t.nombre }));
});

export const loginTeacher = createServerFn({ method: "POST" })
  .inputValidator((d: Credentials) => d)
  .handler(async ({ data }) => {
    const { authenticate } = await import("./docentes.server");
    const t = await authenticate(data);
    return t ? { ok: true as const, nombre: t.nombre, usuario: t.usuario } : { ok: false as const };
  });

export const changeTeacherPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { auth: Credentials; next: string }) => d)
  .handler(async ({ data }) => {
    const { changePassword } = await import("./docentes.server");
    try {
      const error = await changePassword(data.auth, String(data.next));
      return error ? { ok: false as const, error } : { ok: true as const };
    } catch (e) { return { ok: false as const, error: (e as Error).message }; }
  });
