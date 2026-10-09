import { useEffect, useState, type CSSProperties } from 'react';
import type { Overview, Provider, ReportView, ReportRowItem, ConnectionStatus, CampaignMetrics } from '../shared/contracts';
import { projects, providerLabels, type ProjectId } from '../shared/projects';
import { getOverview } from './lib/api';
import { money, number } from './lib/historical';
import { SyncStatus } from './components/SyncStatus';
import { Consolidated } from './components/Consolidated';
import { AuroraBackground } from './components/AuroraBackground';
import { HubspotReport } from './components/HubspotReport';
import { meetsMonthlyPace, monthlyPace } from './lib/pace';
import { DailyVisual, BreakdownVisuals, GoogleVisuals } from './components/ReportVisuals';

type View = 'summary' | Provider | 'connections';

function getLivePeriodLabel(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return `01 — ${parts.slice(8)} OCT, ${parts.slice(0, 4)}`;
}

export function App() {
  const [projectId, setProject] = useState<ProjectId>('pekin');
  const [view, setView] = useState<View>('summary');
  const [mode, setMode] = useState<'historical' | 'live'>('live');
  const [objective, setObjective] = useState<string>('leads');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [showConsolidated, setShowConsolidated] = useState(true);
  const [consolidatedOverviews, setConsolidatedOverviews] = useState<Overview[]>([]);
  const [refreshRevision, setRefreshRevision] = useState(0);

  const project = projects.find(item => item.id === projectId)!;
  const selectedMonth = mode === 'historical' ? '2026-09' : '2026-10';

  useEffect(() => {
    if (showConsolidated) return;
    const controller = new AbortController();
    setOverview(null);
    setError('');
    getOverview(projectId, selectedMonth, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setOverview(result);
          // Si el objetivo actual no existe en el nuevo mes/proyecto, cambiar al primero disponible
          const available = result.reports ? Object.keys(result.reports) : [];
          if (available.length > 0 && !available.includes(objective)) {
            setObjective(available[0]);
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('No se pudo consultar el servidor de reportes.');
        }
      });
    return () => controller.abort();
  }, [projectId, mode, showConsolidated, refreshRevision]);

  useEffect(() => {
    if (!showConsolidated) return;
    const controller = new AbortController();
    setConsolidatedOverviews([]);
    setError('');
    Promise.all(projects.map(item => getOverview(item.id, selectedMonth, controller.signal)))
      .then(results => { if (!controller.signal.aborted) setConsolidatedOverviews(results); })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar el consolidado de las tres marcas.'); });
    return () => controller.abort();
  }, [showConsolidated, mode, refreshRevision]);

  function selectProject(id: ProjectId) {
    setProject(id);
    setShowConsolidated(false);
    setView('summary');
  }

  const reportsMap = overview?.reports || {};
  const availableReports = Object.values(reportsMap);
  const report: ReportView | undefined = reportsMap[objective] || availableReports[0];

  return (
    <div className="app" style={{ '--project': project.accent } as CSSProperties}>
      <AuroraBackground />
      <aside className="sidebar">
        <a href="#dashboard" className="agency">
          <img src="/brand/tictac-logo.png" alt="TicTac Agency Performance" />
        </a>
        <div className="workspace-label">
          KINKU <span>REPORTING STUDIO</span>
        </div>
        <p className="nav-label">REPORTES</p>
        <nav className="project-nav" aria-label="Proyectos">
          <button aria-pressed={showConsolidated} onClick={() => setShowConsolidated(true)}>
            <span className="project-dot" style={{ background: '#a5c92b' }} />
            Consolidado
          </button>
          {projects.map((item, i) => (
            <button
              key={item.id}
              aria-pressed={!showConsolidated && projectId === item.id}
              onClick={() => selectProject(item.id)}
            >
              <span className="project-dot" style={{ background: item.accent }} />
              {item.name}
              <small>0{i + 1}</small>
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <span className="topbar-breadcrumb">
            Kinku <span className="separator">/</span> {showConsolidated ? 'Consolidado' : project.name}{' '}
            <span className="separator">/</span> Reporte de rendimiento
          </span>
          <div className="mode-controls">
            <label htmlFor="data-mode">PERÍODO DEL REPORTE</label>
            <select
              id="data-mode"
              value={mode}
              onChange={event => setMode(event.target.value as typeof mode)}
            >
              <option value="historical">Informe histórico · septiembre 2026</option>
              <option value="live">Octubre 2026 · acumulado al día</option>
            </select>
            <span>
              America/Bogota ·{' '}
              {mode === 'historical' ? '01 — 30 SEP, 2026' : view === 'hubspot' ? '01 — 09 OCT, 2026' : getLivePeriodLabel()}
            </span>
          </div>
        </header>

        <main id="dashboard">
          {!showConsolidated && view !== 'hubspot' && <SyncStatus
            key={`${projectId}-${mode}`}
            projectId={projectId}
            month={selectedMonth}
            sync={overview?.projectId === projectId ? overview.sync : undefined}
            onUpdated={() => setRefreshRevision(value => value + 1)}
          />}

          {showConsolidated ? <Consolidated overviews={consolidatedOverviews} month={selectedMonth} loading={!error && consolidatedOverviews.length === 0} error={error} /> : <>

          <section className="project-header">
            <div className={`project-logo ${projectId}`}>
              <img src={project.image} alt={project.name} />
            </div>
            <div>
              <p className="eyebrow">PROYECTO / {project.name.toUpperCase()}</p>
              <h2>{project.description}</h2>
            </div>
            <span className="project-counter">
              {String(projects.findIndex(item => item.id === projectId) + 1).padStart(2, '0')}
              <small>/03</small>
            </span>
          </section>

          <nav className="view-nav" aria-label="Secciones del proyecto">
            {(['summary', ...project.providers.filter(item => mode === 'historical' || item !== 'google_ads'), 'connections'] as View[]).map(item => (
              <button
                key={item}
                onClick={() => setView(item)}
                aria-pressed={view === item}
              >
                {item === 'summary'
                  ? 'Resumen ejecutivo'
                  : item === 'connections'
                  ? 'Conexiones'
                  : providerLabels[item]}
              </button>
            ))}
          </nav>

          {view !== 'connections' && (
            <div className="source-notice">
              <span className="notice-dot" />
              <span>
                {view === 'hubspot' && mode === 'live'
                  ? 'HUBSPOT · CORTE 09 OCTUBRE 2026'
                  : mode === 'historical'
                  ? 'INFORME HISTÓRICO · SEPTIEMBRE 2026'
                  : 'MES EN CURSO · OCTUBRE 2026 (AL DÍA)'}
              </span>
              <p>
                {view === 'hubspot' && mode === 'live'
                  ? 'Datos de contactos compartidos en capturas de HubSpot; corresponden al período del 1 al 9 de octubre y no se actualizan con la API de Meta.'
                  : mode === 'historical'
                  ? 'Corte mensual consolidado (01 al 30 de septiembre de 2026) con Meta Ads, Google Ads y metas registradas.'
                  : 'Métricas de Meta Ads acumuladas desde el 01 de octubre hasta el último corte de la API, comparadas con las metas del Flow de octubre. Google Ads no tiene metas ni anuncios previstos para este mes.'}
              </p>
            </div>
          )}

          {view === 'connections' ? (
            <section className="connections">
              <SectionTitle title="Las fuentes de este proyecto" kicker="CONEXIONES" />
              <p className="subtle">Cada proyecto mantiene sus cuentas y campañas por separado.</p>
              {error && <p role="alert">{error}</p>}
              <div className="connection-grid">
                {project.providers.map(provider => {
                  const conn = overview?.connections?.find(c => c.provider === provider);
                  const isConnected = conn?.state === 'connected';
                  const isError = conn?.state === 'error';
                  return (
                    <article className="panel connection" key={provider}>
                      <div className="provider-icon">
                        {provider === 'meta' ? '∞' : provider === 'google_ads' ? 'G' : 'H'}
                      </div>
                      <h3>{providerLabels[provider]}</h3>
                      <p>
                        {project.name} ·{' '}
                        {provider === 'hubspot'
                          ? 'Gestión comercial'
                          : 'Campañas y rendimiento'}
                      </p>
                      <span
                        className="pending"
                        style={
                          isError
                            ? { borderColor: '#e07a5f66', color: '#f08a6f', background: '#e07a5f15' }
                            : isConnected
                            ? { borderColor: '#a5c92b66', color: '#c4e366', background: '#a5c92b15' }
                            : {}
                        }
                      >
                        {error
                          ? 'Estado no disponible'
                          : isConnected
                          ? 'Conectado a la API'
                          : isError
                          ? 'Error de conexión'
                          : 'Pendiente de conexión'}
                      </span>
                      {conn?.details && (
                        <p style={{ fontSize: '9px', color: '#dfb278', margin: '6px 0 12px', lineHeight: 1.4 }}>
                          {conn.details}
                        </p>
                      )}
                      <div className="connection-bottom">
                        Última sincronización{' '}
                        <strong>
                          {conn?.lastSuccessfulSyncAt
                            ? new Date(conn.lastSuccessfulSyncAt).toLocaleString('es-CO')
                            : 'Sin datos'}
                        </strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : view === 'google_ads' ? (
            <GoogleReport
              projectName={project.name}
              connection={overview?.connections?.find(c => c.provider === 'google_ads')}
              campaigns={overview?.campaigns?.filter(c => c.provider === 'google_ads') || []}
              month={selectedMonth}
              mode={mode}
              onNavigate={() => setView('connections')}
            />
          ) : view === 'hubspot' ? (
            <HubspotReport projectName={project.name} month={selectedMonth} onNavigate={() => setView('connections')} />
          ) : !overview ? (
            <div className="panel empty">
              <span>◎</span>
              <h2>Cargando reporte de {project.name}…</h2>
              <p className="subtle">Consultando métricas y metas en la base de datos de Supabase.</p>
            </div>
          ) : !report ? (
            <Empty
              title={`Sin datos para ${project.name} en este período`}
              text={`No se encontraron campañas ni métricas registradas en Meta Ads para ${selectedMonth}. Si las campañas están en curso, aparecerán en la próxima sincronización.`}
              action={() => setView('connections')}
            />
          ) : (
            <>
              {view === 'summary' && projectId === 'pekin' && <PekinChannelSummary overview={overview} />}
              <div className="dashboard-heading">
                <SectionTitle
                  kicker={view === 'meta' ? 'META ADS / OBJETIVOS' : 'RESUMEN / META ADS'}
                  title="Resultados que importan"
                />
                {availableReports.length > 1 && (
                  <div className="objective-options" aria-label="Objetivos del reporte">
                    {availableReports.map(item => (
                      <button
                        key={item.id}
                        aria-pressed={report.id === item.id}
                        onClick={() => setObjective(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Metrics stats={report.stats} />

              <div className="dashboard-grid">
                <GoalChart report={report} month={selectedMonth} />
                <SpendChart report={report} />
              </div>

              <DailyVisual report={report} campaigns={overview.campaigns} />

              <CampaignTable report={report} />

              <BreakdownVisuals campaigns={overview.campaigns} month={selectedMonth} projectId={projectId} />

              <Executive
                note={view === 'summary' && projectId === 'pekin' ? `${report.note} ${pekinGoogleSummary(overview)}` : report.note}
                source={
                  view === 'summary' && projectId === 'pekin'
                    ? 'Fuentes: Meta Ads Graph API, Google Ads API si registra actividad y Flow del mes'
                    : mode === 'historical'
                    ? 'Fuente: Meta Ads Graph API + Flow de Metas Septiembre 2026'
                    : 'Fuente: Meta Ads Graph API · Acumulado desde el 01 de octubre hasta el último corte sincronizado · Metas: Flow octubre 2026'
                }
              />

              {view === 'summary' && (
                <div className="channel-links">
                  {project.providers
                    .filter(item => item !== 'meta' && (mode === 'historical' || item !== 'google_ads'))
                    .map(item => (
                      <button key={item} onClick={() => setView(item)}>
                        <span>
                          {item === 'hubspot'
                            ? 'Del lead a la oportunidad'
                            : 'Otra perspectiva del rendimiento'}
                          <strong>{providerLabels[item]}</strong>
                        </span>
                        <span>↗</span>
                      </button>
                    ))}
                </div>
              )}
            </>
          )}

          </>}

          <footer>
            <span>
              TIC TAC <strong>AGENCY PERFORMANCE</strong>
            </span>
            <span>
              {showConsolidated ? 'Consolidado Kinku' : project.name} ·{' '}
              {mode === 'historical'
                ? 'Histórico septiembre 2026'
                : view === 'hubspot' ? 'HubSpot · corte 09 octubre 2026' : 'Octubre 2026 · acumulado al día'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function pekinGoogleSummary(overview: Overview): string {
  const google = overview.campaigns.filter(campaign => campaign.provider === 'google_ads');
  if (!google.length) return 'Google Ads: sin métricas verificadas para este mes; no se incluye en los totales.';
  const spend = google.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const conversions = google.reduce((sum, campaign) => sum + (campaign.platformConversions || 0), 0);
  return `Google Ads: ${number(conversions)} conversiones registradas y ${money(spend)} COP de inversión en ${google.length} campañas. Las conversiones de Google se muestran separadas de los leads de Meta.`;
}

function PekinChannelSummary({ overview }: { overview: Overview }) {
  const meta = overview.campaigns.filter(campaign => campaign.provider === 'meta');
  const google = overview.campaigns.filter(campaign => campaign.provider === 'google_ads');
  const leads = meta.filter(campaign => !['RECONOCIMIENTO', 'INTERACCIÓN'].includes(campaign.lineName || ''))
    .reduce((sum, campaign) => sum + (campaign.platformConversions || 0), 0);
  const conversions = google.reduce((sum, campaign) => sum + (campaign.platformConversions || 0), 0);
  const investment = [...meta, ...google].reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const leadTarget = overview.targets.filter(target => target.channel === 'meta' && target.targetUnit === 'leads').reduce((sum, target) => sum + target.targetKpi, 0);
  return <section className="pekin-channel-summary" aria-label="Resumen de Meta y Google Ads de Pekín">
    <div><span>LEADS META</span><strong>{number(leads)}</strong><small>Captación en campañas Meta</small></div>
    <div><span>{google.length ? 'CONVERSIONES GOOGLE ADS' : 'META LEADS META'}</span><strong>{google.length ? number(conversions) : number(leadTarget)}</strong><small>{google.length ? 'Acciones registradas en Google Ads' : 'Flow del período'}</small></div>
    <div><span>{google.length ? 'INVERSIÓN META + GOOGLE' : 'INVERSIÓN META'}</span><strong>{money(investment)}</strong><small>Gasto publicitario total del mes</small></div>
  </section>;
}

function SectionTitle({ title, kicker }: { title: string; kicker: string }) {
  return (
    <div>
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
    </div>
  );
}

function Metrics({ stats }: { stats: readonly [string, string, string][] }) {
  return (
    <div className="metrics">
      {stats.map(([label, value, hint], i) => (
        <article className={`metric ${i === 3 ? 'highlight' : ''}`} key={label}>
          <div className="metric-label">
            {label}
            <span>↗</span>
          </div>
          <strong>{value}</strong>
          <small>{hint}</small>
        </article>
      ))}
    </div>
  );
}

function GoalChart({ report, month }: { report: ReportView; month: string }) {
  const pace = monthlyPace(month);
  const rowsWithTargets = report.rows.filter(
    (row): row is ReportRowItem & { target: number } => row.target !== null && row.target > 0
  );
  const hasTargets = rowsWithTargets.length > 0;

  if (!hasTargets) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <h3>Resultados vs. meta</h3>
          <span className="mini-tag">{report.unit}</span>
        </div>
        <p className="subtle">Pendiente de cargar metas mensuales para contrastar cumplimiento.</p>
        <div
          className="goal-chart"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818c82',
            fontSize: '11px',
            minHeight: '143px',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          Las metas para este período se reflejarán cuando se cargue el presupuesto del Flow.
        </div>
      </section>
    );
  }

  const percentages = rowsWithTargets.map(row =>
    row.result != null ? (row.result / row.target) * 100 : 0
  );
  const max = Math.max(120, ...percentages);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h3>Resultados vs. meta</h3>
        <span className="mini-tag">{report.unit}</span>
      </div>
      <p className="subtle">Ritmo esperado: {number(pace.percent)}% de la meta al día {pace.day} de {pace.daysInMonth} (Bogotá).</p>
      <div className="goal-chart">
        {report.rows.map(row => {
          const hasRowTarget = typeof row.target === 'number' && row.target > 0;
          const pct = hasRowTarget && row.result != null && row.target ? (row.result / row.target) * 100 : null;
          const onPace = meetsMonthlyPace(row.result, row.target, month);
          const fillWidth = pct !== null ? Math.min(100, Math.max(0, (pct / max) * 100)) : 0;

          return (
            <div className="goal-row" key={row.name}>
              <div>
                <span>{row.name}</span>
                <strong className={onPace === null ? '' : onPace ? 'on-track' : 'behind'}>{pct !== null ? `${number(pct)}%` : '—'}</strong>
              </div>
              <div className="goal-track">
                <div className={`goal-fill ${onPace === null ? '' : onPace ? 'on-track' : 'behind'}`} style={{ width: `${fillWidth}%` }} />
                {hasRowTarget && (
                  <>{pace.percent < 100 && <span className="pace-marker" style={{ left: `${(pace.percent / max) * 100}%` }} title={`Ritmo esperado: ${number(pace.percent)}%`} />}<span className="target-marker" style={{ left: `${(100 / max) * 100}%` }} title="Meta mensual" /></>
                )}
              </div>
              <small>
                {row.result != null ? `${number(row.result)} resultados` : '— resultados'}
                <span>{hasRowTarget ? `${row.originalTargetKpi !== undefined ? 'Meta revisada' : 'Meta'}: ${number(row.target)}` : 'Sin meta definida'}</span>
              </small>
              {row.originalTargetKpi !== undefined && <p className="target-revision">Flow original: {number(row.originalTargetKpi)} · revisada el {row.targetRevisionDate?.split('-').reverse().join('/') || '09/10/2026'}</p>}
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span>
          <i />
          Resultado: verde al ritmo, coral por debajo
        </span>
        <span>
          <b />
          Meta mensual
        </span>
        {pace.percent < 100 && <span><b className="pace-legend" />Ritmo esperado al corte</span>}
      </div>
    </section>
  );
}

function SpendChart({ report }: { report: ReportView }) {
  const total = report.rows.reduce((sum, row) => sum + (row.spend || 0), 0);

  if (total <= 0) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <h3>Distribución de inversión</h3>
          <span className="mini-tag">COP</span>
        </div>
        <div className="spend-total">
          <strong>—</strong>
          <span>Inversión · {report.label.toLowerCase()}</span>
        </div>
        <p className="subtle">No se registra inversión publicitaria en este período para esta línea.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h3>Distribución de inversión</h3>
        <span className="mini-tag">COP</span>
      </div>
      <div className="spend-total">
        <strong>{money(total)}</strong>
        <span>Inversión · {report.label.toLowerCase()}</span>
      </div>
      <div className="allocation">
        {report.rows.map((row, i) => {
          const spend = row.spend || 0;
          return (
            <div
              key={row.name}
              style={{ width: `${(spend / total) * 100}%`, opacity: 1 - i * 0.4 }}
              title={`${row.name}: ${money(row.spend)}`}
            />
          );
        })}
      </div>
      {report.rows.map((row, i) => (
        <div className="spend-row" key={row.name}>
          <span>
            <i style={{ opacity: 1 - i * 0.4 }} />
            {row.name}
          </span>
          <strong>{money(row.spend)}</strong>
        </div>
      ))}
    </section>
  );
}

function CampaignTable({ report }: { report: ReportView }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <h3>Detalle por línea de campaña</h3>
        <span className="mini-tag">{report.unit.toUpperCase()}</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Línea</th>
              <th>Resultado</th>
              <th>Meta</th>
              <th>Presupuesto</th>
              <th>Inversión</th>
              <th>Costo objetivo</th>
              <th>Costo real</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#889582', padding: '24px 0' }}>
                  Sin líneas publicitarias registradas en este período.
                </td>
              </tr>
            ) : (
              report.rows.map(row => (
                <tr key={row.name}>
                  <td>
                    <span className="table-dot" />
                    {row.name}
                  </td>
                  <td>
                    {row.result != null ? `${number(row.result)} ` : '— '}
                    {row.result != null && <small>{row.unit}</small>}
                  </td>
                  <td>{row.target != null ? number(row.target) : '—'}{row.originalTargetKpi !== undefined && <small className="target-revision">Revisada · Flow: {number(row.originalTargetKpi)}</small>}</td>
                  <td>{money(row.budget)}</td>
                  <td>{money(row.spend)}</td>
                  <td>{money(row.targetCostPerResult)}</td>
                  <td>{money(row.costPerResult)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Metas y presupuestos del Flow del mes, salvo las metas revisadas indicadas; resultados del último corte de Meta Graph API. «—» indica que aún no hay métrica sincronizada para esa línea.
      </p>
    </section>
  );
}

function Executive({ note, source }: { note: string; source: string }) {
  return (
    <section className="executive">
      <div className="executive-icon">✳</div>
      <div>
        <p className="eyebrow">RESUMEN EJECUTIVO / RENDIMIENTO REAL</p>
        <p>{note}</p>
        <small>{source}</small>
      </div>
    </section>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action: () => void }) {
  return (
    <section className="panel empty">
      <span>◎</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary" onClick={action}>
        Ver conexiones ↗
      </button>
    </section>
  );
}

function GoogleReport({
  projectName,
  connection,
  campaigns,
  month,
  mode,
  onNavigate,
}: {
  projectName: string;
  connection?: ConnectionStatus;
  campaigns: CampaignMetrics[];
  month: string;
  mode: 'historical' | 'live';
  onNavigate: () => void;
}) {
  const isError = connection?.state === 'error';

  if (connection?.state === 'not_connected') {
    return <section className="panel empty"><h2>Google Ads · {projectName}</h2><p>{connection.details || 'No hay una cuenta de Google Ads asignada a este proyecto.'}</p><button className="primary" onClick={onNavigate}>Ver conexiones ↗</button></section>;
  }

  // Si hubo error de conexión a Google Ads API
  if (isError) {
    return (
      <section className="panel" style={{ maxWidth: '840px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div className="provider-icon" style={{ margin: 0, fontSize: '32px' }}>G</div>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 4px' }}>GOOGLE ADS · DIAGNÓSTICO</p>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Google Ads · {projectName}</h2>
          </div>
        </div>

        <div
          style={{
            background: '#1c1f17',
            border: '1px solid #4a3e26',
            borderRadius: '7px',
            padding: '18px 20px',
            marginBottom: '22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#f59e0b', fontSize: '16px' }}>⚠️</span>
            <strong style={{ color: '#fef3c7', fontSize: '13px' }}>
              Estado de la conexión
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#d1d5db', lineHeight: 1.6 }}>
            {connection?.details || 'Error al conectar con Google Ads API.'}
          </p>
        </div>

        <button className="primary" onClick={onNavigate}>
          Ver conexiones ↗
        </button>
      </section>
    );
  }

  // Si no hay campañas con actividad en el período seleccionado
  if (campaigns.length === 0) {
    return (
      <section className="panel empty" style={{ maxWidth: '840px', margin: '20px auto', padding: '40px 24px' }}>
        <div className="provider-icon" style={{ margin: '0 auto 16px' }}>G</div>
        <p className="eyebrow" style={{ margin: '0 0 8px' }}>GOOGLE ADS · {month}</p>
        <h2 style={{ margin: '0 0 12px' }}>Sin actividad registrada</h2>
        <p style={{ maxWidth: '540px', margin: '0 auto 24px', color: '#a0af97', fontSize: '13px', lineHeight: 1.6 }}>
          {mode === 'live'
            ? 'La cuenta de Google Ads está conectada, pero no registra inversión ni conversiones en el mes seleccionado.'
            : `No se registraron métricas de gasto ni conversiones en Google Ads para este proyecto en el período de ${month}.`}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="primary" onClick={onNavigate}>
            Ver conexiones ↗
          </button>
        </div>
      </section>
    );
  }

  // Si hay campañas registradas (por ejemplo septiembre 2026)
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.platformConversions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : null;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;

  return (
    <>
      <div className="dashboard-heading">
        <SectionTitle
          kicker="GOOGLE ADS / RENDIMIENTO"
          title={`Campañas y resultados · ${month}`}
        />
      </div>

      <div className="metrics">
        <article className="metric">
          <div className="metric-label">Inversión Google Ads<span>↗</span></div>
          <strong>{money(totalSpend)} COP</strong>
          <small>Presupuesto ejecutado</small>
        </article>
        <article className="metric highlight">
          <div className="metric-label">Conversiones totales<span>↗</span></div>
          <strong>{number(totalConversions)}</strong>
          <small>Acciones registradas en Google Ads</small>
        </article>
        <article className="metric">
          <div className="metric-label">CPA promedio<span>↗</span></div>
          <strong>{avgCpa ? `${money(avgCpa)} COP` : '—'}</strong>
          <small>Costo por conversión</small>
        </article>
        <article className="metric">
          <div className="metric-label">Clics e Impresiones<span>↗</span></div>
          <strong>{number(totalClicks)} clics</strong>
          <small>{number(totalImpressions)} imp · CTR {avgCtr ? avgCtr.toFixed(2) : 0}%</small>
        </article>
      </div>

      <GoogleVisuals campaigns={campaigns} />

      <section className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-heading">
          <h3>Detalle por campaña en Google Ads</h3>
          <span className="mini-tag">API v25 · Cuenta 9240696515</span>
        </div>
        <div className="table-scroll"><table className="campaign-table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Clics</th>
              <th style={{ textAlign: 'right' }}>Impresiones</th>
              <th style={{ textAlign: 'right' }}>Inversión COP</th>
              <th style={{ textAlign: 'right' }}>Conversiones</th>
              <th style={{ textAlign: 'right' }}>CPA</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const cpa = c.platformConversions && c.platformConversions > 0
                ? (c.spend || 0) / c.platformConversions
                : null;
              const isPmax = c.campaignName.toUpperCase().includes('PMAX');
              return (
                <tr key={c.campaignId}>
                  <td>
                    <strong>{c.campaignName}</strong>
                    <div style={{ fontSize: '11px', color: '#a0af97' }}>ID: {c.campaignId}</div>
                  </td>
                  <td>
                    <span className="mini-tag" style={{ textTransform: 'uppercase' }}>
                      {isPmax ? 'Performance Max' : 'Search'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{number(c.clicks || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{number(c.impressions || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{money(c.spend || 0)} COP</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{number(c.platformConversions || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{cpa ? `${money(cpa)} COP` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>

      <Executive
        note={`Datos extraídos directamente de Google Ads API v25 para la cuenta publicitaria ID 9240696515 (${projectName}). En este período se ejecutaron ${money(totalSpend)} COP en inversión, generando un total de ${number(totalConversions)} conversiones y un costo promedio por conversión de ${avgCpa ? money(avgCpa) : '0'} COP.`}
        source={
          mode === 'historical'
            ? 'Fuente: Google Ads API v25 · Corte mensual 01 al 30 de septiembre 2026'
            : 'Fuente: Google Ads API v25 en vivo · Acumulado al día actual de octubre 2026'
        }
      />
    </>
  );
}
