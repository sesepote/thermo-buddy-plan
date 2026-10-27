import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import concentrada from "@/assets/cientifica/concentrada.webp";
import feliz from "@/assets/cientifica/feliz.webp";
import extranada from "@/assets/cientifica/extranada.webp";
import asqueada from "@/assets/cientifica/asqueada.webp";
import tiznada from "@/assets/cientifica/tiznada.webp";
import felizVideo from "@/assets/cientifica/feliz.webm.asset.json";
import extranadaVideo from "@/assets/cientifica/extranada.webm.asset.json";
import asqueadaVideo from "@/assets/cientifica/asqueada.webm.asset.json";
import tiznadaVideo from "@/assets/cientifica/tiznada.webm.asset.json";

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
const VIDEO: Record<ReactionTier, string> = { perfect: felizVideo.url, odd: extranadaVideo.url, toxic: asqueadaVideo.url, boom: tiznadaVideo.url };
const FACE: Record<ReactionTier, string> = { perfect: feliz, odd: extranada, toxic: asqueada, boom: tiznada };

/** La científica agita el tubo ~1,6 s y reacciona; queda abierto hasta pulsar cerrar. */
export function ScientistReaction({ score, onClose }: { score: number; onClose: () => void }) {
  const tier = reactionTier(score);
  const [end, setEnd] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEnd(true), 1600); return () => clearTimeout(t); }, []);

  return <div role="dialog" aria-modal aria-label="Resultado de la mezcla" className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
    <div className="relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 pt-16 shadow-xl">
      <Button variant="outline" size="icon" aria-label="Cerrar" className="absolute right-3 top-3 z-10 size-12" onClick={onClose}><X /></Button>
      {VIDEO[tier] ? <video src={VIDEO[tier]} autoPlay muted playsInline onEnded={() => setEnd(true)} aria-label={CAPTION[tier]} className="h-80 w-auto sm:h-96" /> :
      <div className={`sci-stage sci-${end ? tier : "shake"} relative size-72 sm:size-80`}>
        {/* Las imágenes se apilan para que el cambio de expresión no parpadee. */}
        <img src={concentrada} alt="" className={`sci-img ${end ? "opacity-0" : ""}`} draggable={false} />
        <img src={FACE[tier]} alt={CAPTION[tier]} className={`sci-img ${end ? "sci-in" : "opacity-0"}`} draggable={false} />
        {/* Efectos sobre el tubo (≈32 % x, 47 % y de la ilustración). */}
        {end && <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
          {tier === "toxic" && <g className="sci-skull">
            <path d="M33 40 Q28 32 34 26 Q40 20 34 14" className="stroke-run/60" strokeWidth="2" fill="none" />
            <g transform="translate(34 8)">
              <path d="M-8 0 Q-8 -9 0 -9 Q8 -9 8 0 Q8 4 4 5 L4 8 L-4 8 L-4 5 Q-8 4 -8 0 Z" className="fill-run/70" />
              <circle cx="-3" cy="-1" r="2" className="fill-card" /><circle cx="3" cy="-1" r="2" className="fill-card" />
            </g>
          </g>}
          {tier === "boom" && <g className="sci-fx-boom">
            <path d="M33 47 L40 30 L43 42 L55 34 L48 48 L58 55 L45 55 L48 68 L36 58 L26 68 L28 55 L12 54 L25 47 L18 32 Z" className="fill-destructive" />
            <path d="M33 49 L37 39 L39 46 L46 42 L41 50 L46 54 L38 54 L39 61 L33 55 L28 60 L29 53 L22 51 L29 49 L26 41 Z" className="fill-amber" />
          </g>}
        </svg>}
      </div>}
      <p className="font-display text-xl">{end ? CAPTION[tier] : "Agitando la mezcla…"}</p>
      <Button variant="outline" className="h-12" onClick={onClose}>Ver resultados</Button>
    </div>
  </div>;
}
