/** Dicionario en galego. */
import type { Translations } from "./es";

export const gl: Translations = {
  common: {
    mute: "Silenciar son",
    unmute: "Activar son", menu: "Menú", cancel: "Cancelar", language: "Cambiar idioma", toDark: "Cambiar a modo escuro", toLight: "Cambiar a modo claro" },
  menu: { nav: "Menú principal", calculator: ["Calculadora de", "protocolos"], cycler: ["Termociclador"], exercises: ["Exercicios"], glossary: ["Glosario"], main: "Simulador principal" },
  sections: { menu: "MENÚ", cycler: "TERMOCICLADOR", calculator: "CALCULADORA", exercises: "EXERCICIOS", glossary: "GLOSARIO" },
  titles: { calculator: "Calculadora de protocolos", exercises: "Exercicios", glossary: "Glosario" },
  status: { block: "BLOQUE", lid: "TAPA", program: "PROGRAMA", elapsed: "TRANSCORRIDO", remaining: "RESTANTE", total: "TOTAL", progress: "Progreso do programa",
    idle: "LISTO", preheating: "QUENTANDO TAPA", running: "EN EXECUCIÓN", paused: "EN PAUSA", done: "FINALIZADO" },
};
