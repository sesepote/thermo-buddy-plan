import { createFileRoute, Link } from "@tanstack/react-router";
import { Thermometer, Calculator, GraduationCap, type LucideIcon } from "lucide-react";
import { StatusBars } from "@/components/sim/StatusBars";

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
  to: "/calculadora" | "/termociclador" | "/entrenamiento";
  icon: LucideIcon;
  code: string;
  title: string[];
  center?: boolean; // módulo principal: esfera mayor, en el medio
}

const SPHERES: Sphere[] = [
  {
    to: "/calculadora",
    icon: Calculator,
    code: "02",
    title: ["Calculadora de", "protocolos"],
  },
  {
    to: "/termociclador",
    icon: Thermometer,
    code: "01",
    title: ["Termociclador"],
    center: true,
  },
  {
    to: "/entrenamiento",
    icon: GraduationCap,
    code: "03",
    title: ["Zona de", "entrenamiento"],
  },
];

function MainMenu() {
  return (
    <StatusBars section="MENÚ" menu>
      {/* Línea de horizonte: eje óptico que une las tres esferas */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-0 h-px w-full bg-gradient-to-r from-transparent via-ice/10 to-transparent"
      />

      {/* En pantallas estrechas el termociclador queda entre los otros dos. */}
      <nav className="z-10 flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-6 py-4 sm:gap-10 sm:py-8 lg:flex-row lg:gap-16">
        {SPHERES.map(({ to, icon: Icon, code, title, center }) => (
          <Link
            key={to}
            to={to}
            className={
              center
                ? "group relative z-10 flex aspect-square w-44 flex-col items-center justify-center rounded-full border-2 border-ice/40 bg-bubble shadow-[0_0_60px_oklch(0.76_0.1_258/0.15),inset_0_0_40px_oklch(0.76_0.1_258/0.08)] transition-all duration-700 active:scale-95 sm:w-64 md:w-80 lg:w-96 lg:hover:border-ice"
                : "group relative flex aspect-square w-36 flex-col items-center justify-center rounded-full border border-ice/20 bg-bubble shadow-[inset_0_0_30px_oklch(0.76_0.1_258/0.05)] transition-all duration-500 active:scale-95 sm:w-60 md:w-64 lg:w-72 lg:hover:border-ice/50"
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
                className="absolute inset-4 rounded-full border border-dashed border-ice/10 animate-[spin_20s_linear_infinite]"
              />
            )}

            <Icon
              className={center ? "size-7 text-ice sm:size-10" : "size-6 text-ice/70 sm:size-8"}
              strokeWidth={1.25}
            />
            <span
              className={
                center
                  ? "mt-1 font-display text-lg font-bold text-ice sm:mt-3 sm:text-2xl"
                  : "mt-1 font-display text-base font-light text-ice/80 sm:mt-3 sm:text-xl"
              }
            >
              {code}
            </span>
            <h2
              className={`text-center font-display leading-tight uppercase tracking-tight ${
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
