/**
 * Cuentas de docentes en `docentes/docentes.json` (solo servidor). Cada cuenta
 * guarda una huella PBKDF2-SHA256 con sal, nunca la contraseña en claro.
 * Usa Web Crypto, disponible en Cloudflare Workers y en Node.
 */
export interface Teacher { usuario: string; nombre: string; salt: string; iter: number; hash: string }
import type { Credentials } from "./docentes.types";
export type { Credentials };

const bundled = import.meta.glob<Teacher[]>("/docentes/*.json", { eager: true, import: "default" });
const FILE = "docentes.json";
const ITER = 100_000;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], h => parseInt(h, 16));

async function derive(password: string, salt: string, iter: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(salt), iterations: iter }, key, 256));
}

/** Comparación en tiempo constante de dos huellas hex. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function readTeachers(): Promise<Teacher[]> {
  const { readFileEntries } = await import("./ejercicios.github.server");
  const entry = (await readFileEntries("docentes", bundled)).find(e => e.file === FILE);
  return Array.isArray(entry?.item) ? (entry.item as Teacher[]) : [];
}

/** Devuelve el docente si usuario y contraseña coinciden. */
export async function authenticate(c: Credentials | undefined | null): Promise<Teacher | null> {
  if (!c || typeof c.user !== "string" || typeof c.password !== "string") return null;
  const t = (await readTeachers()).find(x => x.usuario === c.user.trim().toLowerCase());
  if (!t) { await derive(c.password, "00", ITER); return null; }
  return same(await derive(c.password, t.salt, t.iter), t.hash) ? t : null;
}

export async function changePassword(c: Credentials, next: string) {
  const t = await authenticate(c);
  if (!t) return "Contraseña actual incorrecta";
  if (next.length < 6) return "La nueva contraseña debe tener al menos 6 caracteres";
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const updated = { ...t, salt, iter: ITER, hash: await derive(next, salt, ITER) };
  const list = (await readTeachers()).map(x => (x.usuario === t.usuario ? updated : x));
  const { writeOneFile } = await import("./ejercicios.github.server");
  await writeOneFile("docentes", FILE, list, `chore: cambiar contraseña de ${t.usuario}`, bundled);
  return null;
}
