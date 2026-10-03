import { createFileRoute, Link } from "@tanstack/react-router";
import { Thermometer, Calculator, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador de Termociclador PCR" },
      { name: "description", content: "Simulador educativo de termociclador: equipo virtual, calculadora de protocolos y zona de entrenamiento." },
      { property: "og:title", content: "Simulador de Termociclador PCR" },
      { property: "og:description", content: "Aprende a programar un termociclador sin necesidad de equipo real." },
    ],
  }),
  component: MainMenu,
});

/** Las tres opciones del menú principal. */
const OPTIONS = [
  { to: "/termociclador", icon: Thermometer, code: "01", title: "Termociclador", desc: "Pantalla de equipo estándar: ejecuta, pausa y edita programas con rampas, tapa y gradiente." },
  { to: "/calculadora", icon: Calculator, code: "02", title: "Calculadora de protocolos", desc: "Elige polimerasa, cebadores, molde y aditivos; obtén el programa completo y la master mix." },
  { to: "/entrenamiento", icon: GraduationCap, code: "03", title: "Zona de entrenamiento", desc: "Resuelve casos prácticos configurando el equipo y recibe corrección paso a paso." },
] as const;

function MainMenu() {
  return (
    <main className="flex min-h-screen flex-col p-6 md:p-10">
      <header className="lcd mb-8 flex flex-wrap items-end justify-between gap-4 rounded-xl p-6">
        <div>
          <p className="text-sm text-lcd-dim">SIM-PCR · v1.0 · MODO OFFLINE</p>
          <h1 className="lcd-glow text-4xl font-bold tracking-tight md:text-5xl">Simulador de Termociclador</h1>
        </div>
        <p className="text-lg text-lcd-dim">BLOQUE 25.0°C · LISTO</p>
      </header>
      <nav className="grid flex-1 gap-5 md:grid-cols-3">
        {OPTIONS.map(({ to, icon: Icon, code, title, desc }) => (
          <Link key={to} to={to} className="hw-key group flex min-h-64 flex-col justify-between rounded-xl p-6">
            <div className="flex items-start justify-between">
              <Icon className="size-12 text-amber" strokeWidth={1.5} />
              <span className="font-mono text-3xl text-muted-foreground">{code}</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </nav>
    </main>
  );
}
