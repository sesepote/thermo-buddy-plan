/**
 * Navegación por deslizamiento: orden de las pantallas principales. Deslizar
 * hacia arriba avanza a la siguiente; hacia abajo vuelve a la anterior.
 */
export const SWIPE_ORDER = ["/", "/termociclador", "/calculadora", "/entrenamiento", "/glosario"] as const;
export type SwipePath = (typeof SWIPE_ORDER)[number];

/** Devuelve la ruta destino o null si el gesto no aplica. */
export function swipeTarget(path: string, dy: number): SwipePath | null {
  const i = SWIPE_ORDER.indexOf(path as SwipePath);
  if (i < 0) return null;
  const next = i + (dy < 0 ? 1 : -1);
  return SWIPE_ORDER[next] ?? null;
}
