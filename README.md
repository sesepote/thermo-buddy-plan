<div align="center">

# 🧬 SIM-PCR

### Simulador educativo de termociclador para el laboratorio de Biología Molecular

*Aprende PCR tocando: programa el termociclador, calcula tu Master Mix y ponte a prueba con ejercicios reales.*

![Estado](https://img.shields.io/badge/estado-activo-brightgreen)
![Offline](https://img.shields.io/badge/PWA-funciona%20sin%20conexión-blue)
![Idiomas](https://img.shields.io/badge/idiomas-ES%20%7C%20EN-orange)
![Táctil](https://img.shields.io/badge/kiosco-táctil-purple)

</div>

---

## ✨ ¿Qué es SIM-PCR?

SIM-PCR es una aplicación web pensada para **aulas y laboratorios docentes**. Reproduce la pantalla de un termociclador real, ayuda a calcular las mezclas de reacción y propone ejercicios prácticos con corrección automática… y una científica que reacciona a tus resultados 👩‍🔬.

Funciona en ordenador, tablet, móvil y **pantallas táctiles tipo quiosco**, incluso **sin conexión a Internet**.

---

## 🧭 Pantallas principales

| | Pantalla | Para qué sirve |
|:-:|---|---|
| 🌡️ | **Termociclador** | Pantalla inspirada en equipos reales (modo chasis). Programa etapas, bucles y temperaturas y observa la simulación ciclo a ciclo, con velocidad ×1, ×5, ×20 o ×60. |
| 🧮 | **Calculadora** | Calcula la Tm de los cebadores, genera protocolos y prepara el Master Mix según la polimerasa, el tampón (5×, 10×, 20×…) y el número de reacciones. |
| 🎯 | **Entrenamiento** | Ejercicios basados en casos reales: rellena el tubo reactivo a reactivo, programa el termociclador y verifica tu respuesta. |
| 📖 | **Glosario** | Más de 140 términos de PCR y biología molecular con buscador. |

---

## 🧪 Cómo funciona un ejercicio

```text
  📝 Enunciado  ──►  🧫 Tubo de mezcla  ──►  🌡️ Programa  ──►  ✅ Verificar
                    (volúmenes a mano)     (etapas y ciclos)
```

Al verificar, la científica agita el tubo y reacciona según tu puntuación:

| Puntuación | Reacción |
|:-:|---|
| **100** | 🌟 ¡Brilla! Resultado perfecto |
| **80 – 99** | 🤨 Cara de extrañeza |
| **50 – 79** | ☠️ Vapores tóxicos |
| **< 50** | 💥 ¡Explosión! (y la cara tiznada) |

El tubo se dibuja en capas de colores con la proporción de cada reactivo, con distintos tamaños estándar (0,1 · 0,2 · 0,5 · 1,5 mL…).

---

## 👩‍🏫 Modo Docente

- Acceso con **usuario y contraseña** (las contraseñas se guardan cifradas).
- Crear, **editar, clonar y borrar** ejercicios y perfiles del termociclador.
- Cada docente puede **cambiar su propia contraseña**.
- La sesión se cierra manualmente o sola tras unos minutos de inactividad, para que el alumnado nunca vea los controles de edición.

---

## 🌍 Más características

- 🌙 Tema oscuro por defecto y tema claro.
- 🇪🇸 / 🇬🇧 Español e inglés.
- 🔢 Teclado numérico en pantalla, pensado para el dedo.
- 🔇 Botón de silencio para las animaciones.
- 📶 Instalable como app y utilizable sin conexión.

---

## 📁 Estructura del repositorio

```text
SIM-PCR/
├── ejercicios/   → un archivo por ejercicio
├── perfiles/     → programas guardados del termociclador
├── docentes/     → cuentas del profesorado (contraseñas cifradas)
└── src/          → código de la aplicación
    ├── lib/pcr/  → motor de cálculo y simulación PCR
    ├── components/
    └── routes/   → pantallas
```

---

## 🚀 Ejecutar en local

```bash
bun install
bun run dev
```

Abre `http://localhost:8080` en el navegador.

### Publicación

El proyecto se despliega en **Cloudflare Pages** conectado a este repositorio. Para que el Modo Docente pueda guardar cambios en producción, configura la variable `GITHUB_TOKEN` (y opcionalmente `GITHUB_REPO`, por defecto `sesepote/SIM-PCR`).

---

<div align="center">

Hecho con 💙 para el aprendizaje de la PCR

</div>
