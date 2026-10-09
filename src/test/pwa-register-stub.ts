/**
 * Suplante del módulo virtual que genera vite-plugin-pwa. En los tests no hay
 * service worker que registrar, así que la función se queda vacía.
 */
export function registerSW() {
  /* sin efecto en entorno de pruebas */
}

export default registerSW;
