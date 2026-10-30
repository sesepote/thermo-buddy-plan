/** Barras compartidas: muestran la misma sesión del termociclador en todas las pantallas. */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useThermocyclerSession } from "@/lib/thermocycler-session";
import { AMBIENT, buildSegments, stateAt, totalDuration } from "@/lib/pcr/simulation";
import { formatTime } from "@/lib/pcr/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StatusBars({ section, menu = false, children }: { section: string; menu?: boolean; children: ReactNode }) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Teclado físico: el body está bloqueado (anti-rebote táctil), así que las flechas desplazan el contenedor interno.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = scrollRef.current;
      if (!el || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='slider']")) return;
      const page = el.clientHeight * 0.9;
      const map: Record<string, number> = { ArrowDown: 40, ArrowUp: -40, PageDown: page, PageUp: -page, " ": e.shiftKey ? -page : page };
      if (e.key === "Home") el.scrollTo({ top: 0 });
      else if (e.key === "End") el.scrollTo({ top: el.scrollHeight });
      else if (e.key in map) {
        if (e.key === " " && target?.closest("button, a")) return;
        el.scrollBy({ top: map[e.key] ?? 0 });
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const programs = useApp((s) => s.programs);
  const activeId = useApp((s) => s.activeId);
  const { status, simTime, lid } = useThermocyclerSession();
  const program = programs.find((p) => p.id === activeId) ?? programs[0];
  const segments = useMemo(() => program ? buildSegments(program) : [], [program]);
  const total = useMemo(() => totalDuration(segments), [segments]);
  const active = status !== "idle";
  const temp = active && status !== "preheating" ? stateAt(segments, simTime).temp : AMBIENT;
  const elapsed = active ? simTime : 0;
  const progress = total > 0 ? Math.min(Math.max(elapsed / total * 100, 0), 100) : 0;
  const displayTime = (seconds: number) => formatTime(Math.max(seconds, 0.01));
  const statusLabel = t.status[status];

  return (
    <main className={cn("flex h-dvh min-w-0 flex-col overflow-hidden", menu ? "relative items-center bg-menu-bg font-body text-ice-soft" : "bg-background text-foreground")}>
      <header className={cn("z-20 w-full shrink-0 border-b px-5 py-3 sm:px-8", menu ? "border-ice/15 bg-menu-bg" : "border-border bg-panel")}>
        <div className={cn("mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 font-mono text-[11px] uppercase sm:text-xs", menu ? "text-ice/75" : "text-muted-foreground")}>
          <span className={cn("font-display font-semibold", menu ? "text-ice-soft" : "text-foreground")}>
            SIM-PCR <span className={cn("font-normal", menu ? "text-ice/50" : "text-muted-foreground")}>/ {section}</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 tabular-nums">
            <span className="whitespace-nowrap">{t.status.block} <strong className={cn("ml-1 font-medium", menu ? "text-ice-soft" : "text-foreground")}>{temp.toFixed(1)} °C</strong></span>
            <span className="whitespace-nowrap">{t.status.lid} <strong className={cn("ml-1 font-medium", menu ? "text-ice-soft" : "text-foreground")}>{lid.toFixed(1)} °C</strong></span>
            <span className="flex items-center gap-2 whitespace-nowrap" role="status"><span className={cn("size-2 shrink-0 rounded-full", status === "running" ? "bg-run" : status === "paused" || status === "preheating" ? "bg-amber" : menu ? "bg-ice/50" : "bg-muted-foreground")} />{statusLabel}</span>
          </div>
        </div>
      </header>

      {/* touch-pan-y: en portátiles táctiles (Chrome/Edge/Firefox) el arrastre del dedo desplaza este contenedor. */}
      <div ref={scrollRef} className="relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none touch-pan-y">
        {children}
      </div>

      <footer className={cn("z-20 w-full shrink-0 border-t px-5 py-3 sm:px-8", menu ? "border-ice/15 bg-menu-bg" : "border-border bg-panel")}>
        <div className={cn("mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 font-mono text-[11px] uppercase sm:text-xs", menu ? "text-ice/65" : "text-muted-foreground")}>
          <p className="min-w-0 truncate">{t.status.program} <span className={cn("ml-1", menu ? "text-ice-soft" : "text-foreground")}>{program?.name ?? "—"}</span></p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 tabular-nums">
            <span className="whitespace-nowrap">{t.status.elapsed} <strong className={cn("ml-1 font-medium", menu ? "text-ice-soft" : "text-foreground")}>{displayTime(elapsed)}</strong></span>
            <span className="whitespace-nowrap">{t.status.remaining} <strong className={cn("ml-1 font-medium", menu ? "text-ice-soft" : "text-foreground")}>{displayTime(Math.max(total - elapsed, 0))}</strong></span>
            <span className="whitespace-nowrap">{t.status.total} <strong className={cn("ml-1 font-medium", menu ? "text-ice-soft" : "text-foreground")}>{displayTime(total)}</strong></span>
          </div>
        </div>
        <div className={cn("mx-auto mt-3 h-0.5 w-full max-w-7xl overflow-hidden", menu ? "bg-ice/10" : "bg-muted")} role="progressbar" aria-label={t.status.progress} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full transition-[width] duration-300", menu ? "bg-ice" : "bg-amber")} style={{ width: `${progress}%` }} />
        </div>
      </footer>
    </main>
  );
}