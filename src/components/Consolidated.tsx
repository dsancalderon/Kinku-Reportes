import type { Overview } from '../../shared/contracts';
import { buildConsolidated } from '../lib/consolidated';
import { money, number } from '../lib/historical';
import { meetsMonthlyPace, monthlyPace } from '../lib/pace';
import { ConsolidatedVisuals } from './ReportVisuals';

export function Consolidated({ overviews, month, loading, error }: { overviews: Overview[]; month: string; loading: boolean; error: string }) {
  const { rows, metaLeads, metaLeadTarget, googleConversions, spend } = buildConsolidated(overviews);
  const percentage = (value: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const googleComparison = rows.some(row => row.channel === 'google_ads' && row.target !== null && row.targetUnit !== row.unit);
  const hasGoogleActivity = overviews.some(overview => overview.campaigns.some(campaign => campaign.provider === 'google_ads'));
  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
  const pace = monthlyPace(month);
  return <section className="consolidated">
    <div className="consolidated-heading">
      <div><p className="eyebrow">TIC TAC AGENCY / KINKU</p><h2>Resumen de <em>cumplimiento</em></h2><p className="subtle">{monthLabel} · America/Bogota · Meta Ads{hasGoogleActivity ? ' y Google Ads' : ''}</p></div>
      <div className="consolidated-cards">
        <article><span className="kpi-label"><LeadsIcon />LEADS META</span><strong>{loading ? '…' : number(metaLeads)}</strong></article>
        <article><span className="kpi-label">{hasGoogleActivity ? <GoogleIcon /> : <LeadsIcon />}{hasGoogleActivity ? 'CONV. GOOGLE' : 'META LEADS META'}</span><strong>{loading ? '…' : hasGoogleActivity ? number(googleConversions) : number(metaLeadTarget)}</strong></article>
        <article><span className="kpi-label"><SpendIcon />INVERSIÓN TOTAL</span><strong>{loading ? '…' : money(spend)}</strong></article>
      </div>
    </div>
    {error && <p role="alert" className="consolidated-error">{error}</p>}
    {!loading && !error && <ConsolidatedVisuals overviews={overviews} month={month} />}
    {loading ? <div className="panel empty"><h2>Cargando consolidado…</h2></div> :
      <div className="panel consolidated-panel">
        <p className="subtle">Cumplimiento en verde al alcanzar el ritmo esperado: {number(pace.percent)}% de la meta mensual al día {pace.day} de {pace.daysInMonth}.</p>
        <div className="table-scroll"><table>
          <thead><tr><th>Proyecto</th><th>Canal</th><th>Campaña / línea</th><th>Métrica</th><th>Resultado</th><th>Inversión</th><th>Presupuesto</th><th>Meta</th><th>Costo objetivo</th><th>Cumplimiento</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={10}>Sin campañas o metas registradas para este mes.</td></tr> : rows.map(row => {
            const pct = row.target && row.result !== null && row.targetNote !== 'Por validar' ? row.result / row.target * 100 : null;
            const onPace = pct === null || row.targetUnit && row.targetUnit !== row.unit ? null : meetsMonthlyPace(row.result, row.target, month);
            return <tr key={row.key}>
              <td><span className={`project-pill ${row.projectId}`}>{row.projectName}</span></td>
              <td>{row.channel === 'meta' ? 'Meta Ads' : 'Google Ads'}</td>
              <td><strong>{row.name}</strong>{row.campaigns.length > 0 && <small className="campaign-names" title={row.campaigns.join(' · ')}>{row.campaigns.join(' · ')}</small>}</td>
              <td>{row.unit}</td>
              <td>{number(row.result)}</td><td>{money(row.spend)}</td><td>{money(row.budget)}</td><td>{number(row.target)}{row.target !== null && row.targetUnit && <small> {row.targetUnit}</small>}{row.targetNote?.startsWith('Revisada') && <small className="target-revision">{row.targetNote}</small>}</td><td>{money(row.targetCostPerResult)}</td>
              <td>{pct === null || onPace === null ? <span className="muted">{row.targetUnit && row.targetUnit !== row.unit ? 'Por validar' : row.targetNote || (row.target === null ? 'Sin definir' : 'Pendiente')}</span> : <div className="fulfillment"><strong className={onPace ? 'success' : 'below'}>{percentage(pct)}%</strong><span className="fulfillment-track" title={`Ritmo esperado: ${percentage(pace.percent)}%`}><i style={{ width: `${Math.min(100, pct)}%` }} className={onPace ? 'success' : 'below'} /></span></div>}</td>
            </tr>;
          })}</tbody>
        </table></div>
        <p className="table-note">Cada fila de Meta corresponde a una línea y muestra sus campañas del mes. Las metas y presupuestos proceden del Flow, salvo las revisiones indicadas. {googleComparison ? 'Google muestra conversiones y leads como unidades separadas; valide su equivalencia antes de evaluar cumplimiento.' : 'Google solo aparece cuando registra campañas o metas en el mes.'}</p>
      </div>}
  </section>;
}

function LeadsIcon() {
  return <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 5v18h18" /><path d="M9 18l4-5 3 3 6-8" /><path d="M18 8h4v4" />
  </svg>;
}

function GoogleIcon() {
  return <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M21.5 9.2A9 9 0 1 0 23 14h-8.5" />
  </svg>;
}

function SpendIcon() {
  return <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="14" cy="14" r="11" /><path d="M17.5 10.2c-.6-1.2-1.9-1.9-3.5-1.9-2 0-3.4 1.1-3.4 2.7 0 3.6 7 1.9 7 5.5 0 1.6-1.5 2.8-3.6 2.8-1.7 0-3.1-.8-3.7-2.1M14 6.5v15" />
  </svg>;
}
