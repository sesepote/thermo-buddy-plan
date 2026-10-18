/** Botón táctil que alterna entre los idiomas disponibles. */
import { useApp } from "@/lib/store";
import { useT, LANGUAGE_LABEL, DICTIONARIES, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string | undefined }) {
  const lang = useApp((s) => s.language);
  const setLanguage = useApp((s) => s.setLanguage);
  const t = useT();
  const langs = Object.keys(DICTIONARIES) as Language[];
  const next = langs[(langs.indexOf(lang) + 1) % langs.length] ?? "es";
  return (
    <button type="button" onClick={() => setLanguage(next)} aria-label={t.common.language}
      className={cn("hw-key flex size-12 shrink-0 items-center justify-center rounded-md font-mono text-sm font-semibold", className)}>
      {LANGUAGE_LABEL[lang]}
    </button>
  );
}
