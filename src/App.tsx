import { useEffect, useState, type CSSProperties } from 'react';
import type { Overview, Provider, ReportView, ReportRowItem, ConnectionStatus } from '../shared/contracts';
import { projects, providerLabels, type ProjectId } from '../shared/projects';
import { getOverview } from './lib/api';
import { money, number } from './lib/historical';
import { SyncStatus } from './components/SyncStatus';

type View = 'summary' | Provider | 'connections';

function getLivePeriodLabel(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  return `01 — ${day} OCT, ${now.getFullYear()}`;
}

export function App() {
  const [projectId, setProject] = useState<ProjectId>('pekin');
  const [view, setView] = useState<View>('summary');
  const [mode, setMode] = useState<'historical' | 'live'>('historical');
  const [objective, setObjective] = useState<string>('leads');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const project = projects.find(item => item.id === projectId)!;
  const selectedMonth = mode === 'historical' ? '2026-09' : '2026-10';

  useEffect(() => {
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
  }, [projectId, mode]);

  function selectProject(id: ProjectId) {
    setProject(id);
    setView('summary');
  }

  const reportsMap = overview?.reports || {};
  const availableReports = Object.values(reportsMap);
  const report: ReportView | undefined = reportsMap[objective] || availableReports[0];

  return (
    <div className="app" style={{ '--project': project.accent } as CSSProperties}>
      <aside className="sidebar">
        <a href="#dashboard" className="agency">
          <img src="/brand/tictac-logo.png" alt="TicTac Agency Performance" />
        </a>
        <div className="workspace-label">
          KINKU <span>REPORTING STUDIO</span>
        </div>
        <p className="nav-label">PROYECTOS</p>
        <nav className="project-nav" aria-label="Proyectos">
          {projects.map((item, i) => (
            <button
              key={item.id}
              aria-pressed={projectId === item.id}
              onClick={() => selectProject(item.id)}
            >
              <span className="project-dot" style={{ background: item.accent }} />
              {item.name}
              <small>0{i + 1}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>El sonido al éxito.</p>
          <span className="sidebar-caption">TIC TAC / AGENCY PERFORMANCE</span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <span>
            Kinku <span className="separator">/</span> {project.name}{' '}
            <span className="separator">/</span> Reporte de rendimiento
          </span>
        </header>

        <main id="dashboard">
          <div className="page-heading">
            <div>
              <p className="eyebrow">TIC TAC AGENCY × KINKU</p>
              <h1>
                Todo el panorama.
                <br />
                <span>Una mejor decisión.</span>
              </h1>
            </div>
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
                {mode === 'historical' ? '01 — 30 SEP, 2026' : getLivePeriodLabel()}
              </span>
            </div>
          </div>

          <SyncStatus
            key={`${projectId}-${mode}`}
            projectId={projectId}
            sync={overview?.projectId === projectId ? overview.sync : undefined}
          />

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
            {(['summary', ...project.providers, 'connections'] as View[]).map(item => (
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
                {mode === 'historical'
                  ? 'INFORME HISTÓRICO · SEPTIEMBRE 2026'
                  : 'MES EN CURSO · OCTUBRE 2026 (AL DÍA)'}
              </span>
              <p>
                {mode === 'historical'
                  ? 'Corte mensual consolidado (01 al 30 de septiembre de 2026) extraído de Meta Ads y contrastado con las metas del Flow.'
                  : 'Métricas reales extraídas de Meta Ads acumuladas desde el 01 de octubre hasta hoy. Sin números predeterminados ni inventados.'}
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
                          ? 'Requiere acceso Explorer'
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
              onNavigate={() => setView('connections')}
            />
          ) : view === 'hubspot' ? (
            <HubspotReport projectName={project.name} onNavigate={() => setView('connections')} />
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
                <GoalChart report={report} />
                <SpendChart report={report} />
              </div>

              <CampaignTable report={report} />

              <Executive
                note={report.note}
                source={
                  mode === 'historical'
                    ? 'Fuente: Meta Ads Graph API + Flow de Metas Septiembre 2026'
                    : 'Fuente: Meta Ads Graph API en vivo · Período acumulado 01 al día actual'
                }
              />

              {view === 'summary' && (
                <div className="channel-links">
                  {project.providers
                    .filter(item => item !== 'meta')
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

          <footer>
            <span>
              TIC TAC <strong>AGENCY PERFORMANCE</strong>
            </span>
            <span>
              {project.name} ·{' '}
              {mode === 'historical'
                ? 'Histórico septiembre 2026'
                : 'Octubre 2026 · acumulado al día'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
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

function GoalChart({ report }: { report: ReportView }) {
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
      <p className="subtle">El objetivo marca el punto de referencia.</p>
      <div className="goal-chart">
        {report.rows.map(row => {
          const hasRowTarget = typeof row.target === 'number' && row.target > 0;
          const pct = hasRowTarget && row.result != null && row.target ? (row.result / row.target) * 100 : null;
          const fillWidth = pct !== null ? Math.min(100, Math.max(0, (pct / max) * 100)) : 0;

          return (
            <div className="goal-row" key={row.name}>
              <div>
                <span>{row.name}</span>
                <strong>{pct !== null ? `${number(pct)}%` : '—'}</strong>
              </div>
              <div className="goal-track">
                <div className="goal-fill" style={{ width: `${fillWidth}%` }} />
                {hasRowTarget && (
                  <span className="target-marker" style={{ left: `${(100 / max) * 100}%` }} />
                )}
              </div>
              <small>
                {row.result != null ? `${number(row.result)} resultados` : '— resultados'}
                <span>{hasRowTarget ? `Meta: ${number(row.target)}` : 'Sin meta definida'}</span>
              </small>
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span>
          <i />
          Resultado del período
        </span>
        <span>
          <b />
          Meta del período
        </span>
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
              <th>Inversión</th>
              <th>Costo / resultado</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#889582', padding: '24px 0' }}>
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
                  <td>{row.target != null ? number(row.target) : '—'}</td>
                  <td>{money(row.spend)}</td>
                  <td>{money(row.costPerResult)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Datos extraídos directamente de las fuentes oficiales (Meta Graph API). Solo se listan líneas con métricas verificadas.
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
  onNavigate,
}: {
  projectName: string;
  connection?: ConnectionStatus;
  onNavigate: () => void;
}) {
  const isCloudTestMode =
    connection?.details?.includes('Test access') ||
    connection?.details?.includes('Test') ||
    connection?.details?.includes('Explorer');

  return (
    <section className="panel" style={{ maxWidth: '840px', margin: '20px auto', padding: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div className="provider-icon" style={{ margin: 0, fontSize: '32px' }}>G</div>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 4px' }}>GOOGLE ADS · ESTADO DE INTEGRACIÓN</p>
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
            {isCloudTestMode
              ? 'Proyecto Google Cloud en nivel "Test Access"'
              : 'Verificación de credenciales de Google Ads'}
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#d1d5db', lineHeight: 1.6 }}>
          {connection?.details ||
            'La clave JSON de la cuenta de servicio existe en el servidor, pero Google Ads API requiere nivel de acceso "Explorer" para consultar cuentas publicitarias de producción.'}
        </p>
      </div>

      <div style={{ fontSize: '12px', color: '#a0af97', lineHeight: 1.7, marginBottom: '24px' }}>
        <strong style={{ color: '#e5e7eb', display: 'block', marginBottom: '10px', fontSize: '13px' }}>
          Cómo habilitar la extracción de campañas de producción:
        </strong>
        <ol style={{ margin: 0, paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            Entra a <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>console.cloud.google.com</a>) y selecciona el proyecto <code>kinku-reporting</code>.
          </li>
          <li>
            Dirígete a <strong>APIs y servicios → Google Ads API</strong>.
          </li>
          <li>
            En el apartado <strong>Nivel de acceso (Access Level)</strong>, haz clic en <strong>Solicitar acceso Explorer (Explorer Access)</strong>. <em>(Google lo otorga para uso interno de la organización)</em>.
          </li>
          <li>
            En tu cuenta de Google Ads (ID <code>9240696515</code>), ve a <strong>Administración → Acceso y seguridad</strong> y confirma que el correo de la cuenta de servicio (<code>api-reporting@kinku-reporting.iam.gserviceaccount.com</code>) tenga acceso de <strong>Solo lectura</strong>.
          </li>
        </ol>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="primary" onClick={onNavigate}>
          Ver panel de Conexiones ↗
        </button>
      </div>
    </section>
  );
}

function HubspotReport({ projectName, onNavigate }: { projectName: string; onNavigate: () => void }) {
  return (
    <section className="panel empty">
      <div className="provider-icon">H</div>
      <h2>HubSpot · {projectName}</h2>
      <p>
        El acceso a la cuenta comercial de HubSpot se encuentra pendiente. Tan pronto se conceda el acceso, aquí se reflejará el embudo de contactos y oportunidades en tiempo real.
      </p>
      <button className="primary" onClick={onNavigate}>
        Ver conexiones ↗
      </button>
    </section>
  );
}
