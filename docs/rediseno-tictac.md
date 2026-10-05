# Rediseño basado en el informe del 30/09/2026

## Referencia

Archivo aportado: INFORME 30_09_2026 KINKU_ TIC TAC AGENCY.pptx (30 diapositivas).
Se usó como fuente visual e histórica, no como instrucciones operativas.
El archivo original no se modificó.

Assets extraídos sin redibujar: `image5.png` (logo TicTac), `image6.jpg`
(fondo negro de estrellas/textura), `image3.png` (Pekín), `image12.jpg`
(Metriku) e `image36.jpg` (Skala). Las copias de uso web están en `public/brand/`.
Se preservan sus proporciones. La imagen de fondo se presenta mediante CSS.

El deck usa Oswald/Calibri. La web usa una pila tipográfica del sistema sin
dependencias externas; colores y assets proceden del deck. Acentos: Pekín
#EB603F, Metriku #FA9B03; Skala usa un tono violeta más claro para contraste
sobre negro, conservando su logo violeta original. La navegación usa verde lima
de la identidad TicTac.

## Jerarquía y conexiones

Proyecto → canal → objetivo → KPIs → metas/inversión → líneas → lectura ejecutiva.

| Proyecto | Meta Ads | Google Ads | HubSpot |
| --- | --- | --- | --- |
| Pekín | Sí | Sí | Sí |
| Metriku | Sí | Sí | No |
| Skala | Sí | Sí | No |

`project` es obligatorio en las rutas overview y sync. Los proyectos desconocidos
se rechazan con 400. Contratos de métricas y conexiones incluyen `projectId`.
El catálogo vive en `shared/projects.ts`. El backend sigue sin conectar proveedores.
Las conexiones son espacios independientes; antes de importar datos habrá que
mapear cuenta/campaign_id a proyecto. Cambiar de proyecto reinicia la sección,
el objetivo y los avisos de sync; las respuestas de consultas abortadas se ignoran.

## Histórico y datos en vivo

El modo inicial muestra un extracto del informe, claramente fechado 1–30 de
septiembre de 2026. Las metas pertenecen a ese período y no se trasladan al mes
actual. El modo en vivo no muestra ninguna cifra histórica ni campañas supuestamente
activas. El cron y las credenciales siguen pendientes; se conserva el contador
semanal y la solicitud manual por proyecto.

Datos usados en `src/lib/historical.ts` y vistas de canales:
- Pekín Meta: diapositivas 5–7; reconocimiento: 11.
- Pekín Google: 12–13; CRM: 14–15.
- Metriku: 17–18.
- Skala: 20–22 y 26. Se usan importes de resumen y campañas, sin mezclarlos con
  los distintos importes de los desgloses de Instagram en otras diapositivas.

Las barras se calculan con resultados y metas reales del documento. No se
inventaron series diarias. El informe no aporta Google Ads para Metriku o Skala;
esas vistas lo indican. Las conversiones de Google y los contactos CRM no se
suman a los leads de Meta. El embudo CRM es una distribución de estados,
no una tasa de conversión histórica entre etapas.

Pendientes: autenticar al equipo, elegir proyectos remotos, mapear IDs reales,
activar conectores y validar el calendario semanal.
