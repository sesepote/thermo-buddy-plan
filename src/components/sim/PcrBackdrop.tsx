/**
 * Fondo del menú: doble hélice, una hélice lejana y moléculas enlazadas
 * que suben muy despacio. Todo dibujado aquí mismo: sin recursos de red
 * y con un movimiento contenido.
 */

// Nodo de una molécula: posición relativa al centro y tamaño del átomo.
type Atom = { x: number; y: number; r: number };

// Enlace entre dos nodos; el tercer valor desdobla la línea (doble enlace).
type Bond = [number, number, boolean?];

type Molecule = { atoms: Atom[]; bonds: Bond[] };

// Anillos de referencia, calculados una sola vez y siempre iguales.
const HEX: Atom[] = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return { x: Math.cos(a) * 12, y: Math.sin(a) * 12, r: 2.4 };
});
const PENT: Atom[] = Array.from({ length: 5 }, (_, i) => {
  const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
  return { x: Math.cos(a) * 10.5, y: Math.sin(a) * 10.5, r: 2.4 };
});

// Estructuras fijas: átomos unidos por enlaces, como un esquema químico.
const SHAPES: Molecule[] = [
  // Diatómica con doble enlace.
  {
    atoms: [
      { x: -9, y: 0, r: 3.1 },
      { x: 9, y: 0, r: 3.1 },
    ],
    bonds: [[0, 1, true]],
  },
  // Triatómica angular, tipo agua.
  {
    atoms: [
      { x: 0, y: 5, r: 3.3 },
      { x: -11, y: -6, r: 2.4 },
      { x: 11, y: -6, r: 2.4 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
  },
  // Cadena de tres nodos.
  {
    atoms: [
      { x: -14, y: 6, r: 2.5 },
      { x: 0, y: -5, r: 3.1 },
      { x: 14, y: 6, r: 2.5 },
    ],
    bonds: [
      [0, 1],
      [1, 2],
    ],
  },
  // Cadena larga de cuatro nodos.
  {
    atoms: [
      { x: -21, y: 7, r: 2.3 },
      { x: -7, y: -5, r: 2.9 },
      { x: 7, y: 6, r: 2.7 },
      { x: 21, y: -6, r: 2.3 },
    ],
    bonds: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  // Anillo de seis.
  {
    atoms: HEX,
    bonds: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ],
  },
  // Núcleo con tres ramas.
  {
    atoms: [
      { x: 0, y: 0, r: 3.3 },
      { x: 0, y: -14, r: 2.4 },
      { x: 12, y: 8, r: 2.4 },
      { x: -12, y: 8, r: 2.4 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  // Anillo de cinco.
  {
    atoms: PENT,
    bonds: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
];

// Segmentos de enlace ya situados en la pantalla; los desdoblados se separan
// en perpendicular para que se lean como un doble enlace.
function bondLines(mol: Molecule, x: number, scale: number) {
  return mol.bonds.flatMap(([i, j, double]) => {
    const a = mol.atoms[i];
    const b = mol.atoms[j];
    const x1 = x + a.x * scale;
    const y1 = a.y * scale;
    const x2 = x + b.x * scale;
    const y2 = b.y * scale;
    if (!double) return [{ x1, y1, x2, y2 }];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ox = (-(y2 - y1) / len) * 2.3;
    const oy = ((x2 - x1) / len) * 2.3;
    return [
      { x1: x1 + ox, y1: y1 + oy, x2: x2 + ox, y2: y2 + oy },
      { x1: x1 - ox, y1: y1 - oy, x2: x2 - ox, y2: y2 - oy },
    ];
  });
}

export function PcrBackdrop() {
  const strands = Array.from({ length: 38 }, (_, i) => {
    const y = i * 24;
    const offset = Math.sin(i * 0.39) * 120;
    return { y, a: 250 + offset, b: 250 - offset };
  });

  // Hélice del fondo: desfasada y más lenta, solo aporta profundidad.
  const echo = Array.from({ length: 34 }, (_, i) => {
    const y = 30 + i * 26;
    const offset = Math.sin(i * 0.42 + 1.9) * 150;
    return { y, a: 920 + offset, b: 920 - offset };
  });

  // Posiciones fijas, nunca aleatorias: así lo que pinta el servidor
  // y lo que pinta el navegador son exactamente iguales.
  const molecules = Array.from({ length: 14 }, (_, i) => {
    const duration = 28 + (i % 6) * 7;
    return {
      x: 70 + ((i * 197) % 1060),
      mol: SHAPES[i % SHAPES.length],
      scale: 0.85 + (i % 4) * 0.2,
      duration,
      // Retardo negativo: todas arrancan ya en marcha y repartidas por la pantalla.
      delay: -((i * 6.7) % duration),
      // Giro sobre sí misma: larguísimo y alternando el sentido.
      spin: 54 + (i % 5) * 13,
      reverse: i % 2 === 0,
    };
  });

  return (
    <div className="pcr-backdrop" aria-hidden="true">
      <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="pcr-glow-grad">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dos halos que se hinchan y se apagan muy despacio. */}
        <g className="pcr-glow" fill="url(#pcr-glow-grad)">
          <circle cx="250" cy="340" r="300" />
          <circle cx="960" cy="620" r="250" />
        </g>

        {/* Moléculas: átomos unidos por enlaces, subiendo y girando apenas. */}
        <g className="pcr-bubbles" fill="currentColor">
          {molecules.map((m, i) => (
            <g
              key={i}
              className="pcr-bubble"
              style={{ animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s` }}
            >
              <g
                className="pcr-mol"
                style={{
                  animationDuration: `${m.spin}s`,
                  animationDirection: m.reverse ? "reverse" : "normal",
                }}
              >
                <g className="pcr-bonds" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.65">
                  {bondLines(m.mol, m.x, m.scale).map((l, k) => (
                    <line key={k} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
                  ))}
                </g>
                {m.mol.atoms.map((a, k) => (
                  <circle key={k} cx={m.x + a.x * m.scale} cy={a.y * m.scale} r={a.r * m.scale} />
                ))}
              </g>
            </g>
          ))}
        </g>

        {/* Hélice lejana, casi fantasma. */}
        <g className="pcr-helix-echo" fill="none" stroke="currentColor" strokeWidth="1.5">
          {echo.map(({ y, a, b }, i) => (
            <g key={i}>
              <line x1={a} x2={b} y1={y} y2={y} opacity="0.3" />
              <circle cx={a} cy={y} r="2" />
              <circle cx={b} cy={y} r="2" />
            </g>
          ))}
          <polyline points={echo.map((s) => `${s.a},${s.y}`).join(" ")} opacity="0.45" />
          <polyline points={echo.map((s) => `${s.b},${s.y}`).join(" ")} opacity="0.45" />
        </g>

        <g className="pcr-helix" fill="none" stroke="currentColor">
          {strands.map(({ y, a, b }, i) => (
            <g key={i}>
              <line x1={a} x2={b} y1={y} y2={y} strokeWidth="2" opacity="0.5" />
              <circle cx={a} cy={y} r="3" />
              <circle cx={b} cy={y} r="3" />
            </g>
          ))}
          <polyline points={strands.map((s) => `${s.a},${s.y}`).join(" ")} strokeWidth="2" />
          <polyline points={strands.map((s) => `${s.b},${s.y}`).join(" ")} strokeWidth="2" />
        </g>

        <g className="pcr-trace" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M0 710 H390 L420 520 H490 L530 680 H600 L640 590 H710 L750 520 H820 L860 680 H940 L980 590 H1200" />
          <path className="pcr-drift" d="M0 770 H1200" strokeDasharray="3 12" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
}
