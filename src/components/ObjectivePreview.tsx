import { useState } from 'react';
import { metaDashboards } from '../../shared/metaObjectives';

export function ObjectivePreview() {
  const [selected, setSelected] = useState<string>(metaDashboards[0].objective);
  const dashboard = metaDashboards.find(item => item.objective === selected)!;
  return <section className="objective-preview" aria-labelledby="objectives-heading">
    <p className="eyebrow">DASHBOARDS DE META</p><h2 id="objectives-heading">Un objetivo, una lectura diferente</h2>
    <p className="preview-description">Vista previa de la estructura. Al conectar Meta, aparecerán los objetivos de tus campañas activas.</p>
    <div className="objective-options" aria-label="Objetivos de campaña">{metaDashboards.map(item => <button key={item.objective} aria-pressed={item.objective === selected} onClick={() => setSelected(item.objective)}>{item.label}</button>)}</div>
    <article className="objective-detail"><p className="eyebrow">{dashboard.label}</p><h3>{dashboard.focus}</h3>
      <div className="metric-grid">{dashboard.metrics.map(metric => <div className="metric" key={metric}><span>{metric}</span><strong>—</strong><small>Sin datos</small></div>)}</div>
      <div className="chart-placeholder"><span aria-hidden="true">▥</span><p>{dashboard.chart}</p><small>La gráfica aparecerá con la primera importación.</small></div>
      <p className="objective-note">{dashboard.note}</p>
    </article>
  </section>;
}
