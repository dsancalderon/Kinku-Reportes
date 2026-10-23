import { pekinHubspotOctober } from '../lib/hubspotSnapshot';
import { number } from '../lib/historical';
import { AnimatedValue } from './AnimatedValue';

export function HubspotReport({ projectName, month, onNavigate }: { projectName: string; month: string; onNavigate: () => void }) {
  const data = month === pekinHubspotOctober.month ? pekinHubspotOctober : null;
  if (!data) return <section className="panel empty">
    <div className="provider-icon">H</div>
    <h2>HubSpot · {projectName}</h2>
    <p>Por ahora no se ha recibido un corte de HubSpot para este período.</p>
    <button className="primary" onClick={onNavigate}>Ver conexiones ↗</button>
  </section>;

  const hotLeads = data.contactStatus.find(item => item.label === 'Lead Caliente')?.count || 0;
  const effectiveAppointments = data.contactStatus.find(item => item.label === 'Cita efectiva')?.count || 0;
  const scheduledAppointments = data.contactStatus.find(item => item.label === 'Cita Programada')?.count || 0;
  const unhelpful = data.contactStatus.find(item => item.label === 'No útil')?.count || 0;
  const pending = data.contactStatus.filter(item => item.label === 'Marcar de nuevo' || item.label === 'Seguimiento').reduce((sum, item) => sum + item.count, 0);
  const mql = data.lifecycle.find(item => item.label === 'Lead calificado por marketing')?.count || 0;
  const sql = data.lifecycle.find(item => item.label === 'Lead calificado por ventas')?.count || 0;
  const clients = data.lifecycle.find(item => item.label === 'Cliente')?.count || 0;
  const cutoffDay = Number(data.through.slice(-2));
  const axisStep = Math.max(2, Math.ceil(Math.max(...data.contactStatus.map(item => item.count)) / 12) * 2);
  const axisMax = axisStep * 6;
  return <section className="hubspot-report" aria-label={`HubSpot de ${projectName}`}>
    <div className="hubspot-heading">
      <div><p className="eyebrow">GESTIÓN COMERCIAL / HUBSPOT</p><h2>Contactos de {data.owner}</h2></div>
      <span className="mini-tag">CORTE 01–{cutoffDay} OCT 2026</span>
    </div>
    <p className="subtle hubspot-intro">Pekín · Datos compartidos desde HubSpot para el 1 al {cutoffDay} de octubre de 2026. Ambas gráficas describen los mismos {data.totalContacts} contactos.</p>

    <div className="hubspot-kpis">
      <div className="panel"><span>Contactos</span><strong><AnimatedValue text={number(data.totalContacts)} /></strong><small>Base de las dos gráficas</small></div>
      <div className="panel"><span>Leads calientes</span><strong><AnimatedValue text={number(hotLeads)} /></strong><small>Estado del contacto</small></div>
      <div className="panel"><span>Citas efectivas</span><strong><AnimatedValue text={number(effectiveAppointments)} /></strong><small>Estado del contacto</small></div>
    </div>

    <div className="hubspot-charts">
      <article className="panel hubspot-chart-card">
        <div className="panel-heading"><h3>Etapa de ciclo de vida</h3><span className="mini-tag">{data.totalContacts} CONTACTOS</span></div>
        <p className="subtle">Distribución de los contactos de {data.owner}</p>
        <LifecycleDonut />
        <div className="hubspot-legend">{data.lifecycle.map(item => <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{number(item.count)} · {percentage(item.count, data.totalContacts)}%</strong></div>)}</div>
      </article>

      <article className="panel hubspot-chart-card">
        <div className="panel-heading"><h3>Estado del contacto</h3><span className="mini-tag">{data.totalContacts} CONTACTOS</span></div>
        <p className="subtle">Cantidad de leads según el estado registrado</p>
        <div className="hubspot-status-chart" role="img" aria-label={data.contactStatus.map(item => `${item.label}: ${item.count}`).join('; ')}>
          {data.contactStatus.map(item => <div className="hubspot-status-row" key={item.label} aria-hidden="true">
            <span>{item.label}</span>
            <div className="hubspot-status-track"><i style={{ width: `${item.count / axisMax * 100}%` }} /></div>
            <strong>{number(item.count)}</strong>
          </div>)}
          <div className="hubspot-status-axis" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span key={index}>{index * axisStep}</span>)}</div>
        </div>
      </article>
    </div>
    <article className="panel hubspot-executive">
      <div className="panel-heading"><h3>Lectura ejecutiva</h3><span className="mini-tag">CORTE DE HUBSPOT</span></div>
      <p>De los {data.totalContacts} contactos de {data.owner}, {mql} están calificados por marketing, {sql} por ventas y {clients} figuran como clientes. Hay {hotLeads} leads calientes, {effectiveAppointments} citas efectivas y {scheduledAppointments} programada. Las etapas y los estados son dos clasificaciones de los mismos contactos; este corte no permite calcular una tasa de conversión entre ellas.</p>
      <div className="hubspot-insights">
        <div><strong>{number(pending)} en gestión pendiente</strong><span>Marcar de nuevo y seguimiento reúnen {percentage(pending, data.totalContacts)}% del corte. Cada caso necesita próxima acción y fecha.</span></div>
        <div><strong>{number(unhelpful)} no útiles</strong><span>Representan {percentage(unhelpful, data.totalContacts)}%. Conviene revisar el motivo de descarte antes de cambiar la segmentación.</span></div>
        <div><strong>{number(hotLeads)} leads calientes</strong><span>Representan {percentage(hotLeads, data.totalContacts)}% del corte. Conviene priorizar su siguiente contacto y registrar el resultado.</span></div>
      </div>
      <h4>Recomendaciones para el próximo corte</h4>
      <ol>
        <li>Priorizar los {hotLeads} leads calientes, confirmar la cita programada y registrar el resultado comercial de las {effectiveAppointments} citas efectivas.</li>
        <li>Asignar responsable y fecha a los {pending} casos de seguimiento o nueva llamada.</li>
        <li>Clasificar el motivo de los {unhelpful} contactos no útiles y cruzarlo con campaña de origen cuando HubSpot tenga ese dato, para identificar ajustes de captación.</li>
        <li>Revisar con ventas los criterios de avance de los {mql} MQL y {sql} SQL, y documentar el origen de los {clients} clientes sin inferir tasas de conversión de este corte.</li>
      </ol>
    </article>
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
