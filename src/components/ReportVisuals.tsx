import { useState } from 'react';
import type { CampaignMetrics, Overview, ReportView, MetaBreakdown } from '../../shared/contracts';
import { dailyChartData, projectChartData } from '../lib/chartData';
import { money, number } from '../lib/historical';

function PercentBars({ rows, unit, currency = false }: { rows: { label: string; actual: number | null; target: number | null }[]; unit: string; currency?: boolean }) {
  const format = currency ? money : number;
  return <div className="viz-bars">{rows.map(row => {
    const pct = row.actual !== null && row.target !== null && row.target > 0 ? row.actual / row.target * 100 : null;
    return <div className="viz-bar-row" key={row.label}>
      <div className="viz-bar-label"><strong>{row.label}</strong><span>{row.actual === null ? `Sin datos / meta ${row.target === null ? 'sin definir' : `${format(row.target)} ${unit}`}` : `${format(row.actual)} / ${row.target === null ? 'sin meta' : format(row.target)} ${unit}`}</span></div>
      <div className="viz-track" role="img" aria-label={`${row.label}: ${pct === null ? 'sin porcentaje verificable' : `${number(pct)}% de ${unit}`}`}><i style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} /></div>
      <small>{pct === null ? '—' : `${number(pct)}%`}</small>
    </div>;
  })}</div>;
}

export function ConsolidatedVisuals({ overviews }: { overviews: Overview[] }) {
  const rows = projectChartData(overviews);
  if (!rows.length) return null;
  return <section className="viz-section" aria-label="Comparativo gráfico de proyectos">
    <div className="dashboard-heading"><div><p className="eyebrow">LECTURA VISUAL / META ADS</p><h2>Resultados por proyecto</h2></div></div>
    <div className="viz-grid">
      <article className="panel viz-card"><div className="panel-heading"><h3>Leads frente a la meta</h3><span className="mini-tag">LEADS</span></div><PercentBars rows={rows.map(row => ({ label: row.name, actual: row.leads, target: row.leadTarget }))} unit="leads" /><p className="table-note">Solo leads de Meta. Cada barra representa la proporción de la meta mensual.</p></article>
      <article className="panel viz-card"><div className="panel-heading"><h3>Inversión frente al presupuesto</h3><span className="mini-tag">COP</span></div><PercentBars rows={rows.map(row => ({ label: row.name, actual: row.spend, target: row.budget }))} unit="COP" currency /><p className="table-note">Solo inversión de Meta. La barra al 100% indica presupuesto ejecutado, no cumplimiento de resultados.</p></article>
    </div>
  </section>;
}

export function DailyVisual({ report, campaigns }: { report: ReportView; campaigns: CampaignMetrics[] }) {
  const days = dailyChartData(report, campaigns);
  const max = Math.max(1, ...days.map(day => day.cumulative));
  const points = days.map((day, index) => `${days.length === 1 ? 50 : 5 + index / (days.length - 1) * 90},${88 - day.cumulative / max * 76}`).join(' ');
  return <section className="panel viz-daily" aria-label={`Evolución diaria de ${report.unit}`}>
    <div className="panel-heading"><h3>Evolución diaria · {report.label.toLowerCase()}</h3><span className="mini-tag">{report.unit.toUpperCase()}</span></div>
    {days.length ? <>
      <div className="viz-daily-summary"><strong>{number(days.at(-1)!.cumulative)}</strong><span>{report.unit} acumuladas · {days.at(-1)!.date}</span></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Tendencia acumulada de ${report.unit} desde ${days[0].date} hasta ${days.at(-1)!.date}`}><line x1="0" x2="100" y1="88" y2="88" className="viz-axis"/><line x1="0" x2="100" y1="50" y2="50" className="viz-gridline"/><polyline points={points} className="viz-line"/>{days.map((day, index) => <circle key={day.date} cx={days.length === 1 ? 50 : 5 + index / (days.length - 1) * 90} cy={88 - day.cumulative / max * 76} r="1.25" className="viz-point"><title>{day.date}: {number(day.value)} {report.unit}; acumulado {number(day.cumulative)}</title></circle>)}</svg>
      <div className="viz-dates"><span>{days[0].date}</span><span>{days.at(-1)!.date}</span></div>
      <p className="table-note">Acumulado de las campañas de esta línea con desglose diario disponible en Meta.</p>
    </> : <p className="subtle viz-empty">Meta aún no entregó datos diarios para esta línea.</p>}
  </section>;
}

function breakdownValue(campaign: CampaignMetrics, item: MetaBreakdown) {
  return campaign.lineName === 'RECONOCIMIENTO' ? item.impressions : campaign.lineName === 'INTERACCIÓN' ? item.engagement : item.leads;
}

export function BreakdownVisuals({ campaigns }: { campaigns: CampaignMetrics[] }) {
  const candidates = campaigns.filter(campaign => campaign.provider === 'meta' && (campaign.platformBreakdown?.length || campaign.creatives?.length || campaign.demographics?.length));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!candidates.length) return null;
  const leadCampaign = candidates.find(campaign => campaign.campaignId === selectedId) || candidates.find(campaign => !['RECONOCIMIENTO', 'INTERACCIÓN'].includes(campaign.lineName || '')) || candidates[0];
  const unit = leadCampaign.lineName === 'RECONOCIMIENTO' ? 'impresiones' : leadCampaign.lineName === 'INTERACCIÓN' ? 'interacciones' : 'leads';
  const platforms = (leadCampaign.platformBreakdown || []).map(item => ({ label: item.label, value: breakdownValue(leadCampaign, item) }));
  const creatives = (leadCampaign.creatives || []).map(item => ({ label: item.label, value: breakdownValue(leadCampaign, item) })).sort((a, b) => b.value - a.value).slice(0, 5);
  const demographics = (leadCampaign.demographics || []).map(item => ({ label: item.label, value: breakdownValue(leadCampaign, item) })).sort((a, b) => b.value - a.value).slice(0, 6);
  return <section className="viz-section" aria-label="Desgloses gráficos de Meta Ads">
    <div className="dashboard-heading"><div><p className="eyebrow">DESGLOSE / CAMPAÑA</p><h2>Dónde se generan los resultados</h2><p className="subtle viz-campaign-name">{leadCampaign.campaignName} · {unit}</p></div><label className="viz-picker">Campaña<select aria-label="Campaña para los gráficos de desglose" value={leadCampaign.campaignId} onChange={event => setSelectedId(event.target.value)}>{candidates.map(campaign => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.campaignName}</option>)}</select></label></div>
    <div className="viz-grid">
      <RankedBars title="Resultados por plataforma" rows={platforms} unit={unit} empty="Sin desglose por plataforma" />
      <RankedBars title="Creativos destacados" rows={creatives} unit={unit} empty="Sin desglose por anuncio" />
      <RankedBars title="Audiencia por edad y sexo" rows={demographics} unit={unit} empty="Sin desglose de audiencia" />
    </div>
    <p className="table-note">Los gráficos muestran una sola campaña para evitar mezclar impresiones, interacciones y leads. El detalle de todas las campañas sigue en las tablas.</p>
  </section>;
}

export function GoogleVisuals({ campaigns }: { campaigns: CampaignMetrics[] }) {
  if (!campaigns.length) return null;
  const conversions = campaigns.map(campaign => ({ label: campaign.campaignName, value: campaign.platformConversions || 0 }));
  const spend = campaigns.map(campaign => ({ label: campaign.campaignName, value: campaign.spend || 0 }));
  return <section className="viz-section" aria-label="Comparativo gráfico de Google Ads"><div className="dashboard-heading"><div><p className="eyebrow">GOOGLE ADS / CAMPAÑAS</p><h2>Comparativo de rendimiento</h2></div></div><div className="viz-grid"><RankedBars title="Conversiones por campaña" rows={conversions} unit="conversiones" empty="Sin conversiones"/><RankedBars title="Inversión por campaña" rows={spend} unit="COP" empty="Sin inversión" currency/></div><p className="table-note">Conversiones e inversión se muestran en gráficos separados. Las conversiones son las acciones reportadas por Google Ads.</p></section>;
}

function RankedBars({ title, rows, unit, empty, currency = false }: { title: string; rows: { label: string; value: number }[]; unit: string; empty: string; currency?: boolean }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <article className="panel viz-card"><div className="panel-heading"><h3>{title}</h3><span className="mini-tag">{unit.toUpperCase()}</span></div>
    {rows.length ? <div className="viz-ranked">{rows.map((row, index) => <div key={`${row.label}-${index}`} className="viz-ranked-row"><div><span title={row.label}>{row.label}</span><strong>{currency ? money(row.value) : number(row.value)}</strong></div><div className="viz-track"><i style={{ width: `${row.value / max * 100}%` }} /></div></div>)}</div> : <p className="subtle viz-empty">{empty}</p>}
  </article>;
}
