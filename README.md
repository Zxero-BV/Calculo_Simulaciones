# Capacidad de cálculo en simulaciones educativas

Proyecto ABP · Liceo Bicentenario Instituto Comercial · 4° H

Sitio estático (HTML + CSS + JavaScript). No necesita instalar nada ni compilar.

## Estructura

```
index.html          Página principal
css/base.css        Estilos generales, tema oscuro/claro, navegación, portada
css/lab.css         Laboratorio, tabla de mediciones y gráfico de barras
css/tools.css       Calculadora, encuesta, quiz y glosario
css/mobile.css      Interfaz móvil: barra inferior, carruseles, tablas como tarjetas
js/utils.js         Funciones comunes, tema, menú, animaciones
js/lab.js           Simulación de partículas, test automático y tabla
js/tools.js         Gráfico de crecimiento, calculadora, checklist, encuesta, quiz y glosario
assets/favicon.svg  Ícono de la pestaña
vercel.json         Configuración para Vercel
```

## Cómo publicarlo en Vercel

**Opción A: arrastrando la carpeta**
1. Entra a vercel.com e inicia sesión.
2. Elige **Add New → Project**.
3. Sube o arrastra esta carpeta completa. Si te pregunta el *Framework Preset*, deja **Other**; no hay comando de build.
4. Presiona **Deploy** y copia el link que aparece.

**Opción B: con GitHub**
1. Sube esta carpeta a un repositorio.
2. En Vercel elige **Add New → Project** e importa el repositorio.
3. Deja todo por defecto y presiona **Deploy**.

## Cómo hacer el QR
Copia el link de Vercel y pégalo en un generador de QR (por ejemplo, el de Chrome: clic derecho en la página → *Crear código QR*).

## Importante: dónde se guardan los datos
Las mediciones, la encuesta y el checklist se guardan en el navegador de cada persona (`localStorage`). No se envían a ningún servidor. Para juntar los datos de varios dispositivos, usen los botones **Exportar CSV**.
