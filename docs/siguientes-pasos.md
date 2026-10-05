# Alcance de la primera entrega

## Preparado

- Estructura React, TypeScript, CSS y servidor Node.
- Interfaz local sin métricas ficticias; estados de carga y error.
- Contrato inicial de métricas y separación por fuente.
- Guías de accesos, arquitectura y reglas de reporte.

## Decisiones confirmadas

- Uso exclusivo del equipo interno.
- Meta primero: campañas activas y dashboards según objetivo y optimización.
- Actualización cada siete días, contador superior y actualización manual.
- Vercel, GitHub y Supabase.

## Por definir con Kinku

- Miembros del equipo que tendrán acceso.
- Métricas iniciales y definición de lead, calificación, oportunidad y venta.
- Cuenta y campañas incluidas; propiedades de HubSpot para atribución.
- Fuente vigente de metas y presupuestos; no reutilizar metas históricas.
- Identidad visual, dominio y proyectos/cuentas remotas que se vincularán.

## Implementación siguiente

1. Confirmar alcance y accesos; comprobar cuentas y permisos con lecturas reales.
2. Implementar un conector de Meta y validar una campaña contra su plataforma.
3. Incorporar Supabase Auth, acceso del equipo y almacenamiento con RLS.
4. Implementar vistas por objetivo, sincronización semanal y actualización manual.
5. Construir filtros, tablas, gráficos, metas y estados de datos desactualizados.
6. Validar extremo a extremo y desplegar mediante GitHub y Vercel.
7. En una fase posterior, agregar Google Ads y HubSpot con validación equivalente.

Una respuesta HTTP correcta de la API local solo verifica la estructura;
no constituye prueba de conexión a Meta, Google Ads ni HubSpot.
