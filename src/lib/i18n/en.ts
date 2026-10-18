/** Diccionario en inglés. */
import type { Translations } from "./es";

export const en: Translations = {
  common: { menu: "Menu", cancel: "Cancel", language: "Change language", toDark: "Switch to dark mode", toLight: "Switch to light mode" },
  menu: { nav: "Main menu", calculator: ["Protocol", "calculator"], cycler: ["Thermal cycler"], exercises: ["Exercises"], glossary: ["Glossary"], main: "Main simulator" },
  sections: { menu: "MENU", cycler: "THERMAL CYCLER", calculator: "CALCULATOR", exercises: "EXERCISES", glossary: "GLOSSARY" },
  titles: { calculator: "Protocol calculator", exercises: "Exercises", glossary: "Glossary" },
  status: { block: "BLOCK", lid: "LID", program: "PROGRAM", elapsed: "ELAPSED", remaining: "REMAINING", total: "TOTAL", progress: "Program progress",
    idle: "READY", preheating: "HEATING LID", running: "RUNNING", paused: "PAUSED", done: "FINISHED" },
};
