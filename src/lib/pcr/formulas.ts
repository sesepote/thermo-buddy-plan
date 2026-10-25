/** Chuleta de fórmulas y conversiones de consulta rápida (pantalla de glosario). */
export interface FormulaVar { sym: string; desc: string }
export interface FormulaCard { title: string; formula: string; vars: FormulaVar[]; example: string }
export interface FormulaGroup { group: string; cards: FormulaCard[] }

export const FORMULAS: FormulaGroup[] = [
  {
    group: "Diluciones y master mix",
    cards: [
      {
        title: "Ecuación de dilución",
        formula: "V₁ = (C₂ × V₂) / C₁",
        vars: [
          { sym: "C₁", desc: "concentración del stock" },
          { sym: "V₁", desc: "volumen a pipetear" },
          { sym: "C₂", desc: "concentración final" },
          { sym: "V₂", desc: "volumen de reacción" },
        ],
        example: "MgCl₂ 25 mM → 1,5 mM en 25 µL: 1,5 × 25 / 25 = 1,5 µL",
      },
      {
        title: "Tampón (factor ×)",
        formula: "V = V_reacción × X_final / X_stock",
        vars: [
          { sym: "X_stock", desc: "concentración del tampón (10×, 5×…)" },
          { sym: "X_final", desc: "normalmente 1×" },
        ],
        example: "Tampón 10× en 25 µL: 25 × 1 / 10 = 2,5 µL",
      },
      {
        title: "Enzima por unidades",
        formula: "V = U_reacción / (U/µL del stock)",
        vars: [
          { sym: "U_reacción", desc: "unidades deseadas por tubo" },
          { sym: "U/µL", desc: "concentración de la enzima" },
        ],
        example: "1,0 U con Taq 5 U/µL: 1,0 / 5 = 0,2 µL",
      },
      {
        title: "Agua (balance)",
        formula: "V_agua = V_reacción − Σ V_reactivos − V_molde",
        vars: [{ sym: "Σ V_reactivos", desc: "suma de tampón, MgCl₂, dNTP, cebadores y enzima" }],
        example: "25 − 2,5 − 1,5 − 0,5 − 1,5 − 0,2 − 2 = 16,8 µL",
      },
      {
        title: "Número de reacciones",
        formula: "N = muestras + C(+) + C(−) + 1 extra",
        vars: [{ sym: "1 extra", desc: "margen por error de pipeteo" }],
        example: "12 muestras → 12 + 1 + 1 + 1 = 15 reacciones",
      },
      {
        title: "Master mix total",
        formula: "V_total = V_1× × N",
        vars: [
          { sym: "V_1×", desc: "volumen por reacción (sin molde)" },
          { sym: "N", desc: "número de reacciones" },
        ],
        example: "Tampón 2,5 µL × 15 = 37,5 µL",
      },
    ],
  },
  {
    group: "Conversiones de unidades",
    cards: [
      {
        title: "Escala molar",
        formula: "1 M = 10³ mM = 10⁶ µM = 10⁹ nM",
        vars: [{ sym: "×1000", desc: "cada salto a la unidad menor" }],
        example: "0,2 mM = 200 µM",
      },
      {
        title: "Cebadores",
        formula: "1 pmol/µL = 1 µM = 1000 nM",
        vars: [{ sym: "pmol/µL", desc: "forma habitual de los stocks" }],
        example: "300 nM desde 10 pmol/µL en 25 µL: 0,3 × 25 / 10 = 0,75 µL",
      },
      {
        title: "dNTPs",
        formula: "10 mM = 10 000 µM",
        vars: [{ sym: "Cada dNTP", desc: "el cálculo se hace por nucleótido" }],
        example: "200 µM desde 10 mM en 25 µL: 0,2 × 25 / 10 = 0,5 µL",
      },
      {
        title: "Volumen",
        formula: "1 mL = 1000 µL ; 1 µL = 1000 nL",
        vars: [{ sym: "µL", desc: "unidad habitual de pipeteo" }],
        example: "0,05 mL = 50 µL",
      },
      {
        title: "Tiempo",
        formula: "1 min = 60 s ; 1 h = 3600 s",
        vars: [{ sym: "s", desc: "unidad de los pasos del termociclador" }],
        example: "5 min = 300 s",
      },
    ],
  },
  {
    group: "Termociclado",
    cards: [
      {
        title: "Regla de Wallace (Tm)",
        formula: "Tm = 2 × (A + T) + 4 × (G + C)",
        vars: [{ sym: "A, T, G, C", desc: "nº de cada base del cebador (< 20 nt)" }],
        example: "10 AT + 10 GC: 20 + 40 = 60 °C",
      },
      {
        title: "Temperatura de anillamiento",
        formula: "Ta ≈ Tm_menor − 5 °C",
        vars: [{ sym: "Tm_menor", desc: "Tm más baja de los dos cebadores" }],
        example: "Tm 60 y 62 °C → Ta ≈ 55 °C",
      },
      {
        title: "Tiempo de extensión",
        formula: "t = kb × velocidad (s/kb)",
        vars: [{ sym: "velocidad", desc: "Taq ≈ 60 s/kb · Phusion/Q5 ≈ 30 s/kb" }],
        example: "1,5 kb con Taq: 1,5 × 60 = 90 s",
      },
      {
        title: "Amplificación teórica",
        formula: "N = N₀ × (1 + E)ⁿ",
        vars: [
          { sym: "N₀", desc: "copias iniciales" },
          { sym: "E", desc: "eficiencia (1 = 100 %)" },
          { sym: "n", desc: "número de ciclos" },
        ],
        example: "100 copias, 30 ciclos, E = 1: 100 × 2³⁰ ≈ 1,07 × 10¹¹",
      },
    ],
  },
];
