import type { CampaignMetrics, MetaBreakdown } from '../../shared/contracts';
import { money, number } from '../lib/historical';

function unit(campaign: CampaignMetrics): string {
  if (campaign.lineName === 'RECONOCIMIENTO') return 'impresiones';
  if (campaign.lineName === 'INTERACCIÓN') return 'interacciones';
  return 'leads';
}

function result(campaign: CampaignMetrics, item: MetaBreakdown): number {
  if (campaign.lineName === 'RECONOCIMIENTO') return item.impressions;
  if (campaign.lineName === 'INTERACCIÓN') return item.engagement;
  return item.leads;
}

function campaignResult(campaign: CampaignMetrics): number | null {
  if (campaign.lineName === 'RECONOCIMIENTO') return campaign.impressions;
  if (campaign.lineName === 'INTERACCIÓN') return campaign.engagement ?? null;
  return campaign.platformConversions;
}

export function MetaDetails({ campaigns, month }: { campaigns: CampaignMetrics[]; month: string }) {
  const meta = campaigns.filter(campaign => campaign.provider === 'meta');
  const platforms = meta.flatMap(campaign => (campaign.platformBreakdown || []).map(item => ({ campaign, item })));
  const demographics = meta.flatMap(campaign => (campaign.demographics || []).map(item => ({ campaign, item })));
  const creatives = meta.flatMap(campaign => (campaign.creatives || []).map(item => ({ campaign, item })));
  const daily = meta.flatMap(campaign => (campaign.daily || []).map(item => ({ campaign, item })));

  return <section className="meta-details" aria-label="Detalle de Meta Ads">
    <div className="dashboard-heading"><div><p className="eyebrow">META ADS / DATOS DE LA API</p><h2>Alcance, audiencias y creativos</h2></div></div>
    <section className="panel table-panel">
      <div className="panel-heading"><h3>Campañas · resultados, alcance y eficiencia</h3><span className="mini-tag">{month}</span></div>
      <div className="table-scroll"><table><thead><tr><th>Campaña</th><th>Línea</th><th>Resultado</th><th>Inversión</th><th>Costo / resultado</th><th>Impresiones</th><th>Alcance</th><th>Frecuencia</th><th>Clics</th><th>CTR</th></tr></thead>
        <tbody>{meta.length ? meta.map(campaign => {
          const value = campaignResult(campaign);
          const ctr = campaign.impressions ? (Number(campaign.clicks || 0) / campaign.impressions) * 100 : null;
          return <tr key={campaign.campaignId}><td>{campaign.campaignName}<small className="campaign-status">{campaign.status || 'Estado sin verificar'} · corte {campaign.date || 'sin fecha'}</small></td><td>{campaign.lineName || 'GENERAL'}</td><td>{number(value)} <small>{unit(campaign)}</small></td><td>{money(campaign.spend)}</td><td>{value && campaign.spend != null ? money(campaign.spend / value) : '—'}</td><td>{number(campaign.impressions)}</td><td>{number(campaign.reach)}</td><td>{campaign.frequency == null ? '—' : number(campaign.frequency)}</td><td>{number(campaign.clicks)}</td><td>{ctr == null ? '—' : `${number(ctr)}%`}</td></tr>;
        }) : <tr><td colSpan={10}>Sin métricas de campañas Meta para este período.</td></tr>}</tbody>
      </table></div>
      <p className="table-note">El alcance y la frecuencia pertenecen a cada campaña. No se suman alcances entre campañas porque las audiencias pueden coincidir.</p>
    </section>

    <section className="panel table-panel">
      <div className="panel-heading"><h3>Resultados por plataforma</h3><span className="mini-tag">FACEBOOK / INSTAGRAM</span></div>
      <div className="table-scroll"><table><thead><tr><th>Campaña</th><th>Plataforma</th><th>Resultado</th><th>Inversión</th><th>Costo / resultado</th><th>Impresiones</th><th>Alcance</th></tr></thead><tbody>
        {platforms.length ? platforms.map(({ campaign, item }) => {
          const value = result(campaign, item);
          return <tr key={`${campaign.campaignId}:${item.label}`}><td>{campaign.campaignName}</td><td>{item.label}</td><td>{number(value)} <small>{unit(campaign)}</small></td><td>{money(item.spend)}</td><td>{value ? money(item.spend / value) : '—'}</td><td>{number(item.impressions)}</td><td>{number(item.reach)}</td></tr>;
        }) : <tr><td colSpan={7}>Desglose por plataforma pendiente de la próxima sincronización de Meta.</td></tr>}
      </tbody></table></div>
      <p className="table-note">Cada fila corresponde a una campaña y plataforma. El alcance no representa personas únicas entre filas.</p>
    </section>

    {meta.some(campaign => campaign.reactions != null || campaign.saves != null || campaign.videoViews != null) &&
      <section className="panel table-panel"><div className="panel-heading"><h3>Detalle de interacción</h3><span className="mini-tag">DESGLOSE · NO SUMAR</span></div>
        <div className="table-scroll"><table><thead><tr><th>Campaña</th><th>Interacciones</th><th>Reacciones</th><th>Guardados</th><th>Reproducciones</th></tr></thead><tbody>
          {meta.filter(campaign => campaign.engagement !== null && campaign.engagement !== undefined).map(campaign => <tr key={campaign.campaignId}><td>{campaign.campaignName}</td><td>{number(campaign.engagement)}</td><td>{number(campaign.reactions)}</td><td>{number(campaign.saves)}</td><td>{number(campaign.videoViews)}</td></tr>)}
        </tbody></table></div><p className="table-note">Reacciones, guardados y reproducciones son desgloses de actividad; no se agregan al total de interacciones.</p>
      </section>}

    <details className="panel meta-expand"><summary>Edad y sexo <span>{demographics.length ? `${demographics.length} segmentos` : 'Pendiente de sincronización'}</span></summary>
      <div className="table-scroll"><table><thead><tr><th>Campaña</th><th>Segmento</th><th>Resultado</th><th>Impresiones</th><th>Alcance</th></tr></thead><tbody>{demographics.length ? demographics.map(({ campaign, item }) => <tr key={`${campaign.campaignId}:${item.label}`}><td>{campaign.campaignName}</td><td>{item.label}</td><td>{number(result(campaign, item))} <small>{unit(campaign)}</small></td><td>{number(item.impressions)}</td><td>{number(item.reach)}</td></tr>) : <tr><td colSpan={5}>Meta todavía no ha entregado este desglose para el período.</td></tr>}</tbody></table></div>
    </details>

    <details className="panel meta-expand"><summary>Creativos y anuncios <span>{creatives.length ? `${creatives.length} anuncios` : 'Pendiente de sincronización'}</span></summary>
      <div className="table-scroll"><table><thead><tr><th>Campaña</th><th>Anuncio</th><th>Resultado</th><th>Inversión</th><th>Costo / resultado</th><th>Alcance</th></tr></thead><tbody>{creatives.length ? creatives.map(({ campaign, item }) => {
        const value = result(campaign, item);
        return <tr key={`${campaign.campaignId}:${item.id}`}><td>{campaign.campaignName}</td><td>{item.label}</td><td>{number(value)} <small>{unit(campaign)}</small></td><td>{money(item.spend)}</td><td>{value ? money(item.spend / value) : '—'}</td><td>{number(item.reach)}</td></tr>;
      }) : <tr><td colSpan={6}>Anuncios pendientes de la próxima sincronización de Meta.</td></tr>}</tbody></table></div>
    </details>

    <details className="panel meta-expand"><summary>Tendencia diaria <span>{daily.length ? `${daily.length} registros` : 'Pendiente de sincronización'}</span></summary>
      <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Campaña</th><th>Resultado</th><th>Inversión</th><th>Impresiones</th></tr></thead><tbody>{daily.length ? daily.map(({ campaign, item }) => <tr key={`${campaign.campaignId}:${item.date}`}><td>{item.date}</td><td>{campaign.campaignName}</td><td>{number(campaign.lineName === 'RECONOCIMIENTO' ? item.impressions : campaign.lineName === 'INTERACCIÓN' ? item.engagement : item.leads)} <small>{unit(campaign)}</small></td><td>{money(item.spend)}</td><td>{number(item.impressions)}</td></tr>) : <tr><td colSpan={5}>Tendencia pendiente de la próxima sincronización de Meta.</td></tr>}</tbody></table></div>
    </details>
  </section>;
}
