# Kinku · Reportes

## Rediseño TicTac y proyectos

La interfaz actual sigue el informe del 30/09/2026: fondo negro de estrellas,
logo TicTac original, tres espacios (Pekín, Metriku y Skala), KPIs, metas,
inversión y lectura ejecutiva. Meta/Google por proyecto y HubSpot solo en Pekín.
El selector distingue histórico de septiembre de datos en vivo pendientes.
Ver [rediseño y procedencia de cifras](docs/rediseno-tictac.md).

`npm test` comprueba la separación de conexiones en la API. `npm run build`
comprueba tipos y compila. Las secciones siguientes describen la base original;
el rediseño sustituye la vista previa genérica por vistas de cada proyecto.

Base inicial para el equipo interno de Kinku. Primera fase: campañas activas de
Meta Ads con dashboards por objetivo. Google Ads y HubSpot vendrán después.

## Estado real

Interfaz inicial y API local disponibles. Las tres conexiones están pendientes:
no hay credenciales cargadas, campañas importadas, base de datos, login ni sincronización automática.
El diseño es provisional; aún no se ha recibido el manual de marca.

## Decisión técnica

React + TypeScript + Vite para la interfaz; CSS propio y HTML semántico.
Node.js + TypeScript para el servidor. React no es obligatorio, pero simplifica
filtros compartidos, tablas, estados de carga y vistas por campaña. TypeScript
ayuda a distinguir métricas, fuentes y datos ausentes. JavaScript sin framework
serviría para un reporte estático; este proyecto busca un panel que crezca.

El navegador consulta nuestra API. Solo el servidor consultará proveedores
y almacenará credenciales. Stack acordado: Vercel para interfaz y API, GitHub
para versiones y Supabase para PostgreSQL, Auth y sincronización programada.
No hace falta migrar a Next.js para esta primera versión.

## Iniciar localmente

Requiere Node.js 22.12+ (validación inicial con Node 24).

```powershell
npm.cmd install
npm.cmd run dev
```

Abrir http://127.0.0.1:5173. El servidor usa 127.0.0.1:3001.
`npm.cmd run build` comprueba tipos y compila la interfaz a `dist/`.
`npm.cmd run preview` solo previsualiza la interfaz compilada; para datos requiere
un servidor y proxy `/api` configurados. No es un comando de despliegue completo.

## Archivos

```text
src/                        Interfaz
  App.tsx                   Vista inicial y estados de conexión
  styles.css                Estilos adaptables
  lib/api.ts                Consultas a nuestra API
server/                     Backend local
  index.ts                  GET /api/health y GET /api/overview
  integrations/index.ts     Registro de fuentes todavía sin conectar
shared/contracts.ts         Tipos compartidos de datos
shared/metaObjectives.ts    Catálogo de dashboards según objetivo de Meta
src/components/             Contador, actualización manual y vistas por objetivo
api/                        Entradas de las funciones de Vercel
vercel.json                 Configuración de compilación y alojamiento
.github/workflows/ci.yml    Comprobación de tipos y build en GitHub
docs/
  arquitectura.md           Flujo de datos y reglas de métricas
  integraciones.md          Accesos de HubSpot, Google Ads y Meta
  siguientes-pasos.md       Alcance y decisiones pendientes
.env.example                Nombres de variables, sin secretos
```

Al implementar integraciones se agregarán `server/integrations/meta/`,
`google-ads/`, `hubspot/`, `server/jobs/` para sincronización y `server/db/`
para persistencia. No hay adaptadores ficticios que se reporten como conectados.

Ver [arquitectura](docs/arquitectura.md), [guía de APIs](docs/integraciones.md)
y [siguientes pasos](docs/siguientes-pasos.md).

## Actualización acordada

Cada siete días, con contador arriba y botón «Actualizar ahora» para pruebas.
En esta base el contador espera una fecha persistida del servidor y el botón
consulta `/api/sync`, que devuelve explícitamente conexión pendiente (HTTP 409).
Todavía no extrae datos ni programa trabajos. Las seis vistas son plantillas
seleccionables; no representan campañas activas comprobadas.

Ver [alcance Meta y despliegue](docs/meta-y-despliegue.md).
