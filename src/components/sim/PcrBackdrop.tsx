/**
 * Fondo del menú: doble hélice, una hélice lejana y burbujas que suben muy despacio.
 * Todo dibujado aquí mismo: sin recursos de red y con un movimiento contenido.
 */
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
  const bubbles = Array.from({ length: 16 }, (_, i) => {
    const duration = 26 + (i % 6) * 7;
    return {
      x: 40 + ((i * 197) % 1120),
      r: 3 + (i % 4) * 1.9,
      duration,
      // Retardo negativo: todas arrancan ya en marcha y repartidas por la pantalla.
      delay: -((i * 6.7) % duration),
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

        {/* Burbujas: suben en línea recta, escalonadas. */}
        <g className="pcr-bubbles" fill="currentColor">
          {bubbles.map((b, i) => (
            <g
              key={i}
              className="pcr-bubble"
              style={{ animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }}
            >
              <circle cx={b.x} cy="0" r={b.r} />
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
