/** Glosario: términos que aparecen en la app, agrupados por categoría. */
export const GLOSSARY_CATEGORIES = ["Etapas del programa", "Termociclador", "Reactivos", "Polimerasas", "Cebadores y Tm", "Tipos de PCR", "Moldes"] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];
export interface GlossaryEntry { term: string; category: GlossaryCategory; def: string }

export const GLOSSARY: GlossaryEntry[] = [
  // Etapas
  { category: "Etapas del programa", term: "Desnaturalización inicial", def: "Paso único a 94–98 °C al inicio que separa por completo las hebras del molde y activa las polimerasas hot-start." },
  { category: "Etapas del programa", term: "Desnaturalización", def: "Paso de cada ciclo (94–98 °C) que separa la doble hebra de ADN." },
  { category: "Etapas del programa", term: "Anillamiento (Ta)", def: "Paso en que los cebadores se unen al molde. Suele fijarse unos grados por debajo de la Tm más baja (o por encima con tampones de alta sal como Phusion/Q5)." },
  { category: "Etapas del programa", term: "Extensión", def: "Paso a 68–72 °C en que la polimerasa sintetiza la nueva hebra. Su duración depende del tamaño del amplicón y de la velocidad de la enzima (s/kb)." },
  { category: "Etapas del programa", term: "Extensión final", def: "Paso único tras los ciclos que completa los productos incompletos y añade extremos A (Taq)." },
  { category: "Etapas del programa", term: "Hold / Conservación", def: "Mantenimiento final a 4 °C indefinido (∞) para conservar las muestras hasta recogerlas. No cuenta en el tiempo total." },
  { category: "Etapas del programa", term: "Ciclo", def: "Una repetición de desnaturalización, anillamiento y extensión. En cada ciclo idealmente se duplica el producto." },
  { category: "Etapas del programa", term: "Bucle", def: "Grupo de columnas (pasos) que se repite un número de veces. Se ajusta arrastrando los bordes del recuadro amarillo." },
  { category: "Etapas del programa", term: "Etapa", def: "Bloque del programa: pasos que se ejecutan una vez o que forman un bucle de ciclos." },
  { category: "Etapas del programa", term: "Paso / Columna", def: "Unidad del perfil térmico con temperatura y tiempo. El gráfico muestra siete columnas visibles." },
  { category: "Etapas del programa", term: "Curva de fusión", def: "Rampa lenta tras una qPCR SYBR que mide la caída de fluorescencia para comprobar que hay un único producto." },
  { category: "Etapas del programa", term: "Retrotranscripción (RT)", def: "Paso a 42–55 °C en que la transcriptasa inversa copia ARN a cDNA antes de la PCR." },
  // Termociclador
  { category: "Termociclador", term: "Bloque", def: "Placa metálica que calienta y enfría los tubos. Su temperatura se muestra en la barra superior." },
  { category: "Termociclador", term: "Tapa calefactada", def: "Tapa a ~105 °C que evita la condensación del líquido en la tapa de los tubos." },
  { category: "Termociclador", term: "Precalentamiento", def: "Espera inicial hasta que la tapa alcanza su temperatura antes de empezar el programa." },
  { category: "Termociclador", term: "Rampa", def: "Velocidad de cambio de temperatura (°C/s) entre pasos." },
  { category: "Termociclador", term: "Gradiente", def: "Diferencia de temperatura entre columnas de la placa durante un paso, para probar varias Ta en una sola corrida." },
  { category: "Termociclador", term: "Placa de 96 pocillos", def: "Formato estándar de 8 filas (A–H) × 12 columnas donde se colocan las muestras." },
  { category: "Termociclador", term: "Incremento de tiempo", def: "Segundos que se suman o restan a un paso en cada ciclo." },
  { category: "Termociclador", term: "Touchdown (incremento de temperatura)", def: "Variación de temperatura por ciclo, normalmente −1 °C en el anillamiento." },
  { category: "Termociclador", term: "Volumen de muestra", def: "Volumen de reacción por tubo; el equipo lo usa para estimar el retraso térmico." },
  { category: "Termociclador", term: "Velocidad de simulación", def: "Factor que acelera el reloj simulado (×1, ×10, ×60…) para ver una corrida completa en menos tiempo." },
  // Reactivos
  { category: "Reactivos", term: "Tampón (buffer)", def: "Disolución que mantiene pH y sales óptimos para la polimerasa. Viene concentrado (10× o 5×) y se usa a 1×." },
  { category: "Reactivos", term: "MgCl₂ / Mg²⁺", def: "Cofactor imprescindible de la polimerasa. Óptimo habitual 1,5–2,5 mM; en exceso reduce la especificidad." },
  { category: "Reactivos", term: "dNTPs", def: "Desoxinucleótidos (dATP, dCTP, dGTP, dTTP), los bloques de la nueva hebra. Habitual 0,2 mM finales de cada uno." },
  { category: "Reactivos", term: "Master mix", def: "Mezcla común de todos los reactivos salvo el molde, preparada para varias muestras con un 10 % extra." },
  { category: "Reactivos", term: "Agua libre de nucleasas", def: "Agua que completa el volumen final de la reacción." },
  { category: "Reactivos", term: "DMSO", def: "Aditivo (2–10 %) que facilita desnaturalizar moldes ricos en GC. Baja la Tm ≈ 0,6 °C por cada 1 %." },
  { category: "Reactivos", term: "Betaína", def: "Aditivo (0,5–2 M) que iguala la estabilidad de pares GC y AT. Baja la Tm ≈ 2 °C por M." },
  { category: "Reactivos", term: "Formamida", def: "Aditivo desestabilizante del ADN. Baja la Tm ≈ 0,65 °C por %." },
  { category: "Reactivos", term: "Stock", def: "Concentración del reactivo tal como viene en el tubo antes de diluirlo (C1 en C1·V1 = C2·V2)." },
  { category: "Reactivos", term: "Concentración final", def: "Concentración que queda en la reacción una vez mezclado todo (C2)." },
  { category: "Reactivos", term: "Unidades (U)", def: "Medida de actividad de la polimerasa. Típicamente 1–2,5 U por 50 µL." },
  // Polimerasas
  { category: "Polimerasas", term: "Taq polimerasa", def: "Polimerasa termoestable estándar, ~1 min/kb, deja extremos A. Fidelidad baja." },
  { category: "Polimerasas", term: "Hot-start", def: "Polimerasa inactiva a temperatura ambiente que se activa con calor; reduce productos inespecíficos." },
  { category: "Polimerasas", term: "Pfu", def: "Polimerasa con actividad correctora 3'→5', alta fidelidad pero lenta (~2 min/kb)." },
  { category: "Polimerasas", term: "Phusion / Q5", def: "Polimerasas de alta fidelidad y rápidas (~30 s/kb), desnaturalizan a 98 °C; Ta ≈ Tm + 3 °C." },
  { category: "Polimerasas", term: "KOD", def: "Polimerasa muy rápida (10–25 s/kb), extiende a 70 °C." },
  { category: "Polimerasas", term: "LongAmp", def: "Mezcla para amplicones largos (hasta 30 kb), extiende a 65 °C." },
  { category: "Polimerasas", term: "Fidelidad", def: "Precisión con que la polimerasa copia el molde (pocos errores por base)." },
  { category: "Polimerasas", term: "Velocidad de extensión", def: "Tiempo que necesita la enzima por kilobase de amplicón (s/kb)." },
  // Cebadores
  { category: "Cebadores y Tm", term: "Cebador (primer)", def: "Oligonucleótido corto (18–25 nt) que delimita el fragmento a amplificar. Se usan dos: directo y reverso." },
  { category: "Cebadores y Tm", term: "Tm (temperatura de fusión)", def: "Temperatura a la que la mitad del cebador está unido a su diana." },
  { category: "Cebadores y Tm", term: "Regla de Wallace", def: "Tm ≈ 2·(A+T) + 4·(G+C). Aproximación para cebadores cortos." },
  { category: "Cebadores y Tm", term: "Nearest-neighbor", def: "Cálculo de Tm basado en la estabilidad de cada par de bases vecinas y la concentración de sales." },
  { category: "Cebadores y Tm", term: "%GC", def: "Porcentaje de G y C en la secuencia. Ideal 40–60 %; más GC eleva la Tm." },
  { category: "Cebadores y Tm", term: "ΔTm", def: "Diferencia de Tm entre los dos cebadores. Conviene que sea ≤ 5 °C." },
  { category: "Cebadores y Tm", term: "Amplicón", def: "Fragmento de ADN que se amplifica, delimitado por los dos cebadores." },
  // Tipos
  { category: "Tipos de PCR", term: "PCR estándar", def: "Tres pasos por ciclo: desnaturalización, anillamiento y extensión." },
  { category: "Tipos de PCR", term: "PCR touchdown", def: "Ta inicial alta que baja 1 °C por ciclo para ganar especificidad." },
  { category: "Tipos de PCR", term: "PCR larga", def: "Para amplicones > 5 kb: desnaturalización corta y extensión a menor temperatura." },
  { category: "Tipos de PCR", term: "RT-PCR", def: "Retrotranscripción de ARN a cDNA seguida de PCR." },
  { category: "Tipos de PCR", term: "qPCR", def: "PCR cuantitativa en tiempo real que mide fluorescencia en cada ciclo (SYBR Green o sonda TaqMan)." },
  { category: "Tipos de PCR", term: "PCR de colonia", def: "Usa una colonia bacteriana como molde; requiere desnaturalización inicial larga para lisar las células." },
  // Moldes
  { category: "Moldes", term: "Molde (template)", def: "ADN que contiene la secuencia diana a amplificar." },
  { category: "Moldes", term: "ADN genómico", def: "ADN total de un organismo; molde complejo, suele requerir 30–35 ciclos." },
  { category: "Moldes", term: "Plásmido", def: "ADN circular pequeño y abundante; bastan 0,1–1 ng y ~25 ciclos." },
  { category: "Moldes", term: "cDNA", def: "ADN complementario obtenido por retrotranscripción de ARN." },
];
