/**
 * Navegación por deslizamiento: orden de las pantallas principales. Deslizar a
 * la izquierda avanza a la siguiente; a la derecha vuelve a la anterior.
 */
export const SWIPE_ORDER = ["/", "/termociclador", "/calculadora", "/entrenamiento", "/glosario"] as const;
export type SwipePath = (typeof SWIPE_ORDER)[number];

/** Devuelve la ruta destino o null si el gesto no aplica. */
export function swipeTarget(path: string, dx: number): SwipePath | null {
  const i = SWIPE_ORDER.indexOf(path as SwipePath);
  if (i < 0) return null;
  const next = i + (dx < 0 ? 1 : -1);
  return SWIPE_ORDER[next] ?? null;
}
