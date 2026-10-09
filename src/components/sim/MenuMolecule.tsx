// ============= Componente nuevo =============

import { useEffect, useRef, useState } from "react";

// Enlaces moleculares entre las esferas del menú.
// Mide los centros de las esferas tras montar (solo cliente, sin SSR)
// y dibuja un SVG con las uniones: el termociclador es el átomo central
// y calculadora/ejercicios enlazan con doble enlace, glosario con simple.

interface Bond {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number; // punto medio: ahí va el átomo pequeño
  my: number;
  double: boolean;
}

const OTROS = [
  { sel: ".menu-sphere-calculator", double: true },
  { sel: ".menu-sphere-exercises", double: true },
  { sel: ".menu-sphere-glossary", double: false },
] as const;

function centroDe(el: HTMLElement, base: DOMRect) {
  const r = el.getBoundingClientRect();
  return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
}

export function MenuMolecule() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const nav = ref.current?.parentElement;
    if (!nav) return;
    const medir = () => {
      const primaria = nav.querySelector<HTMLElement>(".menu-sphere-primary");
      const base = nav.getBoundingClientRect();
      if (!primaria || base.width === 0) return;
      const centro = centroDe(primaria, base);
      const siguientes: Bond[] = [];
      for (const { sel, double } of OTROS) {
        const el = nav.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const c = centroDe(el, base);
        siguientes.push({
          x1: centro.x,
          y1: centro.y,
          x2: c.x,
          y2: c.y,
          mx: (centro.x + c.x) / 2,
          my: (centro.y + c.y) / 2,
          double,
        });
      }
      setBonds(siguientes);
      setListo(true);
    };
    medir();
    // Se vuelve a medir si cambia el tamaño (móvil/escritorio) o la fuente.
    const ro = new ResizeObserver(medir);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // El contenedor siempre está montado: el ref se necesita para medir al padre.
  return (
    <div ref={ref} aria-hidden className="menu-molecule">
      {!listo ? null : (

      <svg width="100%" height="100%" viewBox={`0 0 ${1000} ${1000}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        {bonds.map((b, i) => {
          // Desdoblamiento perpendicular para el doble enlace.
          const dx = b.x2 - b.x1;
          const dy = b.y2 - b.y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * 3.5;
          const ny = (dx / len) * 3.5;
          return (
            <g key={i}>
              {b.double ? (
                <>
                  <line className="menu-bond" x1={b.x1 + nx} y1={b.y1 + ny} x2={b.x2 + nx} y2={b.y2 + ny} />
                  <line className="menu-bond" x1={b.x1 - nx} y1={b.y1 - ny} x2={b.x2 - nx} y2={b.y2 - ny} />
                </>
              ) : (
                <line className="menu-bond" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />
              )}
              {/* Átomo compartido en el punto medio del enlace */}
              <circle className="menu-bond-dot" cx={b.mx} cy={b.my} r={b.double ? 5 : 4} style={{ animationDelay: `${i * 1.3}s` }} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
