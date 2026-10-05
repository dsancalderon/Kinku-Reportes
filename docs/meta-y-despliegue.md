# Primera fase: Meta por objetivo

## Dashboards

El catálogo en `shared/metaObjectives.ts` contiene seis plantillas. El conector
debe leer `objective` de la campaña y `optimization_goal`/destino de sus conjuntos.
Solo se habilitarán dashboards correspondientes a campañas activas de las cuentas
autorizadas. Una campaña ACTIVE no garantiza entrega: mostrar aparte si no tiene
anuncios entregando o inversión en el período. Definir actividad por el estado
efectivo consultado, no por la presencia de resultados históricos.

| Objetivo | Lectura prioritaria |
| --- | --- |
| Reconocimiento | Alcance del período, impresiones, frecuencia, CPM |
| Tráfico | Clics en enlace, CPC/CTR de enlace; visitas de destino cuando aplique |
| Interacción | Interacciones, reproducciones o conversaciones según optimización |
| Clientes potenciales | Evento de lead correspondiente y CPL por destino |
| Ventas | Compras, costo por compra, valor y ROAS cuando existan esos eventos |
| Promoción de app | Instalaciones/CPI o evento de aplicación optimizado |

Todos incluyen inversión y evolución temporal cuando haya datos. No mezclar
resultados de diferentes eventos dentro de una tarjeta agregada. Objetivos
antiguos o desconocidos van a «Por validar» hasta definir equivalencia.
Las plantillas actuales son una vista de la estructura, sin gráficos simulados.

Los identificadores actuales están respaldados por el
[SDK oficial de Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/campaign.py).
La elección de indicadores es una propuesta de reporting que se validará contra
la configuración real, los campos disponibles y la atribución de cada campaña.

## Sincronización y contador

Diseño para implementar al conectar las cuentas:

- Guardar `last_successful_at`, `next_scheduled_at` y ejecuciones en Supabase.
- Anclar la programación a la primera sincronización exitosa. Cada vencimiento
  se mueve siete días; un disparo manual exitoso actualiza los datos sin mover
  el calendario automático. El último éxito se conserva si una ejecución falla.
- Supabase Cron comprobará periódicamente trabajos vencidos y solicitará el
  mismo proceso de sync que usa el botón manual. No usar `*/7` en día del mes:
  esa expresión no mantiene intervalos de siete días al cambiar de mes.
- Reclamar el trabajo de manera atómica para evitar duplicados manual/cron;
  reintentar con backoff, conservar datos anteriores y mostrar retrasos.
- El contador deriva de `next_scheduled_at` persistido. Recargar la página no lo
  reinicia. Al vencer muestra «Actualización pendiente», nunca éxito automático.
- La frecuencia de actualización es independiente del rango del reporte;
  el mes acumulado es la propuesta inicial, pendiente de confirmación.

Referencia: [Supabase Cron](https://supabase.com/docs/guides/cron).
**No hay un cron creado ni conectado en esta entrega.**

## Distribución del sistema

| Herramienta | Responsabilidad |
| --- | --- |
| GitHub | Repositorio privado sugerido, cambios y CI |
| Vercel | React compilado + funciones `api/` |
| Supabase | PostgreSQL, Auth para el equipo, RLS, calendario y registro de sync |

Tablas propuestas: `team_members`, `ad_accounts`, `campaigns`,
`campaign_daily_metrics`, `campaign_period_metrics` (alcance/frecuencia),
`sync_schedules` y `sync_runs`. Esquema y migraciones se implementarán tras
seleccionar el proyecto; no se han aplicado cambios a ninguna base de datos.

El backend validará la sesión y pertenencia al equipo antes de devolver métricas
o sincronizar. RLS limitará lectura a miembros autorizados; escrituras de métricas
solo desde el proceso de sync. Secretos de Meta y clave privilegiada de Supabase
permanecen en servidor/Vault. El endpoint actual no tiene datos privados y solo
devuelve configuración pendiente; requiere auth antes de activar el conector.

El trabajo programado necesita autenticación de servidor; no debe quedar un
endpoint público que cualquiera pueda ejecutar. Si el volumen supera el tiempo
de una función, usar trabajos paginados/checkpoints y un ejecutor duradero.

## Publicación pendiente

1. Seleccionar/crear repositorio privado de GitHub y proyecto Supabase de Kinku.
2. Configurar Auth del equipo, tablas/políticas y secretos en sus almacenes.
3. Implementar y verificar un conector de Meta en lectura.
4. Importar el repositorio en Vercel como Vite; `vercel.json` ya define el build.
5. Configurar variables del servidor en Vercel y activar el calendario en Supabase.
6. Verificar API, login, comparación contra Meta y ejecución manual/programada.

Referencia: [Vercel Functions para Node](https://vercel.com/docs/functions/runtimes/node-js).
La compilación local no verifica el despliegue remoto, la base de datos ni el cron.
