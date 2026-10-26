import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type ReactionTier = "perfect" | "odd" | "toxic" | "boom";

/** Tramos de puntuación: 100 brilla, 80–99 no pasa nada, 50–79 calavera, <50 explota. */
export function reactionTier(score: number): ReactionTier {
  if (score >= 100) return "perfect";
  if (score >= 80) return "odd";
  if (score >= 50) return "toxic";
  return "boom";
}

const CAPTION: Record<ReactionTier, string> = {
  perfect: "¡Reacción perfecta!",
  odd: "Mmm… no pasa nada. Algo falla.",
  toxic: "¡Uy! Eso huele a error…",
  boom: "¡BUM! Revisa los cálculos.",
};

/** Animación de ~3 s: el científico agita el tubo y reacciona según la puntuación. */
export function ScientistReaction({ score, onDone }: { score: number; onDone: () => void }) {
  const tier = reactionTier(score);
  const [phase, setPhase] = useState<"shake" | "end">("shake");
  useEffect(() => {
    const a = setTimeout(() => setPhase("end"), 1500);
    const b = setTimeout(onDone, 3200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);
  const end = phase === "end";
  const face = !end ? "focus" : tier === "perfect" ? "happy" : tier === "odd" ? "puzzled" : tier === "toxic" ? "sick" : "shock";

  return <div role="dialog" aria-label="Resultado de la mezcla" onClick={onDone}
    className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
      <svg viewBox="0 0 240 220" className={`sci-svg sci-${end ? tier : "shake"} h-64 w-72`} aria-hidden>
        {/* cuerpo y bata */}
        <path d="M60 215 Q60 150 100 140 L140 140 Q180 150 180 215 Z" className="fill-foreground/90" />
        <path d="M112 140 L120 175 L128 140 Z" className="fill-ice" />
        {/* cabeza */}
        <g className="sci-head">
          <circle cx="120" cy="100" r="34" className="fill-amber/70" />
          <path d={tier === "boom" && end ? "M84 82 L92 60 L100 78 L110 55 L120 76 L132 54 L140 78 L150 60 L156 84" : "M86 88 Q90 62 120 62 Q152 62 154 88 Q140 76 120 78 Q100 76 86 88 Z"} className="fill-muted-foreground" />
          {/* gafas */}
          <g className={tier === "boom" && end ? "sci-glasses-off" : ""}>
            <circle cx="106" cy="98" r="10" className="fill-ice/40 stroke-foreground" strokeWidth="3" />
            <circle cx="134" cy="98" r="10" className="fill-ice/40 stroke-foreground" strokeWidth="3" />
            <path d="M116 98 L124 98" className="stroke-foreground" strokeWidth="3" />
          </g>
          {face === "happy" && <path d="M106 114 Q120 128 134 114" className="stroke-foreground" strokeWidth="3" fill="none" strokeLinecap="round" />}
          {face === "focus" && <path d="M110 118 L130 118" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />}
          {face === "puzzled" && <><path d="M108 119 Q116 114 124 119 Q130 122 134 117" className="stroke-foreground" strokeWidth="3" fill="none" strokeLinecap="round" /><text x="160" y="72" className="sci-q fill-amber font-display" fontSize="30">?</text></>}
          {face === "sick" && <path d="M106 122 Q120 112 134 122" className="stroke-foreground" strokeWidth="3" fill="none" strokeLinecap="round" />}
          {face === "shock" && <ellipse cx="120" cy="120" rx="6" ry="8" className="fill-foreground" />}
          {tier === "boom" && end && <><circle cx="100" cy="88" r="6" className="fill-foreground/40" /><circle cx="140" cy="112" r="7" className="fill-foreground/40" /></>}
        </g>
        {/* brazo + tubo */}
        <g className="sci-arm">
          <path d="M160 160 Q190 150 196 120" className="stroke-foreground/90" strokeWidth="14" fill="none" strokeLinecap="round" />
          <g className="sci-tube">
            <path d="M186 70 L206 70 L204 118 Q196 130 188 118 Z" className="fill-ice/25 stroke-ice" strokeWidth="2.5" />
            <path d="M188 92 L204 92 L203 118 Q196 128 189 118 Z" className={tier === "perfect" && end ? "fill-run" : tier === "toxic" && end ? "fill-run/60" : "fill-amber"} />
            <rect x="183" y="64" width="26" height="8" rx="2" className="fill-ice" />
          </g>
          <circle cx="196" cy="120" r="9" className="fill-amber/70" />
        </g>
        {/* efectos */}
        {end && tier === "perfect" && <g className="sci-sparkles">
          {[[170, 50], [222, 60], [180, 30], [215, 100], [160, 85]].map(([x, y], i) =>
            <path key={i} d={`M${x} ${y - 8} L${x + 2} ${y - 2} L${x + 8} ${y} L${x + 2} ${y + 2} L${x} ${y + 8} L${x - 2} ${y + 2} L${x - 8} ${y} L${x - 2} ${y - 2} Z`} className="fill-amber" style={{ animationDelay: `${i * 0.12}s` }} />)}
        </g>}
        {end && tier === "toxic" && <g className="sci-skull">
          <path d="M196 64 Q186 50 198 40 Q210 30 200 18" className="stroke-run/60" strokeWidth="4" fill="none" />
          <g transform="translate(196 6)">
            <path d="M-16 0 Q-16 -18 0 -18 Q16 -18 16 0 Q16 8 8 10 L8 16 L-8 16 L-8 10 Q-16 8 -16 0 Z" className="fill-run/70" />
            <circle cx="-6" cy="-2" r="4" className="fill-card" /><circle cx="6" cy="-2" r="4" className="fill-card" />
            <path d="M-4 12 L-4 16 M0 12 L0 16 M4 12 L4 16" className="stroke-card" strokeWidth="1.5" />
          </g>
        </g>}
        {end && tier === "boom" && <g className="sci-fx-boom">
          <path d="M196 95 L210 60 L216 88 L238 70 L224 98 L240 112 L216 112 L222 140 L200 118 L180 140 L184 112 L156 110 L180 96 L166 66 Z" className="fill-destructive" />
          <path d="M196 100 L204 80 L208 96 L222 88 L212 104 L222 112 L206 112 L208 126 L196 114 L186 124 L188 110 L174 106 L188 100 L182 84 Z" className="fill-amber" />
        </g>}
      </svg>
      <p className="font-display text-xl">{end ? CAPTION[tier] : "Agitando la mezcla…"}</p>
      <Button variant="outline" className="h-11" onClick={onDone}>Ver resultados</Button>
    </div>
  </div>;
}
