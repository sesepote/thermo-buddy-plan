/**
 * Orden de las pantallas principales (decide la dirección de la animación al navegar).
 */
export const SWIPE_ORDER = ["/", "/termociclador", "/calculadora", "/entrenamiento", "/glosario"] as const;
export type SwipePath = (typeof SWIPE_ORDER)[number];

