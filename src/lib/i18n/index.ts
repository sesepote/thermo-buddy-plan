/**
 * Sistema de idiomas ligero: cada idioma es un diccionario con la misma forma
 * que `es` (el compilador avisa si falta una frase). El idioma se guarda en useApp.
 */
import { useApp } from "@/lib/store";
import { es, type Translations } from "./es";
import { en } from "./en";

export type Language = "es" | "en";
export const DICTIONARIES: Record<Language, Translations> = { es, en };
export const LANGUAGE_LABEL: Record<Language, string> = { es: "ES", en: "EN" };

/** Devuelve el diccionario del idioma activo; se actualiza al cambiarlo. */
export function useT(): Translations {
  return DICTIONARIES[useApp((s) => s.language)];
}
export type { Translations };
