import { useEffect, useState } from 'react';
import type { CampaignMetrics, Overview, ReportView, MetaBreakdown } from '../../shared/contracts';
import type { ProjectId } from '../../shared/projects';
import { dailyChartData, demographicChartData, projectChartData } from '../lib/chartData';
import { getCreativePreviews } from '../lib/api';
import { meetsMonthlyPace, monthlyPace } from '../lib/pace';
import { money, number } from '../lib/historical';

function PercentBars({ rows, unit, currency = false, month }: { rows: { label: string; actual: number | null; target: number | null }[]; unit: string; currency?: boolean; month?: string }) {
  const format = currency ? money : number;
  return <div className="viz-bars">{rows.map(row => {
    const pct = row.actual !== null && row.target !== null && row.target > 0 ? row.actual / row.target * 100 : null;
    const onPace = month ? meetsMonthlyPace(row.actual, row.target, month) : null;
    return <div className="viz-bar-row" key={row.label}>
      <div className="viz-bar-label"><strong>{row.label}</strong><span>{row.actual === null ? `Sin datos / meta ${row.target === null ? 'sin definir' : `${format(row.target)} ${unit}`}` : `${format(row.actual)} / ${row.target === null ? 'sin meta' : format(row.target)} ${unit}`}</span></div>
      <div className="viz-track" role="img" aria-label={`${row.label}: ${pct === null ? 'sin porcentaje verificable' : `${number(pct)}% de ${unit}${onPace === null ? '' : onPace ? ', al ritmo esperado' : ', debajo del ritmo esperado'}`}`}><i className={month ? onPace === null ? '' : onPace ? 'on-track' : 'behind' : 'neutral'} style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} /></div>
      <small className={onPace === null ? '' : onPace ? 'on-track' : 'behind'}>{pct === null ? '—' : `${number(pct)}%`}</small>
    </div>;
  })}</div>;
}

export function ConsolidatedVisuals({ overviews, month }: { overviews: Overview[]; month: string }) {
  const rows = projectChartData(overviews);
  const pace = monthlyPace(month);
  if (!rows.length) return null;
  return <section className="viz-section" aria-label="Comparativo gráfico de proyectos">
    <div className="dashboard-heading"><div><p className="eyebrow">LECTURA VISUAL / META ADS</p><h2>Resultados por proyecto</h2></div></div>
    <div className="viz-grid">
      <article className="panel viz-card"><div className="panel-heading"><h3>Leads frente a la meta</h3><span className="mini-tag">LEADS</span></div><PercentBars rows={rows.map(row => ({ label: row.name, actual: row.leads, target: row.leadTarget }))} unit="leads" month={month} /><p className="table-note">Solo leads de Meta. Verde al alcanzar el ritmo esperado ({number(pace.percent)}% al día {pace.day}); coral por debajo.</p></article>
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

type CreativePreview = { imageUrl: string | null; thumbnailUrl: string | null; previewUrl?: string };

export function BreakdownVisuals({ campaigns, month, projectId }: { campaigns: CampaignMetrics[]; month: string; projectId: ProjectId }) {
  const candidates = campaigns.filter(campaign => campaign.provider === 'meta' && (campaign.platformBreakdown?.length || campaign.creatives?.length || campaign.demographics?.length));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, CreativePreview>>({});
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    setPreviews({});
    if (!campaigns.some(campaign => campaign.provider === 'meta' && campaign.creatives?.length)) return;
    const controller = new AbortController();
    setPreviewStatus('loading');
    getCreativePreviews(projectId, month, controller.signal)
      .then(images => { if (!controller.signal.aborted) { setPreviews(images); setPreviewStatus('loaded'); } })
      .catch(() => { if (!controller.signal.aborted) setPreviewStatus('error'); });
    return () => controller.abort();
  }, [campaigns, month, projectId]);
  if (!candidates.length) return null;
  const leadCampaign = candidates.find(campaign => campaign.campaignId === selectedId) || candidates.find(campaign => !['RECONOCIMIENTO', 'INTERACCIÓN'].includes(campaign.lineName || '')) || candidates[0];
  const unit = leadCampaign.lineName === 'RECONOCIMIENTO' ? 'impresiones' : leadCampaign.lineName === 'INTERACCIÓN' ? 'interacciones' : 'leads';
  const platforms = (leadCampaign.platformBreakdown || []).map(item => ({ label: item.label, value: breakdownValue(leadCampaign, item) }));
  const creatives = (leadCampaign.creatives || []).map(item => ({ id: item.id, label: item.label, value: breakdownValue(leadCampaign, item) })).sort((a, b) => b.value - a.value).slice(0, 5);
  return <section className="viz-section" aria-label="Desgloses gráficos de Meta Ads">
    <div className="dashboard-heading"><div><p className="eyebrow">DESGLOSE / CAMPAÑA</p><h2>Dónde se generan los resultados</h2><p className="subtle viz-campaign-name">{leadCampaign.campaignName} · {unit}</p></div><label className="viz-picker">Campaña<select aria-label="Campaña para los gráficos de desglose" value={leadCampaign.campaignId} onChange={event => setSelectedId(event.target.value)}>{candidates.map(campaign => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.campaignName}</option>)}</select></label></div>
    <div className="viz-grid">
      <RankedBars title="Resultados por plataforma" rows={platforms} unit={unit} empty="Sin desglose por plataforma" />
      <CreativeBars rows={creatives} previews={previews} previewStatus={previewStatus} unit={unit} />
      <DemographicChart campaign={leadCampaign} unit={unit} />
    </div>
    <p className="table-note">Selecciona una campaña para ver sus plataformas, anuncios destacados y distribución por edad y sexo. Las impresiones, interacciones y leads conservan sus unidades propias.</p>
  </section>;
}

function CreativeBars({ rows, previews, previewStatus, unit }: { rows: { id: string; label: string; value: number }[]; previews: Record<string, CreativePreview>; previewStatus: 'loading' | 'loaded' | 'error'; unit: string }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <article className="panel viz-card"><div className="panel-heading"><h3>Creativos destacados</h3><span className="mini-tag">{unit.toUpperCase()}</span></div>
    {rows.length ? <div className="viz-creative-list">{rows.map(row => <div className="viz-creative-row" key={row.id}>
      <CreativeThumbnail preview={previews[row.id]} label={row.label} status={previewStatus} />
      <div className="viz-creative-content"><div className="viz-creative-label"><span title={row.label}>{row.label}</span><strong>{number(row.value)}</strong></div><div className="viz-track" role="img" aria-label={`${row.label}: ${number(row.value)} ${unit}`}><i style={{ width: `${row.value / max * 100}%` }} /></div></div>
    </div>)}</div> : <p className="subtle viz-empty">Sin desglose por anuncio</p>}
  </article>;
}

function CreativeThumbnail({ preview, label, status }: { preview?: CreativePreview; label: string; status: 'loading' | 'loaded' | 'error' }) {
  const [url, setUrl] = useState(preview?.thumbnailUrl || preview?.imageUrl || '');
  useEffect(() => setUrl(preview?.thumbnailUrl || preview?.imageUrl || ''), [preview]);
  if (!url && preview?.previewUrl) return <a className="viz-creative-placeholder viz-preview-link" href={preview.previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver anuncio ${label} en Meta`}>Ver anuncio ↗</a>;
  if (!url) return <span className="viz-creative-placeholder" aria-label={`Miniatura de ${label} no disponible`}>{status === 'loading' ? 'Cargando' : status === 'error' ? 'Error' : 'Sin imagen'}</span>;
  return <a className="viz-creative-image" href={preview?.imageUrl || undefined} target="_blank" rel="noopener noreferrer" aria-label={`Abrir imagen de ${label}`}><img src={url} alt={`Miniatura de ${label}`} loading="lazy" onError={() => setUrl(current => current === preview?.thumbnailUrl && preview.imageUrl !== current ? preview.imageUrl || '' : '')} /></a>;
}

function DemographicChart({ campaign, unit }: { campaign: CampaignMetrics; unit: string }) {
  const metric = unit === 'impresiones' ? 'impressions' : unit === 'interacciones' ? 'engagement' : 'leads';
  const groups = demographicChartData(campaign.demographics || [], metric);
  const maxValue = Math.max(1, ...groups.flatMap(group => [group.female || 0, group.male || 0, group.unknown || 0]));
  const magnitude = 10 ** Math.floor(Math.log10(maxValue / 4));
  const tickStep = [1, 2, 5, 10].map(step => step * magnitude).find(step => step >= maxValue / 4) || magnitude * 10;
  const axisMax = Math.ceil(maxValue / tickStep) * tickStep;
  const ticks = Array.from({ length: Math.round(axisMax / tickStep) + 1 }, (_, index) => index * tickStep);
  const chart = { width: 820, height: 322, left: 56, right: 12, top: 18, bottom: 42 };
  const plotHeight = chart.height - chart.top - chart.bottom;
  const columnWidth = (chart.width - chart.left - chart.right) / Math.max(1, groups.length);
  const totals = {
    male: groups.reduce((sum, group) => sum + (group.male || 0), 0),
    female: groups.reduce((sum, group) => sum + (group.female || 0), 0),
    unknown: groups.reduce((sum, group) => sum + (group.unknown || 0), 0),
  };
  const total = totals.male + totals.female + totals.unknown;
  const spend = { male: 0, female: 0, unknown: 0 };
  for (const item of campaign.demographics || []) {
    const sex = item.label.split('·').at(-1)?.trim().toLowerCase();
    spend[sex === 'male' ? 'male' : sex === 'female' ? 'female' : 'unknown'] += item.spend;
  }
  const sexes = [
    { key: 'male', label: 'Hombres', color: '#8765e8' },
    { key: 'female', label: 'Mujeres', color: '#31c9cb' },
    { key: 'unknown', label: 'Sin especificar', color: '#a1b3bf' },
  ] as const;
  const visibleSexes = sexes.filter(sex => sex.key !== 'unknown' || totals.unknown > 0);
  const axisNumber = (value: number) => new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const costLabel = unit === 'impresiones' ? 'Costo por mil impresiones' : 'Costo por resultado';
  return <article className="panel viz-card viz-demographics"><div className="panel-heading"><h3>Distribución por sexo y edad</h3><span className="mini-tag">{unit.toUpperCase()}</span></div>
    {groups.length ? <>
      <p className="demographic-scroll-hint">Desliza para ver todas las edades →</p>
      <div className="demographic-chart-scroll" role="region" aria-label="Gráfica de edad y sexo con desplazamiento horizontal" tabIndex={0}><svg className="demographic-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`Distribución de ${unit} por edad y sexo de ${campaign.campaignName}`}>
        {ticks.map(tick => { const y = chart.top + plotHeight * (1 - tick / axisMax); return <g key={tick}><line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} className="demographic-gridline"/><text x={chart.left - 10} y={y + 4} textAnchor="end" className="demographic-axis-label">{axisNumber(tick)}</text></g>; })}
        {groups.map((group, index) => {
          const center = chart.left + columnWidth * (index + 0.5);
          const barWidth = Math.min(30, columnWidth / (visibleSexes.length + 1));
          const gap = 4;
          const totalWidth = visibleSexes.length * barWidth + (visibleSexes.length - 1) * gap;
          return <g key={group.age}>
            {visibleSexes.map((sex, sexIndex) => {
              const value = group[sex.key] || 0;
              const height = value / axisMax * plotHeight;
              return <rect key={sex.key} x={center - totalWidth / 2 + sexIndex * (barWidth + gap)} y={chart.top + plotHeight - height} width={barWidth} height={height} rx="3" fill={sex.color}><title>{group.age} años · {sex.label}: {number(value)} {unit}</title></rect>;
            })}
            <text x={center} y={chart.height - 16} textAnchor="middle" className="demographic-age-label">{group.age}</text>
          </g>;
        })}
      </svg></div>
      <div className="demographic-legend">{visibleSexes.map(sex => <div key={sex.key}><span className="demographic-swatch" style={{ background: sex.color }} /><div><strong>{sex.label}</strong><span>{total ? `${number(totals[sex.key] / total * 100)}%` : '0%'} · {number(totals[sex.key])} {unit}</span><small>{costLabel}: {totals[sex.key] ? money(spend[sex.key] / totals[sex.key] * (unit === 'impresiones' ? 1000 : 1)) : '—'}</small></div></div>)}</div>
    </> : <p className="subtle viz-empty">Sin desglose de edad y sexo para esta campaña.</p>}
    <p className="table-note">Resultados de la campaña seleccionada según el desglose de Meta. Se muestran los rangos que la API informó; los totales por sexo corresponden a esos segmentos.</p>
  </article>;
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
