/** Diccionario base (español). Todos los idiomas deben tener esta misma forma. */
export const es = {
  common: { menu: "Menú", cancel: "Cancelar", language: "Cambiar idioma", toDark: "Cambiar a modo oscuro", toLight: "Cambiar a modo claro" },
  menu: { nav: "Menú principal", calculator: ["Calculadora de", "protocolos"], cycler: ["Termociclador"], exercises: ["Ejercicios"], glossary: ["Glosario"], main: "Simulador principal" },
  sections: { menu: "MENÚ", cycler: "TERMOCICLADOR", calculator: "CALCULADORA", exercises: "EJERCICIOS", glossary: "GLOSARIO" },
  titles: { calculator: "Calculadora de protocolos", exercises: "Ejercicios", glossary: "Glosario" },
  status: { block: "BLOQUE", lid: "TAPA", program: "PROGRAMA", elapsed: "TRANSCURRIDO", remaining: "RESTANTE", total: "TOTAL", progress: "Progreso del programa",
    idle: "LISTO", preheating: "CALENTANDO TAPA", running: "EN EJECUCIÓN", paused: "EN PAUSA", done: "FINALIZADO" },
};
export type Translations = { [K in keyof typeof es]: { [P in keyof (typeof es)[K]]: (typeof es)[K][P] extends string[] ? string[] : string } };
