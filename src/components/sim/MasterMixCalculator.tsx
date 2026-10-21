import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumPad, type NumPadRequest } from "./NumPad";
import { OptionPopup } from "./OptionPopup";
import { DEFAULT_INPUT, masterMix, type CalcInput } from "@/lib/pcr/protocol";
import { POLYMERASES } from "@/lib/pcr/reagents";
import { round1 } from "@/lib/pcr/tm";
import type { MasterMixSettings } from "@/lib/pcr/practice";
import { cn } from "@/lib/utils";

/** Redondeo y formato a 2 decimales para volúmenes de pipeteo (p. ej. 0,25 µL). */
const round2 = (v: number) => Math.round(v * 100) / 100;
const fmt2 = (v: number) => round2(v).toFixed(2);

/** Botón de opción seleccionable de tamaño táctil. */
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline"
      onClick={onClick}
      className={cn("hw-key min-h-12 rounded-md px-3 py-2 text-left text-sm", active && "bg-none bg-amber text-amber-foreground")}
    >
      {children}
    </Button>
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

/**
 * Calculadora independiente de master mix: no depende del protocolo.
 * Solo pide polimerasa, volumen, número de muestras y aditivos, y muestra
 * la tabla de volúmenes por reactivo con el 10 % extra habitual.
 */
export function MasterMixCalculator({ onChange, practice = false }: {
  onChange?: ((value: MasterMixSettings) => void) | undefined;
  /** Modo alumno: oculta los volúmenes calculados y pide escribirlos a mano. */
  practice?: boolean | undefined;
}) {
  const [polymeraseId, setPolymeraseIdRaw] = useState(DEFAULT_INPUT.polymeraseId);
  const [volume, setVolume] = useState(50);
  const [samples, setSamples] = useState(8);
  const [dmso, setDmso] = useState(0);
  const [colony, setColony] = useState(false);
  const [templateUL, setTemplateUL] = useState(1);
  const initPol = (POLYMERASES.find((p) => p.id === DEFAULT_INPUT.polymeraseId) ?? POLYMERASES[0]);
  const [enzymeStockU, setEnzymeStockU] = useState(initPol?.stockU ?? 5);
  const [bufferX, setBufferX] = useState(initPol?.bufferX ?? 10);
  const [enzymeUnits, setEnzymeUnits] = useState(initPol?.unitsPer50 ?? 1.25);
  const [primerStockUM, setPrimerStockUM] = useState(10);
  const [primerFinalUM, setPrimerFinalUM] = useState(0.5);
  // dNTPs (mM de cada nucleótido) y MgCl2 (mM).
  const [dntpStockMM, setDntpStockMM] = useState(10);
  const [dntpFinalMM, setDntpFinalMM] = useState(0.2);
  const [bufferMg, setBufferMg] = useState(DEFAULT_INPUT.mgMM);
  const [mgStockMM, setMgStockMM] = useState(25);
  const [extraMg, setExtraMg] = useState(0);
  const [pipetteExtra, setPipetteExtra] = useState(false);
  const [answers, setAnswers] = useState<NonNullable<MasterMixSettings["answers"]>>({});
  const [pad, setPad] = useState<NumPadRequest | null>(null);
  /** Ventana emergente para las polimerasas menos habituales. */
  const [popupOpen, setPopupOpen] = useState(false);

  // Al cambiar de polimerasa se cargan su stock y unidades recomendadas.
  const setPolymeraseId = (id: string) => {
    const p = POLYMERASES.find((x) => x.id === id);
    if (!p) return;
    setPolymeraseIdRaw(id);
    setEnzymeStockU(p.stockU);
    setBufferX(p.bufferX);
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
  const opts = { templateUL, enzymeStockU, enzymeUnits, primerStockUM, primerFinalUM, dntpStockMM, dntpFinalMM, mgStockMM, bufferX, pipetteExtra };
  const mix = useMemo(() => masterMix(input, volume, samples, opts), [input, volume, samples, ...Object.values(opts)]);
  const pol = POLYMERASES.find((p) => p.id === polymeraseId) ?? initPol;

  useEffect(() => {
    onChange?.({ input, volume, samples, options: { templateUL, enzymeStockU, enzymeUnits, primerStockUM, primerFinalUM, dntpStockMM, dntpFinalMM, mgStockMM, bufferX, pipetteExtra }, ...(practice ? { answers } : {}) });
  }, [onChange, input, volume, samples, templateUL, enzymeStockU, enzymeUnits, primerStockUM, primerFinalUM, dntpStockMM, dntpFinalMM, mgStockMM, bufferX, pipetteExtra, practice, answers]);

  if (!pol) return null;

  const num = (label: string, value: number, unit: string, onConfirm: (v: number) => void, opts: Partial<NumPadRequest> = {}) => (
    <Button variant="outline"
      className="hw-key flex min-h-14 flex-1 flex-col items-start justify-center rounded-md px-4 py-1"
      onClick={() => setPad({ title: label, value, unit, onConfirm, allowDecimal: true, min: 0, ...opts })}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xl">{value} {unit}</span>
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col gap-5 p-4">
      {/* Franja superior: selección de enzima y parámetros de la reacción. */}
      <section aria-label="Parámetros principales" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Section title="Polimerasa">
          <div className="grid gap-2 sm:grid-cols-3">
            {/* Polimerasas habituales directamente; las demás en "Más polimerasas…". */}
            {POLYMERASES.filter((p) => p.id === "taq" || p.id === "hs-taq").map((p) => (
              <Button variant="outline"
                key={p.id}
                onClick={() => setPolymeraseId(p.id)}
                className={cn(
                  "hw-key min-h-14 w-full flex-col items-start justify-center whitespace-normal rounded-md px-3 py-2 text-left",
                  polymeraseId === p.id && "bg-none bg-amber text-amber-foreground",
                )}
              >
                <span className="block text-sm font-medium">{p.name}</span>
                <span className={cn("block text-xs text-muted-foreground", polymeraseId === p.id && "text-amber-foreground/70")}>
                  Tampón {p.bufferX}x · {p.unitsPer50} U por 50 µL
                </span>
              </Button>
            ))}
            <Button variant="outline"
              onClick={() => setPopupOpen(true)}
              className={cn(
                "hw-key flex min-h-14 w-full items-center justify-between gap-2 whitespace-normal rounded-md px-3 text-left",
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
            </Button>
          </div>
        </Section>
        <Section title="Reacción">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {num("Volumen por reacción", volume, "µL", (v) => setVolume(v), { min: 5, max: 100 })}
            {num("Nº de muestras", samples, "", (v) => setSamples(Math.round(v)), { min: 1, max: 384, allowDecimal: false })}
            {num("DMSO", dmso, "%", (v) => setDmso(v), { max: 10 })}
            {!colony && num("Molde por reacción", templateUL, "µL", (v) => setTemplateUL(v), { min: 0, max: 20 })}
          </div>
          <Choice active={colony} onClick={() => setColony((c) => !c)}>
            PCR de colonia (sin molde medido)
          </Choice>
        </Section>
      </section>

      <div className="grid min-w-0 gap-5 border-t pt-5 lg:grid-cols-2">
      {/* Concentraciones a la izquierda; resultados a la derecha. */}
      <section aria-label="Concentraciones y stocks" className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
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
        <div className="sm:col-span-2"><Section title="Tampón y cloruro de magnesio (MgCl₂)">
          <div className="flex flex-wrap gap-2">
            {num("Stock del tampón", bufferX, "×", (v) => setBufferX(v), { min: 1, max: 100 })}
            {num("Mg²⁺ del tampón", bufferMg, "mM", (v) => setBufferMg(v), { max: 10 })}
            {num("MgCl₂ extra a añadir", extraMg, "mM", (v) => setExtraMg(v), { max: 5 })}
            {num("Stock de MgCl₂", mgStockMM, "mM", (v) => setMgStockMM(v), { min: 1, max: 1000 })}
          </div>
          <p className="text-xs text-muted-foreground">Mg²⁺ final: {round2(bufferMg + extraMg)} mM (óptimo habitual 1,5–2,5 mM).</p>
        </Section></div>
      </section>

      {/* Tabla de volúmenes */}
      <section aria-label="Resultados del master mix" className="min-w-0 space-y-3 self-start border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Master mix · {pol.name}</h2>
          <p className="text-sm text-muted-foreground">{samples} muestras{pipetteExtra ? ` + 10 % extra = ${round1(mix.factor)}×` : ""}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" role="switch" className="size-4 accent-amber" checked={pipetteExtra} onChange={(e) => setPipetteExtra(e.target.checked)} />
          +10 % por errores de pipeteo
        </label>
        {practice && <p className="text-xs text-muted-foreground">Toca cada casilla y escribe el volumen que has calculado.</p>}
        <table className="w-full font-mono text-sm">
          <thead className="text-muted-foreground">
            <tr><th className="py-1 text-left font-sans">Reactivo</th><th className="text-right">1× (µL)</th><th className="text-right">Total (µL)</th></tr>
          </thead>
          <tbody>
            {mix.rows.map((r) => (
              <tr key={r.name} className="border-t">
                <td className="py-1.5 font-sans">{r.name}</td>
                {practice
                  ? (["per", "total"] as const).map((k) => {
                      const v = answers[r.key]?.[k];
                      return (
                        <td key={k} className="py-1 pl-2 text-right">
                          <Button variant="outline" className="hw-key h-10 w-full justify-end rounded-md px-2 font-mono"
                            onClick={() => setPad({ title: `${r.name} · ${k === "per" ? "1×" : "total"}`, value: v ?? 0, unit: "µL", allowDecimal: true, min: 0, max: 100000,
                              onConfirm: (n) => setAnswers((a) => ({ ...a, [r.key]: { ...a[r.key], [k]: n } })) })}>
                            {v === undefined ? "—" : v}
                          </Button>
                        </td>
                      );
                    })
                  : <>
                      <td className="text-right">{fmt2(r.per)}</td>
                      <td className="text-right">{fmt2(r.total)}</td>
                    </>}
              </tr>
            ))}
          </tbody>
        </table>
        {!practice && mix.overflow && (
          <p className="text-sm text-destructive">Los reactivos superan el volumen de reacción: reduce el molde o aumenta el volumen.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Volúmenes en µL{pipetteExtra ? " con 10 % extra para compensar pérdidas al pipetear" : ""}. dNTPs: stock {dntpStockMM} mM de cada
          nucleótido ({round2(dntpStockMM * 4)} mM total) → {dntpFinalMM} mM finales de cada uno. Mg²⁺ final{" "}
          {round2(bufferMg + extraMg)} mM.{" "}
          {mix.template
            ? `Añade ${fmt2(mix.template)} µL de molde por tubo (descontado del agua).`
            : "Toca la colonia con la punta y resuspende en cada tubo."}
        </p>
      </section>
      </div>
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
                  <Button variant="outline"
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
                  </Button>
                ))}
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}
