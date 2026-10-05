# Validación inicial · 2026-10-05

- `npm run build`: correcto, incluida comprobación de TypeScript.
- Panel local iniciado en `http://127.0.0.1:5173` con API en puerto 3001.
- Navegador: vista de reconocimiento y cambio mediante teclado a ventas;
  las tarjetas cambian a compras, costo por compra, valor y ROAS.
- «Actualizar ahora»: muestra solicitud en curso y luego informa que faltan
  Meta y Supabase, sin inventar fecha de sincronización ni datos.
- Contador sin programación: «Pendiente de conexión».
- Evidencia visual: `docs/evidence/panel-inicial.png`.

La compilación y el servidor requirieron ejecución fuera del aislamiento local
por restricciones de acceso del entorno. La compilación posterior fue correcta.
No se ha validado un contador con programación real, todos los objetivos contra
Meta, autenticación, Supabase, un cron ni un despliegue remoto.

# Validación rediseño TicTac (Pekín, Metriku, Skala) · 2026-10-05

- `npm test`: comprobada separación por proyecto (Pekín con Meta, Google Ads y HubSpot; Metriku y Skala con Meta y Google Ads) y rechazo con HTTP 400 a solicitudes sin proyecto o con proyecto inválido.
- `npm run build`: validación de TypeScript (`tsc --noEmit`) y empaquetado de producción Vite ejecutados correctamente sin advertencias ni errores.
- API local:
  - `GET /api/health` responde 200 `{ status: "ok", mode: "setup" }`.
  - `GET /api/overview?project=pekin` responde 200 con conexiones Meta, Google Ads y HubSpot.
  - `GET /api/overview?project=metriku` responde 200 con conexiones Meta y Google Ads (sin HubSpot).
  - `GET /api/overview?project=skala` responde 200 con conexiones Meta y Google Ads (sin HubSpot).
  - `POST /api/sync?project=pekin` responde HTTP 409 indicando correctamente que la sincronización requiere credenciales de Meta y base de datos Supabase.
- Interfaz y navegación responsiva:
  - Selector de proyectos (01 Pekín, 02 Metriku, 03 Skala) con acentos de color propios.
  - Selector de modo: Histórico (1–30 sep 2026) vs Conexiones en vivo (pendientes).
  - Pekín: vistas separadas para Resumen/Meta (Captación y Reconocimiento), Google Ads y HubSpot CRM.
  - Metriku: prioriza interacción comunitaria; vista de Google Ads avisa ausencia de datos en el reporte; sin pestaña de HubSpot.
  - Skala: comparativa entre vivienda e inversión; vista de Google Ads avisa ausencia de datos en el reporte; sin pestaña de HubSpot.
  - Adaptabilidad móvil y de escritorio con sidebar colapsable a barra superior en pantallas reducidas.
- Evidencia visual: `docs/evidence/tictac-pekin.png`.
