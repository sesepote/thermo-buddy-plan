/**
 * Traductor de frases: la clave es el texto en español tal como aparece en la
 * interfaz (o el que generan las funciones de `src/lib/pcr/`). Admite
 * plantillas con `{x}`: los huecos capturados también se traducen, así los
 * mensajes dinámicos del motor PCR se traducen sin tocar la lógica.
 * Si una frase no está en el diccionario se muestra tal cual (español).
 */
import { useCallback } from "react";
import { useApp } from "@/lib/store";
import { PHRASES } from "./phrases";

export type PhraseLang = "es" | "en" | "gl";
type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
const escape = (s: string) => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&");

/** Plantillas con huecos compiladas una vez, de la más larga a la más corta. */
const TEMPLATES = Object.keys(PHRASES).filter(k => /\{\w+\}/.test(k)).sort((a, b) => b.length - a.length).map(key => {
  const names: string[] = [];
  const source = key.split(/(\{\w+\})/).map(part => {
    const m = /^\{(\w+)\}$/.exec(part);
    if (!m) return escape(part);
    names.push(m[1]!);
    return "(.+?)";
  }).join("");
  return { key, names, re: new RegExp(`^${source}$`, "s") };
});

const cache: Record<PhraseLang, Map<string, string>> = { es: new Map(), en: new Map(), gl: new Map() };

/** Traduce un texto ya construido (exacto o por plantilla). */
export function translate(lang: PhraseLang, text: string, vars?: Vars): string {
  if (lang === "es" || !text) return fill(text, vars);
  const exact = PHRASES[text];
  if (exact) return fill(exact[lang], vars);
  if (vars) return fill(text, vars);
  const hit = cache[lang].get(text);
  if (hit !== undefined) return hit;
  let out = text;
  for (const t of TEMPLATES) {
    const m = t.re.exec(text);
    if (!m) continue;
    const captured: Vars = {};
    t.names.forEach((n, i) => { captured[n] = translate(lang, m[i + 1] ?? ""); });
    out = fill(PHRASES[t.key]![lang], captured);
    break;
  }
  cache[lang].set(text, out);
  return out;
}

/** Hook: devuelve `tr(texto, vars?)` para el idioma activo. */
export function useTr() {
  const lang = useApp(s => s.language) as PhraseLang;
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
}

/** Traducción fuera de componentes (lee el idioma actual del almacén). */
export function trNow(text: string, vars?: Vars) {
  return translate(useApp.getState().language as PhraseLang, text, vars);
}
