/** Cabecera común de cada módulo con botón grande para volver al menú. */
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenHeader({ title, subtitle, actions }: { title: string; subtitle?: string | undefined; actions?: ReactNode }) {
  return (
    <header className="flex items-center gap-4 border-b bg-panel px-4 py-3">
      <Link to="/" className="hw-key flex h-12 items-center gap-1 rounded-md px-4 text-base">
        <ChevronLeft className="size-5" /> Menú
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
