import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTr } from "@/lib/i18n/tr";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { useTeacherIdleWatcher } from "@/lib/teacher-session";

// Fuentes empaquetadas localmente (@fontsource): no se descargan de internet.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
// Menú principal: Space Grotesk (títulos) + DM Sans (descripciones).
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useApp } from "../lib/store";
import { useThermocyclerSession } from "../lib/thermocycler-session";
import { registerOffline } from "../lib/pwa";

/** Orden de las pantallas principales (decide la dirección de la animación al navegar). */
const SWIPE_ORDER = ["/", "/termociclador", "/calculadora", "/entrenamiento", "/glosario"] as const;

function NotFoundComponent() {
  const tr = useTr();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{tr("Página no encontrada")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("La página que buscas no existe o se ha movido.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tr("Volver al inicio")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const tr = useTr();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {tr("Esta página no se ha cargado")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("Algo ha fallado. Puedes reintentarlo o volver al inicio.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tr("Reintentar")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {tr("Volver al inicio")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, user-scalable=no" },
      { name: "theme-color", content: "#1a1d22" },
      { title: "Simulador de Termociclador PCR" },
      { name: "description", content: "Simulador educativo de termociclador para pantallas táctiles, sin conexión." },
      { property: "og:title", content: "Simulador de Termociclador PCR" },
      { property: "og:description", content: "Simulador educativo de termociclador para pantallas táctiles, sin conexión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useTeacherIdleWatcher();
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Carga los programas y el progreso guardados en este equipo.
    void useApp.persist.rehydrate();
    // Activa el modo sin conexión (solo en la versión publicada).
    void registerOffline();
  }, []);

  // Aplica el tema guardado como clase en <html> (tras rehidratar, sin desajustes SSR).
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    // El reloj del instrumento sigue avanzando aunque se visite el menú.
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      useThermocyclerSession.getState().tick((now - previous) / 1000);
      previous = now;
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  // Dirección de la animación al cambiar de pantalla.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef(pathname);
  const dir = useRef<"left" | "right" | null>(null);
  if (prevPath.current !== pathname) {
    const a = SWIPE_ORDER.indexOf(prevPath.current as never), b = SWIPE_ORDER.indexOf(pathname as never);
    dir.current = a >= 0 && b >= 0 ? (b > a ? "left" : "right") : null;
    prevPath.current = pathname;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div key={pathname} className={dir.current ? `page-slide-${dir.current}` : undefined}>
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
