# Simulador de Termociclador

App educativa en español con menú principal y tres módulos, pensada para un terminal de pantalla táctil / kiosco de laboratorio.

## Requisitos generales
- Funciona 100 % sin internet: sin servidores ni servicios externos, fuentes e iconos incluidos en la app, datos guardados en el propio equipo.
- Instalable como app de pantalla completa (PWA) que, tras la primera carga, arranca sin conexión.
- Diseño táctil: botones grandes (mín. 48 px), teclado numérico en pantalla para introducir valores, sin depender de ratón ni teclado físico ni de efectos hover.
- Bloques de código principales con comentarios explicativos en español (cálculos, simulación, evaluación).
- Uso de librerías open source cuando existan para la tarea (gráficas, PWA, validación, fuentes, iconos).

## Menú principal (`/`)
Pantalla de inicio con tres tarjetas grandes: Termociclador, Calculadora de protocolos, Zona de entrenamiento. Estética de equipo de laboratorio: panel oscuro, pantalla LCD verde/ámbar, tipografía monoespaciada para valores.

## 1. Termociclador (`/termociclador`)
Réplica de la interfaz de un termociclador estándar:
- Pantalla LCD con estado: temperatura del bloque, temperatura de tapa, paso actual, ciclo X/Y, tiempo restante.
- Teclado físico simulado: Run, Pause, Stop, Edit, flechas, Enter, teclado numérico.
- Editor de programa: pasos (temperatura, tiempo), bloques de ciclo con nº de repeticiones, rampa (°C/s), tapa calefactada (105 °C), hold final (4 °C ∞).
- Biblioteca de programas guardados (crear, duplicar, borrar).
- Ejecución simulada con velocidad ajustable (x1, x10, x60) y gráfica temperatura vs tiempo en vivo, con rampas realistas.
- Gradiente opcional en el paso de anillamiento (vista de 12 columnas con temperatura por columna).

## 2. Calculadora de protocolos (`/calculadora`)
Formulario de entrada:
- Tipo de reacción: PCR estándar, Hot-start, Touchdown, Long PCR, RT-PCR (2 pasos), qPCR SYBR / sonda, PCR de colonia.
- Polimerasa: Taq, Hot-start Taq, Pfu, Phusion/Q5 (alta fidelidad), KOD, etc. Cada una con su temperatura de desnaturalización, activación inicial y velocidad de extensión (kb/min).
- Cebadores: secuencias (o Tm manual). Cálculo de Tm (Wallace y nearest-neighbor simplificado con Na+/Mg2+), %GC, diferencia de Tm entre cebadores.
- Tamaño del amplicón, tipo de molde (genómico, plásmido, cDNA, colonia), contenido GC alto.
- Aditivos: DMSO, betaína, MgCl2 extra, formamida (ajustan Tm de anillamiento).

Salida:
- Protocolo completo: desnaturalización inicial, ciclos (desnat./anillamiento/extensión), nº de ciclos recomendado, extensión final, hold.
- Explicación de cada valor ("Anillamiento = Tm más baja − 3 °C, −0,6 °C por 10 % de DMSO").
- Avisos (Tm descompensada, GC alto, amplicón largo para la enzima).
- Mezcla de reacción por volumen y nº de muestras (master mix con 10 % extra).
- Botón "Enviar al termociclador" que carga el programa en el módulo 1.

## 3. Zona de entrenamiento (`/entrenamiento`)
- Niveles: Básico, Intermedio, Avanzado.
- Cada ejercicio presenta un caso ("Amplifica un fragmento de 2,5 kb de ADN genómico con Phusion, cebadores Tm 62/64 °C...").
- El usuario configura el programa con el mismo editor del termociclador.
- Verificación con tolerancias por parámetro (ej. anillamiento ±2 °C, extensión ±20 %, ciclos 25–35) y comentarios por paso: correcto / mejorable / incorrecto, con explicación.
- Puntuación, pistas opcionales (restan puntos), historial y progreso guardados.
- Banco inicial de ~15 ejercicios.

## Detalles técnicos
- Rutas TanStack: `/`, `/termociclador`, `/calculadora`, `/entrenamiento`, cada una con su head().
- Lógica pura y testeable en `src/lib/pcr/`: modelo de programa, cálculo de Tm, reglas por polimerasa, generador de protocolo, motor de simulación (rampas), evaluador de ejercicios.
- Base de datos de reactivos/polimerasas/ejercicios como datos estáticos en TS.
- Gráfica con Recharts (MIT); estado compartido con Zustand (MIT) + persistencia en localStorage; validación con Zod (MIT).
- Offline: vite-plugin-pwa / Workbox (MIT) precachea toda la app; fuentes vía @fontsource (OFL) e iconos lucide-react (ISC), nada cargado de CDN.
- Comentarios JSDoc en `src/lib/pcr/*` y componentes clave, explicando fórmulas y decisiones.
- Antes de construir se propondrán 3 direcciones visuales para elegir.
