import type { ReportView } from '../../shared/contracts';
import { money, number } from './historical';
import { monthlyPace } from './pace';

export function executiveReading(report: ReportView, month: string, now: Date = new Date()) {
  const measured = report.rows.filter(row => row.result !== null);
  const targeted = report.rows.filter(row => row.target !== null && row.target > 0 && row.unit === report.unit);
  const total = measured.reduce((sum, row) => sum + (row.result || 0), 0);
  const spend = measured.reduce((sum, row) => sum + (row.spend || 0), 0);
  const pace = monthlyPace(month, now).percent;
  const analysis: string[] = [];
  const recommendations: string[] = [];

  if (!measured.length) {
    return {
      analysis: [`Aún no hay resultados extraídos de Meta Ads para ${report.label.toLowerCase()} en este período.`],
      recommendations: ['Verificar la sincronización y revisar el cumplimiento cuando Meta entregue resultados.'],
    };
  }

  analysis.push(`${number(total)} ${report.unit} con ${money(spend)} COP invertidos en ${measured.length} ${measured.length === 1 ? 'línea' : 'líneas'} con datos.`);
  if (targeted.length && targeted.every(row => row.result !== null)) {
    const target = targeted.reduce((sum, row) => sum + (row.target || 0), 0);
    const result = targeted.reduce((sum, row) => sum + (row.result || 0), 0);
    const fulfillment = result / target * 100;
    analysis.push(`Las líneas con meta acumulan ${number(fulfillment)}% de cumplimiento frente al ${number(pace)}% esperado para el corte.`);
    const lagging = targeted.filter(row => (row.result || 0) / (row.target || 1) * 100 < pace);
    if (lagging.length) {
      recommendations.push(`Revisar ${lagging.map(row => row.name).join(' y ')}: ${lagging.length === 1 ? 'está' : 'están'} por debajo del ritmo de la meta mensual.`);
    } else {
      recommendations.push(`Mantener el seguimiento de ${report.unit} y vigilar que el ritmo se sostenga hasta el cierre del mes.`);
    }
  } else if (targeted.length) {
    analysis.push(`${measured.length} de ${report.rows.length} líneas tienen resultados; el cumplimiento conjunto queda pendiente de extracción completa.`);
    recommendations.push('Revisar la sincronización de las líneas sin resultados antes de evaluar el cumplimiento total.');
  } else {
    analysis.push('No hay una meta comparable para calcular cumplimiento de este objetivo.');
    recommendations.push(`Definir una meta de ${report.unit} para evaluar el avance del próximo corte.`);
  }

  const budgeted = measured.filter(row => row.budget !== null && row.budget > 0 && row.spend !== null);
  if (budgeted.length) {
    const budget = budgeted.reduce((sum, row) => sum + (row.budget || 0), 0);
    const budgetSpend = budgeted.reduce((sum, row) => sum + (row.spend || 0), 0);
    const overBudget = budgeted.filter(row => (row.spend || 0) > (row.budget || 0));
    analysis.push(`Se ha utilizado ${number(budgetSpend / budget * 100)}% del presupuesto de las líneas con plan de inversión.`);
    if (overBudget.length) recommendations.push(`Revisar ${overBudget.map(row => row.name).join(' y ')}: ${overBudget.length === 1 ? 'supera' : 'superan'} el presupuesto de su línea antes de ampliar la inversión.`);
    else if (targeted.length && targeted.every(row => row.result !== null) && targeted.some(row => (row.result || 0) / (row.target || 1) * 100 < pace))
      recommendations.push('Comparar creativos y segmentos con mejor costo por resultado antes de redistribuir presupuesto.');
  }

  if (report.unit === 'leads') recommendations.push('Contrastar el volumen de leads con su avance comercial en HubSpot cuando exista el corte correspondiente.');
  else if (report.unit === 'interacciones') recommendations.push('Revisar la calidad de la interacción por anuncio; interacciones y leads son métricas distintas.');
  else recommendations.push('Revisar frecuencia y distribución del alcance para sostener la exposición sin saturación.');

  return { analysis, recommendations };
}
