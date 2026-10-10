import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { SWIPE_ORDER, swipeTarget } from "../lib/swipe";

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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Carga los programas y el progreso guardados en este equipo.
    void useApp.persist.rehydrate();
    // Activa el modo sin conexión (solo en la versión publicada).
    void registerOffline();
  }, []);

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

  // Gestos táctiles: deslizar horizontalmente cambia de pantalla.
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef(pathname);
  const dir = useRef<"left" | "right" | null>(null);
  if (prevPath.current !== pathname) {
    const a = SWIPE_ORDER.indexOf(prevPath.current as never), b = SWIPE_ORDER.indexOf(pathname as never);
    dir.current = a >= 0 && b >= 0 ? (b > a ? "left" : "right") : null;
    prevPath.current = pathname;
  }
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // La pantalla sigue al dedo mientras se arrastra; al soltar cambia o vuelve a su sitio.
    let start: { x: number; y: number; t: number } | null = null;
    let lock: "h" | "v" | null = null;
    const setX = (x: number, animate: boolean) => {
      const el = pageRef.current;
      if (!el) return;
      el.style.transition = animate ? "transform 220ms ease-out" : "none";
      el.style.transform = x ? `translateX(${x}px)` : "";
    };
    const onStart = (e: TouchEvent) => {
      const el = e.target as Element;
      // No se interfiere con gráficos, campos, ventanas emergentes ni zonas desplazables en horizontal.
      if (e.touches.length !== 1 || el.closest("svg, input, textarea, select, [data-no-swipe], .fixed")) { start = null; return; }
      start = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, t: Date.now() };
      lock = null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.touches[0]!.clientX - start.x, dy = e.touches[0]!.clientY - start.y;
      if (!lock && Math.hypot(dx, dy) > 10) lock = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
      if (lock !== "h") return;
      // Resistencia elástica si no hay pantalla en esa dirección.
      const has = swipeTarget(window.location.pathname, dx) !== null;
      setX(has ? dx : dx * 0.25, false);
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.changedTouches[0]!.clientX - start.x;
      const fast = Date.now() - start.t < 400 && Math.abs(dx) > 60;
      const far = Math.abs(dx) > window.innerWidth * 0.25;
      const wasH = lock === "h";
      start = null; lock = null;
      const to = wasH && (fast || far) ? swipeTarget(window.location.pathname, dx) : null;
      if (to) {
        setX(0, false);
        void router.navigate({ to });
      } else setX(0, true);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div ref={pageRef} className="overflow-x-hidden" style={{ touchAction: "pan-y" }}>
        <div key={pathname} className={dir.current ? `page-slide-${dir.current}` : undefined}>
          <Outlet />
        </div>
      </div>
    </QueryClientProvider>
  );
}
