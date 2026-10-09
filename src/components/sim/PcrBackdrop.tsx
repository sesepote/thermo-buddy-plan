/** Doble hélice dibujada localmente: animación ligera, sin recursos de red. */
export function PcrBackdrop() {
  const strands = Array.from({ length: 38 }, (_, i) => {
    const y = i * 24;
    const offset = Math.sin(i * 0.39) * 120;
    return { y, a: 250 + offset, b: 250 - offset };
  });
  return <div className="pcr-backdrop" aria-hidden="true">
    <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
      <g className="pcr-helix" fill="none" stroke="currentColor">
        {strands.map(({ y, a, b }, i) => <g key={i}><line x1={a} x2={b} y1={y} y2={y} strokeWidth="2" opacity="0.5" /><circle cx={a} cy={y} r="3" /><circle cx={b} cy={y} r="3" /></g>)}
        <polyline points={strands.map(s => `${s.a},${s.y}`).join(" ")} strokeWidth="2" />
        <polyline points={strands.map(s => `${s.b},${s.y}`).join(" ")} strokeWidth="2" />
      </g>
      <g className="pcr-trace" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M0 710 H390 L420 520 H490 L530 680 H600 L640 590 H710 L750 520 H820 L860 680 H940 L980 590 H1200" /><path d="M0 770 H1200" strokeDasharray="3 12" opacity="0.4" /></g>
    </svg>
  </div>;
}