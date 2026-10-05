# Preparar las integraciones

Guía consultada el 5 de octubre de 2026. No se ha accedido a ninguna cuenta.
Guardar secretos en el servidor o su gestor de secretos, nunca en React, variables
`VITE_*`, Git ni capturas compartidas. `.env.example` no contiene credenciales.

## HubSpot

Para una sola cuenta, una app privada permite comenzar con un token y permisos
limitados. El procedimiento documentado actualmente figura como **legacy private
apps** y requiere superadministrador:

1. Entrar a la cuenta de Kinku y abrir **Development → Legacy apps**.
2. Elegir **Create legacy app → Private**; nombre sugerido: Kinku Reportes.
3. En **Scopes**, seleccionar lectura de contactos y negocios. Como propuesta
   inicial: `crm.objects.contacts.read` y `crm.objects.deals.read`. Confirmar los
   scopes exactos de cada endpoint al implementar; agregar empresas, propietarios
   u otros objetos únicamente si las métricas los requieren.
4. Crear la app y abrir **Auth → Show token → Copy**.
5. Guardar el token como `HUBSPOT_ACCESS_TOKEN` en la configuración del servidor.

La primera validación será consultar una página de contactos y negocios, revisar
propiedades, etapas y paginación. Un token aceptado no prueba la atribución por
campaña. Para varias cuentas independientes, evaluar OAuth e instalación por
cuenta antes de ampliar esta solución.

Fuente: [HubSpot: aplicaciones privadas](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview).

## Google Ads

**Cambio reciente:** Google documenta la retirada del developer token el 9 de
septiembre de 2026. El acceso ahora corresponde al proyecto de Google Cloud;
el alta ya no se tramita desde el API Center del MCC. No seguimos tutoriales
antiguos que presentan el developer token como requisito actual.

Fuente: [Google: transición del developer token](https://developers.google.com/google-ads/api/docs/api-policy/developer-token).

Pasos para una cuenta propia de Kinku:

1. Crear o seleccionar un proyecto en Google Cloud y habilitar **Google Ads API**.
2. Abrir su página **Google Ads API Overview** y revisar el nivel de acceso.
   Si indica Test, solicitar Explorer. La cuenta real requiere Explorer, Basic
   o Standard; Test solo permite cuentas de prueba.
3. Para automatización de una sola organización, seguir la ruta oficial de
   **service account**: crear una cuenta de servicio y otorgarle acceso de lectura
   en Google Ads, en **Admin → Access and security**. Se necesita un administrador
   de la cuenta publicitaria para concederlo.
4. Configurar la identidad del servidor. Si se utiliza la clave JSON del inicio
   rápido, guardarla fuera del código y referenciar su ruta mediante
   `GOOGLE_APPLICATION_CREDENTIALS`; no colocarla en `src/` ni versionarla.
5. Anotar el Customer ID de la cuenta publicitaria, de 10 dígitos sin guiones,
   como `GOOGLE_ADS_CUSTOMER_ID`. Si se accede por un administrador/MCC,
   confirmar también el contexto de `login-customer-id` al implementar.
6. Validar una consulta de campañas y comparar inversión, clics y conversiones
   de un mismo rango con Google Ads antes de dar por conectada la fuente.

Fuente: [Google Ads: inicio rápido y acceso](https://developers.google.com/google-ads/api/docs/get-started/make-first-call).

Alternativa cuando la organización no permite cuentas de servicio, o si habrá
usuarios de distintas organizaciones: OAuth de usuario. Crear el cliente OAuth,
configurar consentimiento y redirección, autorizar con una cuenta que tenga acceso
a Ads y solicitar acceso offline. El servidor conserva `client_id`, `client_secret`
y `refresh_token`; este último permite renovar el access token. Esta base no incluye
todavía el callback OAuth. No necesitas configurar ambas alternativas.

Fuente: [Google: autenticación de usuario](https://developers.google.com/google-ads/api/docs/oauth/user-authentication).

## Meta Ads

Ya tienes el acceso según lo indicado. Falta configurarlo de forma segura y
validar cuenta publicitaria, permisos de lectura/Insights, vigencia del token,
moneda y zona horaria. No se ha reutilizado ningún secreto de otros proyectos.
La integración inicial será de lectura de campañas y métricas.

## Qué significa «tiempo real»

El panel se podrá actualizar automáticamente, pero mostrará lo último publicado
por cada fuente. Google advierte que sus estadísticas no son instantáneas y que
conversiones y otras métricas tienen tiempos diferentes de procesamiento.
La pantalla deberá distinguir última sincronización y período cubierto.

Fuente: [Google Ads: frescura de datos](https://support.google.com/google-ads/answer/2544985).
