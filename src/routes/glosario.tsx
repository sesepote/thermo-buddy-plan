import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/sim/LanguageToggle";
import { ThemeToggle } from "@/components/sim/ThemeToggle";
import { StatusBars } from "@/components/sim/StatusBars";
import { GLOSSARY, GLOSSARY_CATEGORIES, GLOSSARY_SOURCE } from "@/lib/pcr/glossary";

export const Route = createFileRoute("/glosario")({
  head: () => ({
    meta: [
      { title: "Glosario PCR — Simulador de Termociclador" },
      { name: "description", content: "Glosario de PCR y laboratorio de análisis clínico, con términos de INCUAL ordenados por categorías y buscador." },
      { property: "og:title", content: "Glosario PCR — Simulador de Termociclador" },
      { property: "og:description", content: "Consulta términos de PCR y análisis clínico: genética, inmunología, calidad, seguridad y funciones del equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GlossaryPage,
});

/** Normaliza para buscar sin tildes ni mayúsculas. */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // Filtra por texto (término o definición) y categoría, en orden alfabético.
  const groups = useMemo(() => {
    const q = norm(query.trim());
    return GLOSSARY_CATEGORIES.filter((c) => !category || c === category)
      .map((c) => ({
        category: c,
        items: GLOSSARY.filter((g) => g.category === c && (!q || norm(g.term + " " + g.def).includes(q)))
          .sort((a, b) => a.term.localeCompare(b.term, "es")),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, category]);
  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <StatusBars section={useT().sections.glossary}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="hw-key flex h-12 items-center gap-1 rounded-md px-4 text-base">
            <ChevronLeft className="size-5" /> Menú
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">{useT().titles.glossary}</h1>
          <span className="ml-auto font-mono text-sm text-muted-foreground">{count} términos</span>
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <p className="text-sm text-muted-foreground">
          Fuente de datos:{" "}
          <a href={GLOSSARY_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">INCUAL</a>
        </p>

        <label className="flex h-14 items-center gap-3 rounded-lg border bg-panel px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar término o definición…"
            className="h-full min-w-0 flex-1 bg-transparent text-lg outline-none"
          />
          {query && (
            <button className="flex size-10 items-center justify-center" onClick={() => setQuery("")} aria-label="Borrar búsqueda">
              <X className="size-5" />
            </button>
          )}
        </label>

        <div className="flex flex-wrap gap-2">
          {[null, ...GLOSSARY_CATEGORIES].map((c) => (
            <button
              key={c ?? "all"}
              onClick={() => setCategory(c)}
              className={`min-h-11 rounded-full border px-4 text-sm ${category === c ? "border-primary bg-primary text-primary-foreground" : "bg-panel"}`}
            >
              {c ?? "Todas"}
            </button>
          ))}
        </div>

        {groups.length === 0 && <p className="py-10 text-center text-muted-foreground">Sin resultados para “{query}”.</p>}

        {groups.map((g) => (
          <section key={g.category} className="flex flex-col gap-2">
            <h2 className="sticky top-0 z-10 bg-background py-2 font-mono text-sm uppercase tracking-wider text-primary">{g.category}</h2>
            <dl className="grid gap-2 md:grid-cols-2">
              {g.items.map((item) => (
                <div key={item.term} className="rounded-lg border bg-panel p-4">
                  <dt className="font-semibold">{item.term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.def}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </StatusBars>
  );
}
