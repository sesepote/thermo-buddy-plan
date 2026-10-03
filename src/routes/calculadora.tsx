import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Send, Info } from "lucide-react";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { useApp } from "@/lib/store";
import { DEFAULT_INPUT, generateProtocol, masterMix, type CalcInput } from "@/lib/pcr/protocol";
import { POLYMERASES, REACTION_TYPES, TEMPLATES } from "@/lib/pcr/reagents";
import { calcTm, gcContent, cleanSeq, round1 } from "@/lib/pcr/tm";
import { cloneProgram, formatTime } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de protocolos PCR — Simulador" },
      { name: "description", content: "Genera protocolos PCR completos según polimerasa, cebadores, amplicón, molde y aditivos." },
      { property: "og:title", content: "Calculadora de protocolos PCR" },
      { property: "og:description", content: "Temperaturas, tiempos, ciclos y master mix calculados automáticamente." },
    ],
  }),
  component: Calculator,
});

/** Botón de opción seleccionable de tamaño táctil. */
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("hw-key min-h-12 rounded-md px-3 py-2 text-left text-sm", active && "bg-none bg-amber text-amber-foreground")}>
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Calculator() {
  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  const [volume, setVolume] = useState(50);
  const [samples, setSamples] = useState(8);
  const { saveProgram, setActive } = useApp();
  const navigate = useNavigate();

  const set = (patch: Partial<CalcInput>) => setInput((i) => ({ ...i, ...patch }));
  const setAdd = (patch: Partial<CalcInput["additives"]>) => setInput((i) => ({ ...i, additives: { ...i.additives, ...patch } }));

  // El protocolo se recalcula en vivo con cada cambio de entrada.
  const result = useMemo(() => generateProtocol(input), [input]);
  const mix = useMemo(() => masterMix(input, volume, samples), [input, volume, samples]);
  const pol = POLYMERASES.find((p) => p.id === input.polymeraseId)!;

  /** Campo numérico que abre el teclado táctil. */
  const num = (label: string, value: number, unit: string, onConfirm: (v: number) => void, opts: Partial<NumPadRequest> = {}) => (
    <button className="hw-key flex min-h-12 flex-col items-start justify-center rounded-md px-3 py-1" onClick={() => setPad({ title: label, value, unit, onConfirm, allowDecimal: true, min: 0, ...opts })}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-lg">{value} {unit}</span>
    </button>
  );

  /** Entrada de secuencia de cebador con Tm y %GC en vivo. */
  const primer = (label: string, key: "fwdSeq" | "revSeq", tmKey: "fwdTm" | "revTm") => {
    const seq = input[key];
    const tm = calcTm(seq, { mgMM: input.mgMM + input.additives.extraMg });
    return (
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">{label} (5′→3′)</label>
        <textarea
          value={seq}
          onChange={(e) => set({ [key]: e.target.value.toUpperCase() } as Partial<CalcInput>)}
          rows={2}
          className="w-full resize-none rounded-md border bg-input/40 p-2 font-mono text-sm tracking-wider"
          placeholder="Secuencia (opcional)"
        />
        {Number.isFinite(tm) ? (
          <p className="font-mono text-sm text-lcd-foreground">{cleanSeq(seq).length} nt · Tm {round1(tm)} °C · GC {round1(gcContent(seq))} %</p>
        ) : (
          <div className="flex items-center gap-2">
            {num(`Tm manual ${label.toLowerCase()}`, input[tmKey], "°C", (v) => set({ [tmKey]: v } as Partial<CalcInput>), { min: 30, max: 85 })}
            <span className="text-xs text-muted-foreground">Sin secuencia válida: se usa la Tm manual.</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ScreenHeader title="Calculadora de protocolos" subtitle="Introduce reactivos y condiciones; el programa se calcula al momento" />
      <div className="grid flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ------------------- Entradas ------------------- */}
        <section className="space-y-5 rounded-xl border bg-panel p-4">
          <Section title="Tipo de reacción">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REACTION_TYPES.map((r) => <Choice key={r.id} active={input.reaction === r.id} onClick={() => set({ reaction: r.id })}>{r.name}</Choice>)}
            </div>
            <p className="text-sm text-muted-foreground">{REACTION_TYPES.find((r) => r.id === input.reaction)?.desc}</p>
          </Section>
          <Section title="Polimerasa">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POLYMERASES.map((p) => <Choice key={p.id} active={input.polymeraseId === p.id} onClick={() => set({ polymeraseId: p.id })}>{p.name}</Choice>)}
            </div>
            <p className="text-sm text-muted-foreground">{pol.note}</p>
          </Section>
          <Section title="Cebadores">
            {primer("Directo", "fwdSeq", "fwdTm")}
            {primer("Reverso", "revSeq", "revTm")}
          </Section>
          <Section title="Molde y amplicón">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TEMPLATES.map((t) => <Choice key={t.id} active={input.template === t.id} onClick={() => set({ template: t.id })}>{t.name}</Choice>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {num("Amplicón", input.ampliconBp, "pb", (v) => set({ ampliconBp: Math.round(v) }), { min: 50, max: 40000, allowDecimal: false })}
              <Choice active={input.highGC} onClick={() => set({ highGC: !input.highGC })}>Alto GC (&gt; 65 %)</Choice>
            </div>
          </Section>
          <Section title="Tampón y aditivos">
            <div className="flex flex-wrap gap-2">
              {num("MgCl₂ del tampón", input.mgMM, "mM", (v) => set({ mgMM: v }), { max: 10 })}
              {num("MgCl₂ extra", input.additives.extraMg, "mM", (v) => setAdd({ extraMg: v }), { max: 5 })}
              {num("DMSO", input.additives.dmso, "%", (v) => setAdd({ dmso: v }), { max: 10 })}
              {num("Betaína", input.additives.betaine, "M", (v) => setAdd({ betaine: v }), { max: 2.5 })}
              {num("Formamida", input.additives.formamide, "%", (v) => setAdd({ formamide: v }), { max: 10 })}
            </div>
          </Section>
        </section>

        {/* ------------------- Resultado ------------------- */}
        <section className="space-y-4">
          <div className="lcd space-y-3 rounded-xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="lcd-glow text-lg">PROGRAMA CALCULADO</p>
              <p className="text-sm text-lcd-dim">Ta {result.ta} °C · {result.cycles} ciclos · ext {formatTime(result.extTime)}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="text-lcd-dim"><tr><th className="py-1 text-left">Etapa</th><th className="text-left">Paso</th><th className="text-right">°C</th><th className="text-right">Tiempo</th></tr></thead>
              <tbody>
                {result.program.stages.flatMap((st, si) => st.steps.map((s, pi) => (
                  <tr key={s.id} className="border-t border-lcd-dim/30">
                    <td className="py-1.5">{pi === 0 ? `${si + 1}${st.repeats > 1 ? ` · ${st.repeats}×` : ""}` : ""}</td>
                    <td>{s.label}{s.deltaPerCycle ? ` (${s.deltaPerCycle} °C/ciclo)` : ""}</td>
                    <td className="text-right">{s.temp}</td>
                    <td className="text-right">{formatTime(s.time)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
            <button
              className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-run text-lg font-semibold text-run-foreground"
              onClick={() => {
                const p = cloneProgram(result.program);
                saveProgram(p);
                setActive(p.id);
                navigate({ to: "/termociclador" });
              }}
            >
              <Send className="size-5" /> Enviar al termociclador
            </button>
          </div>

          {result.warnings.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber/50 bg-amber/10 p-4">
              {result.warnings.map((w) => <p key={w} className="flex gap-2 text-sm"><AlertTriangle className="size-4 shrink-0 text-amber" />{w}</p>)}
            </div>
          )}

          <div className="space-y-2 rounded-xl border bg-panel p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por qué estos valores</h2>
            {result.explanations.map((e) => <p key={e} className="flex gap-2 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{e}</p>)}
          </div>

          <div className="space-y-3 rounded-xl border bg-panel p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Master mix</h2>
            <div className="flex gap-2">
              {num("Volumen por reacción", volume, "µL", (v) => setVolume(v), { min: 10, max: 100 })}
              {num("Nº de muestras", samples, "", (v) => setSamples(Math.round(v)), { min: 1, max: 384, allowDecimal: false })}
            </div>
            <table className="w-full font-mono text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-sans">Reactivo</th><th className="text-right">1×</th><th className="text-right">{round1(mix.factor)}×</th></tr></thead>
              <tbody>
                {mix.rows.map((r) => (
                  <tr key={r.name} className="border-t"><td className="py-1.5 font-sans">{r.name}</td><td className="text-right">{round1(r.per)}</td><td className="text-right">{round1(r.total)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">Volúmenes en µL, incluye 10 % extra. {mix.template ? `Añade ${mix.template} µL de molde por tubo (dentro del agua).` : "Toca la colonia con la punta y resuspende en cada tubo."}</p>
          </div>
        </section>
      </div>
      <NumPad req={pad} onClose={() => setPad(null)} />
    </div>
  );
}
