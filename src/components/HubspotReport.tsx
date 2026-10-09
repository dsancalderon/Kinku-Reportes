import { pekinHubspotOctober } from '../lib/hubspotSnapshot';
import { number } from '../lib/historical';

export function HubspotReport({ projectName, month, onNavigate }: { projectName: string; month: string; onNavigate: () => void }) {
  const data = month === pekinHubspotOctober.month ? pekinHubspotOctober : null;
  if (!data) return <section className="panel empty">
    <div className="provider-icon">H</div>
    <h2>HubSpot · {projectName}</h2>
    <p>Por ahora no se ha recibido un corte de HubSpot para este período.</p>
    <button className="primary" onClick={onNavigate}>Ver conexiones ↗</button>
  </section>;

  const hotLeads = data.contactStatus.find(item => item.label === 'Lead Caliente')?.count || 0;
  const appointments = data.contactStatus.find(item => item.label === 'Cita Programada')?.count || 0;
  return <section className="hubspot-report" aria-label={`HubSpot de ${projectName}`}>
    <div className="hubspot-heading">
      <div><p className="eyebrow">GESTIÓN COMERCIAL / HUBSPOT</p><h2>Contactos de {data.owner}</h2></div>
      <span className="mini-tag">CORTE 01–09 OCT 2026</span>
    </div>
    <p className="subtle hubspot-intro">Pekín · Datos compartidos desde HubSpot para el 1 al 9 de octubre de 2026. Ambas gráficas describen los mismos {data.totalContacts} contactos.</p>

    <div className="hubspot-kpis">
      <div className="panel"><span>Contactos</span><strong>{number(data.totalContacts)}</strong><small>Base de las dos gráficas</small></div>
      <div className="panel"><span>Leads calientes</span><strong>{number(hotLeads)}</strong><small>Estado del contacto</small></div>
      <div className="panel"><span>Citas programadas</span><strong>{number(appointments)}</strong><small>No equivale a cita efectiva</small></div>
    </div>

    <div className="hubspot-charts">
      <article className="panel hubspot-chart-card">
        <div className="panel-heading"><h3>Etapa de ciclo de vida</h3><span className="mini-tag">47 CONTACTOS</span></div>
        <p className="subtle">Distribución de los contactos de {data.owner}</p>
        <LifecycleDonut />
        <div className="hubspot-legend">{data.lifecycle.map(item => <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{number(item.count)} · {percentage(item.count, data.totalContacts)}%</strong></div>)}</div>
      </article>

      <article className="panel hubspot-chart-card">
        <div className="panel-heading"><h3>Estado del contacto</h3><span className="mini-tag">47 CONTACTOS</span></div>
        <p className="subtle">Cantidad de leads según el estado registrado</p>
        <div className="hubspot-status-chart" role="img" aria-label={data.contactStatus.map(item => `${item.label}: ${item.count}`).join('; ')}>
          {data.contactStatus.map(item => <div className="hubspot-status-row" key={item.label} aria-hidden="true">
            <span>{item.label}</span>
            <div className="hubspot-status-track"><i style={{ width: `${item.count / 12 * 100}%` }} /></div>
            <strong>{number(item.count)}</strong>
          </div>)}
          <div className="hubspot-status-axis" aria-hidden="true"><span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span><span>12</span></div>
        </div>
      </article>
    </div>
    <p className="table-note hubspot-source">Fuente: capturas de HubSpot compartidas en el chat. Corte fijo al 9 de octubre de 2026, con dos filtros activos cuyos criterios no aparecen en las capturas. Estos datos se actualizarán cuando compartas un nuevo corte; no provienen de una conexión API.</p>
  </section>;
}

function percentage(count: number, total: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(count / total * 100);
}

function LifecycleDonut() {
  const data = pekinHubspotOctober;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <svg className="hubspot-donut" viewBox="0 0 250 250" role="img" aria-label={data.lifecycle.map(item => `${item.label}: ${item.count} contactos, ${percentage(item.count, data.totalContacts)} por ciento`).join('; ')}>
    <circle cx="125" cy="125" r={radius} fill="none" stroke="#28413d" strokeWidth="43" />
    {data.lifecycle.map(item => {
      const length = item.count / data.totalContacts * circumference;
      const segment = <circle key={item.label} cx="125" cy="125" r={radius} fill="none" stroke={item.color} strokeWidth="43" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 125 125)" />;
      offset += length;
      return segment;
    })}
    <text x="125" y="119" textAnchor="middle" className="hubspot-donut-total">{data.totalContacts}</text>
    <text x="125" y="141" textAnchor="middle" className="hubspot-donut-caption">contactos</text>
  </svg>;
}
