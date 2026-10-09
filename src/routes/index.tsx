import { createFileRoute, Link } from "@tanstack/react-router";
import { Thermometer, Calculator, GraduationCap, BookOpen, type LucideIcon } from "lucide-react";
import { StatusBars } from "@/components/sim/StatusBars";
import { PcrBackdrop } from "@/components/sim/PcrBackdrop";
import { MenuMolecule } from "@/components/sim/MenuMolecule";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador de Termociclador PCR" },
      {
        name: "description",
        content:
          "Simulador educativo de termociclador: equipo virtual, calculadora de protocolos y zona de entrenamiento.",
      },
      { property: "og:title", content: "Simulador de Termociclador PCR" },
      {
        property: "og:description",
        content: "Aprende a programar un termociclador sin necesidad de equipo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MainMenu,
});

/** Las tres esferas del menú: la del termociclador ocupa el centro. */
interface Sphere {
  to: "/calculadora" | "/termociclador" | "/entrenamiento" | "/glosario";
  icon: LucideIcon;
  title: string[];
  center?: boolean; // módulo principal: esfera mayor, en el medio
}

const SPHERES: Sphere[] = [
  {
    to: "/calculadora",
    icon: Calculator,
    title: ["Calculadora de", "protocolos"],
  },
  {
    to: "/termociclador",
    icon: Thermometer,
    title: ["Termociclador"],
    center: true,
  },
  {
    to: "/entrenamiento",
    icon: GraduationCap,
     title: ["Ejercicios"],
  },
  {
    to: "/glosario",
    icon: BookOpen,
    title: ["Glosario"],
  },
];

function MainMenu() {
  return (
    <StatusBars section="MENÚ" menu>
      <PcrBackdrop />

      {/* En pantallas estrechas el termociclador queda entre los otros dos. */}
      <nav aria-label="Menú principal" className="menu-spheres">
        {/* Enlaces moleculares entre las esferas */}
        <MenuMolecule />

        {SPHERES.map(({ to, icon: Icon, title, center }) => (
          <Link
            key={to}
            to={to}
            className={
              `menu-sphere ${center ? "menu-sphere-primary" : ""} ${to === "/glosario" ? "menu-sphere-glossary" : ""} ${to === "/calculadora" ? "menu-sphere-calculator" : ""} ${to === "/entrenamiento" ? "menu-sphere-exercises" : ""}`
            }
          >
            {/* Resplandor interior de la esfera */}
            <div
              aria-hidden
              className={
                center
                  ? "absolute inset-0 rounded-full bg-gradient-to-b from-ice/10 to-transparent"
                  : "absolute inset-0 rounded-full bg-gradient-to-b from-ice/5 to-transparent opacity-50"
              }
            />
            {/* Anillo orbital giratorio solo en la esfera central */}
            {center && (
              <div
                aria-hidden
                className="absolute inset-4 rounded-full border border-dashed border-ice/10 motion-safe:animate-[spin_40s_linear_infinite]"
              />
            )}

            <Icon
              className={center ? "size-7 text-ice sm:size-10" : "size-6 text-ice/70 sm:size-8"}
              strokeWidth={1.25}
            />
            <h2
              className={`mt-3 text-center font-display leading-tight uppercase ${
                center ? "px-3 text-base font-bold sm:px-8 sm:text-2xl md:text-3xl" : "px-3 text-sm font-medium sm:px-6 sm:text-lg"
              }`}
            >
              {title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            {center && (
              <p className="mt-2 text-[9px] font-medium text-ice/60 uppercase sm:mt-4 sm:text-[11px]">
                Simulador principal
              </p>
            )}
          </Link>
        ))}
      </nav>

    </StatusBars>
  );
}
