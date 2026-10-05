# Arquitectura propuesta

## Flujo de datos

```text
Meta Ads ─────┐
Google Ads ───┼──> conectores del servidor ──> normalización ──> PostgreSQL
HubSpot ──────┘                                  │                  │
                                          registro de sync         │
                                                                   v
                                         navegador React <── API de lectura
```

La base actual implementa únicamente navegador y API de configuración.

## Vistas previstas

1. Resumen: inversión, resultados por fuente, metas comparables y frescura.
2. Campañas: plataforma, cuenta, campaña, fechas y objetivo; detalle diario.
3. Embudo comercial: contactos y negocios de HubSpot, con etapas acordadas.
4. Metas: objetivos y presupuestos del período con fuente identificada.
5. Conexiones: último éxito, fallos y alcance de datos de cada integración.

## Actualización

Frecuencia confirmada: cada siete días, con disparo manual para pruebas.
Servir el último resultado válido desde Supabase. El refresco de la
pantalla no dispara otra consulta a proveedores; «Actualizar ahora» sí solicitará
una sincronización al implementar el conector y la autenticación.
La frecuencia de consulta no garantiza disponibilidad instantánea del dato.

Cada ejecución tendrá inicio, fin, estado por fuente, período consultado y fecha
del último éxito. Ante error, conservar datos anteriores con aviso visible;
nunca sustituir una falla por cero. Implementar paginación, backoff para 429/5xx,
timeouts, bloqueo de ejecuciones solapadas y escritura idempotente.

## Reglas de reporte

- Período inicial propuesto: día 1 del mes hasta el momento de consulta,
  con presentación en America/Bogota. Conservar también zona horaria de cada
  cuenta; un agregado diario de otra zona no se convierte con un simple cambio
  de etiqueta. Advertir desajustes o consultar una granularidad compatible.
- Consultar nuevamente el período y reemplazar sus agregados de forma
  idempotente; no sumar ejecuciones anteriores. Incorporar reprocesamiento
  de períodos previos para ajustes de atribución y conversiones tardías.
- Clave de métricas diarias: proveedor + cuenta + campaña + fecha + segmento
  cuando exista. Guardar moneda, definición de conversión y fecha de extracción.
- No sumar alcance único diario para producir alcance mensual. Consultarlo
  para el rango completo cuando la plataforma permita esa métrica.
- Separar conversiones de plataforma, contactos únicos, leads calificados y
  negocios ganados. Un lead de pauta no equivale automáticamente a uno calificado.
- No sumar conversiones de Meta y Google como personas únicas. No mezclar
  metas PMAX con resultados PMAX + Search. Mostrar «Por validar» si no equivalen.
- Preservar `null` como dato no disponible y `0` como cero medido.
- Calcular CTR, CPC y CPL desde sus numeradores y denominadores compatibles;
  no promediar porcentajes diarios. División entre cero devuelve dato ausente.
- No sumar importes de monedas diferentes. Las metas requieren período,
  fuente, unidad y alcance de campañas explícitos.

## Relación con HubSpot

Necesitamos inspeccionar propiedades reales y confirmar la definición de lead,
lead calificado y venta. Relacionar IDs de campaña capturados, UTM y asociaciones
contacto-negocio según una regla acordada. No cruzar solamente nombres parecidos.
Los contactos sin correspondencia se mostrarán como «Sin atribución».
No todos los contactos serán leads ni todos los negocios cerrados serán ventas:
el mapeo de etapas debe validarse con Kinku. Conservar historial si se reportan
transiciones de etapa; el estado actual no reconstruye un embudo histórico.

## Acceso y despliegue

Antes de publicar: login, roles y restricciones por cuenta/proyecto; cifrado de
secretos; almacenamiento mínimo de datos personales. La API de reporte debe
devolver agregados y nunca tokens. El archivo `.env.example` solo documenta los
nombres; su carga y gestión se implementarán junto con los conectores.

Vercel alojará interfaz y funciones API; Supabase aportará PostgreSQL, Auth y Cron;
GitHub guardará versiones y ejecutará CI. Publicar únicamente `dist/` no completa
esta arquitectura. Los proyectos remotos todavía no se han creado ni vinculado.
