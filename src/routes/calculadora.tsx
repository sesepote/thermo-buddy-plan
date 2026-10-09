import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Send, Info, ChevronRight, ChevronDown, Timer } from "lucide-react";
import { ScreenHeader } from "@/components/sim/ScreenHeader";
import { StatusBars } from "@/components/sim/StatusBars";
import { NumPad, type NumPadRequest } from "@/components/sim/NumPad";
import { OptionPopup } from "@/components/sim/OptionPopup";
import { useApp } from "@/lib/store";
import { DEFAULT_INPUT, generateProtocol, masterMix, type CalcInput } from "@/lib/pcr/protocol";
import { POLYMERASES, REACTION_TYPES, TEMPLATES } from "@/lib/pcr/reagents";
import { calcTm, gcContent, cleanSeq, round1 } from "@/lib/pcr/tm";
import { buildSegments, totalDuration } from "@/lib/pcr/simulation";
import { cloneProgram, formatTime } from "@/lib/pcr/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de protocolos PCR — Simulador" },
      { name: "description", content: "Genera protocolos PCR completos según polimerasa, cebadores, amplicón, molde y aditivos." },
      { property: "og:title", content: "Calculadora de protocolos PCR" },
      { property: "og:description", content: "Temperaturas, tiempos, ciclos y master mix calculados automáticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Calculator,
});

/** Redondeo y formato a 2 decimales para volúmenes de pipeteo (p. ej. 0,25 µL). */
const round2 = (v: number) => Math.round(v * 100) / 100;
const fmt2 = (v: number) => round2(v).toFixed(2);

/** Botón de opción seleccionable de tamaño táctil. */
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("hw-key min-h-12 rounded-md px-3 py-2 text-left text-sm", active && "bg-none bg-amber text-amber-foreground")}
    >
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

/** Fila compacta de configuración: muestra el valor actual y abre una ventana emergente. */
function Field({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hw-key flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="block truncate text-base">{value}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * Calculadora independiente de master mix: no depende del protocolo.
 * Solo pide polimerasa, volumen, número de muestras y aditivos, y muestra
 * la tabla de volúmenes por reactivo con el 10 % extra habitual.
 */
function MasterMixTab() {
  const [polymeraseId, setPolymeraseIdRaw] = useState(DEFAULT_INPUT.polymeraseId);
  const [volume, setVolume] = useState(50);
  const [samples, setSamples] = useState(8);
  const [dmso, setDmso] = useState(0);
  const [colony, setColony] = useState(false);
  const [templateUL, setTemplateUL] = useState(1);
  const initPol = POLYMERASES.find((p) => p.id === DEFAULT_INPUT.polymeraseId)!;
  const [enzymeStockU, setEnzymeStockU] = useState(initPol.stockU);
  const [enzymeUnits, setEnzymeUnits] = useState(initPol.unitsPer50);
  const [primerStockUM, setPrimerStockUM] = useState(10);
  const [primerFinalUM, setPrimerFinalUM] = useState(0.5);
  // dNTPs (mM de cada nucleótido) y MgCl2 (mM).
  const [dntpStockMM, setDntpStockMM] = useState(10);
  const [dntpFinalMM, setDntpFinalMM] = useState(0.2);
  const [bufferMg, setBufferMg] = useState(DEFAULT_INPUT.mgMM);
  const [mgStockMM, setMgStockMM] = useState(25);
  const [extraMg, setExtraMg] = useState(0);
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  /** Ventana emergente para las polimerasas menos habituales. */
  const [popupOpen, setPopupOpen] = useState(false);

  // Al cambiar de polimerasa se cargan su stock y unidades recomendadas.
  const setPolymeraseId = (id: string) => {
    const p = POLYMERASES.find((x) => x.id === id)!;
    setPolymeraseIdRaw(id);
    setEnzymeStockU(p.stockU);
    setEnzymeUnits(round2(p.unitsPer50 * (volume / 50)));
  };

  const input: CalcInput = useMemo(
    () => ({
      ...DEFAULT_INPUT,
      polymeraseId,
      mgMM: bufferMg,
      template: colony ? "colony" : DEFAULT_INPUT.template,
      additives: { ...DEFAULT_INPUT.additives, dmso, extraMg },
    }),
    [polymeraseId, dmso, colony, bufferMg, extraMg],
  );
  const opts = { templateUL, enzymeStockU, enzymeUnits, primerStockUM, primerFinalUM, dntpStockMM, dntpFinalMM, mgStockMM };
  const mix = useMemo(() => masterMix(input, volume, samples, opts), [input, volume, samples, ...Object.values(opts)]);
  const pol = POLYMERASES.find((p) => p.id === polymeraseId)!;

  const num = (label: string, value: number, unit: string, onConfirm: (v: number) => void, opts: Partial<NumPadRequest> = {}) => (
    <button
      className="hw-key flex min-h-14 flex-1 flex-col items-start justify-center rounded-md px-4 py-1"
      onClick={() => setPad({ title: label, value, unit, onConfirm, allowDecimal: true, min: 0, ...opts })}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xl">{value} {unit}</span>
    </button>
  );

  return (
    <div className="grid flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Entradas de la mezcla */}
      <section className="space-y-3 self-start rounded-xl border bg-panel p-4">
        <Section title="Polimerasa">
          <div className="space-y-2">
            {/* Polimerasas habituales directamente; las demás en "Más polimerasas…". */}
            {POLYMERASES.filter((p) => p.id === "taq" || p.id === "hs-taq").map((p) => (
              <button
                key={p.id}
                onClick={() => setPolymeraseId(p.id)}
                className={cn(
                  "hw-key min-h-14 w-full rounded-md px-3 py-2 text-left",
                  polymeraseId === p.id && "bg-none bg-amber text-amber-foreground",
                )}
              >
                <span className="block text-sm font-medium">{p.name}</span>
                <span className={cn("block text-xs text-muted-foreground", polymeraseId === p.id && "text-amber-foreground/70")}>
                  Tampón {p.bufferX}x · {p.unitsPer50} U por 50 µL
                </span>
              </button>
            ))}
            <button
              onClick={() => setPopupOpen(true)}
              className={cn(
                "hw-key flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-3 text-left",
                !["taq", "hs-taq"].includes(polymeraseId) && "bg-none bg-amber text-amber-foreground",
              )}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">Más polimerasas…</span>
                <span className={cn("block truncate text-xs text-muted-foreground", !["taq", "hs-taq"].includes(polymeraseId) && "text-amber-foreground/70")}>
                  {pol.name}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </Section>
        <Section title="Reacción">
          <div className="flex flex-wrap gap-2">
            {num("Volumen por reacción", volume, "µL", (v) => setVolume(v), { min: 5, max: 100 })}
            {num("Nº de muestras", samples, "", (v) => setSamples(Math.round(v)), { min: 1, max: 384, allowDecimal: false })}
            {num("DMSO", dmso, "%", (v) => setDmso(v), { max: 10 })}
            {!colony && num("Molde por reacción", templateUL, "µL", (v) => setTemplateUL(v), { min: 0, max: 20 })}
          </div>
          <Choice active={colony} onClick={() => setColony((c) => !c)}>
            PCR de colonia (sin molde medido)
          </Choice>
        </Section>
        <Section title="Polimerasa: stock y unidades">
          <div className="flex flex-wrap gap-2">
            {num("Stock de enzima", enzymeStockU, "U/µL", (v) => setEnzymeStockU(v), { min: 0.1, max: 100 })}
            {num("Unidades por reacción", enzymeUnits, "U", (v) => setEnzymeUnits(v), { min: 0.1, max: 20 })}
          </div>
        </Section>
        <Section title="Cebadores">
          <div className="flex flex-wrap gap-2">
            {num("Stock de cada cebador", primerStockUM, "µM", (v) => setPrimerStockUM(v), { min: 1, max: 1000 })}
            {num("Concentración final", primerFinalUM, "µM", (v) => setPrimerFinalUM(v), { min: 0.05, max: 5 })}
          </div>
        </Section>
        <Section title="dNTPs (cada nucleótido)">
          <div className="flex flex-wrap gap-2">
            {num("Stock de cada dNTP", dntpStockMM, "mM", (v) => setDntpStockMM(v), { min: 0.5, max: 100 })}
            {num("Concentración final", dntpFinalMM, "mM", (v) => setDntpFinalMM(v), { min: 0.01, max: 2 })}
          </div>
        </Section>
        <Section title="Cloruro de magnesio (MgCl₂)">
          <div className="flex flex-wrap gap-2">
            {num("Mg²⁺ del tampón", bufferMg, "mM", (v) => setBufferMg(v), { max: 10 })}
            {num("MgCl₂ extra a añadir", extraMg, "mM", (v) => setExtraMg(v), { max: 5 })}
            {num("Stock de MgCl₂", mgStockMM, "mM", (v) => setMgStockMM(v), { min: 1, max: 1000 })}
          </div>
          <p className="text-xs text-muted-foreground">Mg²⁺ final: {round2(bufferMg + extraMg)} mM (óptimo habitual 1,5–2,5 mM).</p>
        </Section>
      </section>

      {/* Tabla de volúmenes */}
      <section className="space-y-3 self-start rounded-xl border bg-panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Master mix · {pol.name}</h2>
          <p className="text-sm text-muted-foreground">{samples} muestras + 10 % extra = {round1(mix.factor)}×</p>
        </div>
        <table className="w-full font-mono text-sm">
          <thead className="text-muted-foreground">
            <tr><th className="py-1 text-left font-sans">Reactivo</th><th className="text-right">1× (µL)</th><th className="text-right">Total (µL)</th></tr>
          </thead>
          <tbody>
            {mix.rows.map((r) => (
              <tr key={r.name} className="border-t">
                <td className="py-1.5 font-sans">{r.name}</td>
                <td className="text-right">{fmt2(r.per)}</td>
                <td className="text-right">{fmt2(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {mix.overflow && (
          <p className="text-sm text-destructive">Los reactivos superan el volumen de reacción: reduce el molde o aumenta el volumen.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Volúmenes en µL con 10 % extra para compensar pérdidas al pipetear. dNTPs: stock {dntpStockMM} mM de cada
          nucleótido ({round2(dntpStockMM * 4)} mM total) → {dntpFinalMM} mM finales de cada uno. Mg²⁺ final{" "}
          {round2(bufferMg + extraMg)} mM.{" "}
          {mix.template
            ? `Añade ${fmt2(mix.template)} µL de molde por tubo (descontado del agua).`
            : "Toca la colonia con la punta y resuspende en cada tubo."}
        </p>
      </section>
      <NumPad req={pad} onClose={() => setPad(null)} />
      {popupOpen && (
        /* El cuerpo se construye en cada render para que la selección resaltada esté al día. */
        <OptionPopup
          onClose={() => setPopupOpen(false)}
          content={{
            title: "Más polimerasas",
            subtitle: "Enzimas especiales o de uso menos frecuente.",
            body: (
              <div className="space-y-2">
                {POLYMERASES.filter((p) => p.id !== "taq" && p.id !== "hs-taq").map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPolymeraseId(p.id);
                      setPopupOpen(false);
                    }}
                    className={cn(
                      "hw-key min-h-14 w-full rounded-md px-3 py-2 text-left",
                      polymeraseId === p.id && "bg-none bg-amber text-amber-foreground",
                    )}
                  >
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className={cn("block text-xs text-muted-foreground", polymeraseId === p.id && "text-amber-foreground/70")}>
                      Tampón {p.bufferX}x · {p.unitsPer50} U por 50 µL
                    </span>
                  </button>
                ))}
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}

function Calculator() {
  /** Pestaña activa: protocolo completo o calculadora de master mix. */
  const [tab, setTab] = useState<"protocolo" | "mastermix">("protocolo");
  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  /** Ventana emergente abierta: qué bloque se está configurando. */
  const [popup, setPopup] = useState<null | "reaction" | "polymerase" | "template" | "additives">(null);
  const [volume, setVolume] = useState(50);
  const [samples, setSamples] = useState(8);
  const [showWhy, setShowWhy] = useState(false);
  const { saveProgram, setActive } = useApp();
  const navigate = useNavigate();

  const set = (patch: Partial<CalcInput>) => setInput((i) => ({ ...i, ...patch }));
  const setAdd = (patch: Partial<CalcInput["additives"]>) => setInput((i) => ({ ...i, additives: { ...i.additives, ...patch } }));

  // El protocolo se recalcula en vivo con cada cambio de entrada.
  const result = useMemo(() => generateProtocol(input), [input]);
  // Tiempo total estimado del programa: rampas + mesetas de cada ciclo
  // (mismo motor de simulación que el termociclador). El hold a 4 °C no cuenta.
  const totalTime = useMemo(() => totalDuration(buildSegments(result.program)), [result]);
  const mix = useMemo(() => masterMix(input, volume, samples), [input, volume, samples]);
  const pol = POLYMERASES.find((p) => p.id === input.polymeraseId)!;
  const reaction = REACTION_TYPES.find((r) => r.id === input.reaction)!;
  const template = TEMPLATES.find((t) => t.id === input.template)!;

  /** Campo numérico que abre el teclado táctil. */
  const num = (label: string, value: number, unit: string, onConfirm: (v: number) => void, opts: Partial<NumPadRequest> = {}) => (
    <button
      className="hw-key flex min-h-12 flex-col items-start justify-center rounded-md px-3 py-1"
      onClick={() => setPad({ title: label, value, unit, onConfirm, allowDecimal: true, min: 0, ...opts })}
    >
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

  /** Resumen compacto de los aditivos para la fila de configuración. */
  const additiveSummary = [
    `MgCl₂ ${round2(input.mgMM + input.additives.extraMg)} mM (tampón ${input.mgMM} + extra ${input.additives.extraMg})`,
    `DMSO ${input.additives.dmso} %`,
    `Betaína ${input.additives.betaine} M`,
    `Formamida ${input.additives.formamide} %`,
  ].join(" · ");

  return (
    <StatusBars section="CALCULADORA">
      <ScreenHeader title="Calculadora de protocolos" subtitle="Toca cada bloque para configurarlo; el programa se calcula al momento" />
      {/* Pestañas táctiles: protocolo completo o solo master mix. */}
      <div className="flex gap-2 px-4 pt-3">
        {([["protocolo", "Protocolo PCR"], ["mastermix", "Master mix"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "hw-key min-h-12 flex-1 rounded-md px-4 text-base font-medium",
              tab === id && "bg-none bg-amber text-amber-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "mastermix" ? (
        <MasterMixTab />
      ) : (
      <div className="grid flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ------------------- Entradas ------------------- */}
        <section className="space-y-3 self-start rounded-xl border bg-panel p-4">
          {/* Cada bloque es una fila que abre su ventana emergente. */}
          <Field
            label="Tipo de reacción"
            value={reaction.name}
            onClick={() => setPopup("reaction")}
          />
          <Field
            label="Polimerasa"
            value={pol.name}
            onClick={() => setPopup("polymerase")}
          />

          {/* Cebadores: siguen a la vista porque se escriben a mano. */}
          <Section title="Cebadores">
            <div className="grid gap-3 sm:grid-cols-2">
              {primer("Directo", "fwdSeq", "fwdTm")}
              {primer("Reverso", "revSeq", "revTm")}
            </div>
          </Section>

          <Field
            label="Molde y amplicón"
            value={`${template.name} · ${input.ampliconBp} pb${input.highGC ? " · alto GC" : ""}`}
            onClick={() =>
              setPopup({
                title: "Molde y amplicón",
                body: () => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map((t) => (
                        <Choice key={t.id} active={input.template === t.id} onClick={() => set({ template: t.id })}>
                          {t.name}
                        </Choice>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {num("Amplicón", input.ampliconBp, "pb", (v) => set({ ampliconBp: Math.round(v) }), { min: 50, max: 40000, allowDecimal: false })}
                      <Choice active={input.highGC} onClick={() => set({ highGC: !input.highGC })}>Alto GC (&gt; 65 %)</Choice>
                    </div>
                  </div>
                ),
              })
            }
          />
          <Field
            label="Tampón y aditivos"
            value={additiveSummary}
            onClick={() =>
              setPopup({
                title: "Tampón y aditivos",
                subtitle: `MgCl₂ del tampón ${input.mgMM} mM`,
                body: () => (
                  <div className="flex flex-wrap gap-2">
                    {num("MgCl₂ del tampón", input.mgMM, "mM", (v) => set({ mgMM: v }), { max: 10 })}
                    {num("MgCl₂ extra", input.additives.extraMg, "mM", (v) => setAdd({ extraMg: v }), { max: 5 })}
                    {num("DMSO", input.additives.dmso, "%", (v) => setAdd({ dmso: v }), { max: 10 })}
                    {num("Betaína", input.additives.betaine, "M", (v) => setAdd({ betaine: v }), { max: 2.5 })}
                    {num("Formamida", input.additives.formamide, "%", (v) => setAdd({ formamide: v }), { max: 10 })}
                  </div>
                ),
              })
            }
          />
        </section>

        {/* ------------------- Resultado ------------------- */}
        <section className="space-y-4">
          <div className="lcd space-y-3 rounded-xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="lcd-glow text-lg">PROGRAMA CALCULADO</p>
              <p className="text-sm text-lcd-dim">Ta {result.ta} °C · {result.cycles} ciclos · ext {formatTime(result.extTime)}</p>
            </div>
            {/* Tiempo total estimado, calculado con el mismo motor que la simulación. */}
            <div className="flex items-center gap-2 border-t border-lcd-dim/30 pt-2 text-sm">
              <Timer className="size-4 shrink-0 text-lcd-dim" />
              <span className="font-mono lcd-glow">{formatTime(totalTime)}</span>
              <span className="text-lcd-dim">tiempo total (rampas incluidas a {result.program.rampRate} °C/s; el hold a 4 °C no cuenta)</span>
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

          {/* Explicaciones plegadas por defecto para despejar la pantalla. */}
          <div>
            <button
              className="hw-key flex min-h-12 w-full items-center justify-between rounded-md px-4 text-sm font-medium"
              onClick={() => setShowWhy((s) => !s)}
            >
              Por qué estos valores ({result.explanations.length})
              <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", showWhy && "rotate-180")} />
            </button>
            {showWhy && (
              <div className="mt-2 space-y-2 rounded-xl border bg-panel p-4">
                {result.explanations.map((e) => <p key={e} className="flex gap-2 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{e}</p>)}
              </div>
            )}
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
      )}
      <NumPad req={pad} onClose={() => setPad(null)} />
      {popup && <OptionPopup content={popup} onClose={() => setPopup(null)} />}
    </StatusBars>
  );
}
