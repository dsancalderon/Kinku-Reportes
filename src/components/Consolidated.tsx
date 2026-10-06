import type { Overview } from '../../shared/contracts';
import { buildConsolidated } from '../lib/consolidated';
import { money, number } from '../lib/historical';

export function Consolidated({ overviews, month, loading, error }: { overviews: Overview[]; month: string; loading: boolean; error: string }) {
  const { rows, metaLeads, googleConversions, spend } = buildConsolidated(overviews);
  const percentage = (value: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const googleComparison = rows.some(row => row.channel === 'google_ads' && row.target !== null && row.targetUnit !== row.unit);
  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
  return <section className="consolidated">
    <div className="consolidated-heading">
      <div><p className="eyebrow">TIC TAC AGENCY / KINKU</p><h2>Resumen de cumplimiento</h2><p className="subtle">{monthLabel} · America/Bogota · Meta Ads y Google Ads</p></div>
      <div className="consolidated-cards">
        <article><span>LEADS META</span><strong>{loading ? '…' : number(metaLeads)}</strong></article>
        <article><span>CONV. GOOGLE</span><strong>{loading ? '…' : number(googleConversions)}</strong></article>
        <article><span>INVERSIÓN TOTAL</span><strong>{loading ? '…' : money(spend)}</strong></article>
      </div>
    </div>
    {error && <p role="alert" className="consolidated-error">{error}</p>}
    {loading ? <div className="panel empty"><h2>Cargando consolidado…</h2></div> :
      <div className="panel consolidated-panel">
        <div className="table-scroll"><table>
          <thead><tr><th>Proyecto</th><th>Canal</th><th>Campaña / línea</th><th>Métrica</th><th>Resultado</th><th>Inversión</th><th>Meta</th><th>Cumplimiento</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={8}>Sin campañas o metas registradas para este mes.</td></tr> : rows.map(row => {
            const pct = row.target && row.result !== null && row.targetNote !== 'Por validar' ? row.result / row.target * 100 : null;
            return <tr key={row.key}>
              <td><span className={`project-pill ${row.projectId}`}>{row.projectName}</span></td>
              <td>{row.channel === 'meta' ? 'Meta Ads' : 'Google Ads'}</td>
              <td><strong>{row.name}</strong>{row.campaigns.length > 0 && <small className="campaign-names" title={row.campaigns.join(' · ')}>{row.campaigns.join(' · ')}</small>}</td>
              <td>{row.unit}</td>
              <td>{number(row.result)}</td><td>{money(row.spend)}</td><td>{number(row.target)}{row.target !== null && row.targetUnit && <small> {row.targetUnit}</small>}</td>
              <td>{pct === null ? <span className="muted">{row.targetNote || (row.target === null ? 'Sin definir' : 'Pendiente')}</span> : <div className="fulfillment"><strong className={pct >= 100 ? 'success' : 'below'}>{percentage(pct)}%</strong><span className="fulfillment-track"><i style={{ width: `${Math.min(100, pct)}%` }} className={pct >= 100 ? 'success' : 'below'} /></span></div>}</td>
            </tr>;
          })}</tbody>
        </table></div>
        <p className="table-note">Cada fila de Meta corresponde a una línea y muestra sus campañas del mes. {googleComparison ? 'En Google Ads, el cumplimiento compara las conversiones totales de la cuenta con la meta mensual de leads del Flow; las unidades se muestran por separado.' : 'Las conversiones de Google se reportan por cuenta.'}</p>
      </div>}
  </section>;
}
