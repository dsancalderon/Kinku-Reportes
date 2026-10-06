import type {
  Overview,
  ConnectionStatus,
  CampaignMetrics,
  MonthlyTarget,
  ReportView,
  ReportRowItem
} from '../shared/contracts';
import { getConnections } from './integrations/index.js';
import type { ProjectId } from '../shared/projects.js';
import { getSupabase } from './db/supabase.js';
import { classifyCampaignLine, getObjectiveForLine } from './integrations/meta.js';

const money = (val: number | null) =>
  val === null || val === undefined || isNaN(val)
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

const number = (val: number | null) =>
  val === null || val === undefined || isNaN(val)
    ? '—'
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(val);

export async function getOverviewData(
  projectId: ProjectId,
  selectedMonth: string = '2026-09'
): Promise<Overview> {
  const baseConnections = getConnections(projectId);
  const supabase = getSupabase();

  if (!supabase) {
    return {
      projectId,
      mode: 'setup',
      month: selectedMonth,
      reportingTimezone: 'America/Bogota',
      connections: baseConnections,
      campaigns: [],
      targets: [],
      reports: {},
      sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
    };
  }

  try {
    // 1. Consultar cron y estado de sincronización
    const { data: schedule } = await supabase
      .from('sync_schedules')
      .select('interval_days, last_successful_at, next_scheduled_at')
      .eq('project_id', projectId)
      .maybeSingle();

    // 2. Consultar metas mensuales de Supabase para este proyecto y mes
    const { data: dbTargets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('project_id', projectId)
      .eq('month', selectedMonth);

    const targets: MonthlyTarget[] = (dbTargets || []).map(t => ({
      id: t.id,
      projectId: t.project_id as ProjectId,
      month: t.month,
      channel: t.channel,
      objective: t.objective,
      lineName: t.line_name,
      targetKpi: Number(t.target_kpi),
      targetUnit: t.target_unit,
      budgetSpend: Number(t.budget_spend),
      targetCostPerResult: Number(t.target_cost_per_result),
    }));

    // 3. Consultar campañas y métricas extraídas para este mes
    const { data: dbCampaigns } = await supabase
      .from('campaigns')
      .select(`
        id, external_id, name, status, objective,
        campaign_metrics (
          month, date, spend, impressions, clicks, leads, raw_data
        )
      `)
      .eq('project_id', projectId);

    const campaigns: CampaignMetrics[] = (dbCampaigns || []).map(camp => {
      const metric = Array.isArray(camp.campaign_metrics)
        ? camp.campaign_metrics.find(m => m.month === selectedMonth) || camp.campaign_metrics[0]
        : null;

      return {
        projectId,
        provider: 'meta',
        accountId: '',
        campaignId: camp.external_id,
        campaignName: camp.name,
        lineName: classifyCampaignLine(camp.name),
        month: metric?.month || selectedMonth,
        date: metric?.date || '',
        accountTimezone: 'America/Bogota',
        currency: 'COP',
        spend: metric?.spend ?? null,
        impressions: metric?.impressions ?? null,
        clicks: metric?.clicks ?? null,
        platformConversions: metric?.leads ?? null,
        conversionDefinition: 'Leads',
        fetchedAt: schedule?.last_successful_at || new Date().toISOString(),
      };
    });

    // 4. Construir Reportes agregados basados en extracciones reales vs metas
    const reports: Record<string, ReportView> = {};

    // Agrupación de métricas de Meta por línea de campaña para este mes
    const lineMetrics: Record<string, { spend: number; leads: number; impressions: number; engagement: number; hasData: boolean }> = {};

    (dbCampaigns || []).forEach(camp => {
      const m = Array.isArray(camp.campaign_metrics)
        ? camp.campaign_metrics.find(item => item.month === selectedMonth)
        : null;

      const line = classifyCampaignLine(camp.name);
      if (!lineMetrics[line]) {
        lineMetrics[line] = { spend: 0, leads: 0, impressions: 0, engagement: 0, hasData: false };
      }

      if (m && (m.spend > 0 || m.impressions > 0 || m.leads > 0)) {
        lineMetrics[line].spend += Number(m.spend || 0);
        lineMetrics[line].leads += Number(m.leads || 0);
        lineMetrics[line].impressions += Number(m.impressions || 0);
        lineMetrics[line].engagement += Number(m.raw_data?.engagement || 0);
        lineMetrics[line].hasData = true;
      }
    });

    // Determinar objetivos según proyecto
    const projectTargets = targets.filter(t => t.channel === 'meta');

    // Identificar objetivos presentes en targets (ej: 'leads', 'awareness', 'engagement')
    const uniqueObjectives = Array.from(new Set(projectTargets.map(t => t.objective)));
    if (uniqueObjectives.length === 0) {
      if (projectId === 'pekin') uniqueObjectives.push('leads', 'awareness');
      else if (projectId === 'metriku') uniqueObjectives.push('engagement');
      else if (projectId === 'skala') uniqueObjectives.push('leads');
    }

    uniqueObjectives.forEach(obj => {
      const objTargets = projectTargets.filter(t => t.objective === obj);
      const isAwareness = obj === 'awareness';
      const isEngagement = obj === 'engagement';
      const unit = isAwareness ? 'impresiones' : isEngagement ? 'interacciones' : 'leads';

      const rows: ReportRowItem[] = [];
      let totalResult = 0;
      let totalSpend = 0;
      let totalTarget = 0;
      let totalBudget = 0;
      let hasAnyExtractedData = false;

      // Si hay metas definidas para este objetivo
      if (objTargets.length > 0) {
        objTargets.forEach(t => {
          const extracted = lineMetrics[t.lineName];
          const hasData = extracted?.hasData ?? false;
          if (hasData) hasAnyExtractedData = true;

          const resValue = hasData
            ? (isAwareness ? extracted.impressions : isEngagement ? (extracted.engagement || extracted.impressions) : extracted.leads)
            : null;
          const spendValue = hasData ? extracted.spend : null;

          if (hasData) {
            totalResult += resValue || 0;
            totalSpend += spendValue || 0;
          }
          totalTarget += t.targetKpi;
          totalBudget += t.budgetSpend;

          rows.push({
            name: t.lineName,
            result: resValue,
            target: t.targetKpi,
            spend: spendValue,
            budget: t.budgetSpend,
            unit: t.targetUnit,
            costPerResult: (spendValue && resValue && resValue > 0) ? spendValue / resValue : null,
          });
        });
      } else {
        // Sin metas en BD para este objetivo (ej. líneas detectadas)
        Object.entries(lineMetrics).forEach(([lineName, ext]) => {
          if (ext.hasData && getObjectiveForLine(lineName) === obj) {
            hasAnyExtractedData = true;
            const resValue = isAwareness ? ext.impressions : isEngagement ? (ext.engagement || ext.impressions) : ext.leads;
            totalResult += resValue;
            totalSpend += ext.spend;
            rows.push({
              name: lineName,
              result: resValue,
              target: null,
              spend: ext.spend,
              budget: null,
              unit,
              costPerResult: resValue > 0 ? ext.spend / resValue : null,
            });
          }
        });
      }

      const label = obj === 'leads' ? 'Clientes potenciales' : obj === 'awareness' ? 'Reconocimiento' : 'Interacción';
      const fulfillment = (hasAnyExtractedData && totalTarget > 0)
        ? `${number((totalResult / totalTarget) * 100)}%`
        : '—';

      const stats: [string, string, string][] = [
        [
          label,
          hasAnyExtractedData ? number(totalResult) : '—',
          totalTarget > 0 ? `Meta del período: ${number(totalTarget)} ${unit}` : 'Sin meta definida',
        ],
        [
          'Inversión',
          hasAnyExtractedData ? money(totalSpend) : '—',
          totalBudget > 0 ? `Presupuesto: ${money(totalBudget)} COP` : 'COP · Meta Ads',
        ],
        [
          `Costo / ${unit === 'impresiones' ? 'mil' : unit.slice(0, -1)}`,
          (hasAnyExtractedData && totalResult > 0) ? money(totalSpend / totalResult) : '—',
          'COP · consolidado',
        ],
        [
          'Cumplimiento',
          fulfillment,
          hasAnyExtractedData ? `${number(totalResult)} de ${number(totalTarget)} ${unit}` : 'Pendiente de extracción',
        ],
      ];

      reports[obj] = {
        id: obj,
        label,
        unit,
        stats,
        rows,
        note: hasAnyExtractedData
          ? `Datos extraídos de Meta Ads para ${selectedMonth}. Total inversión: ${money(totalSpend)} COP con ${number(totalResult)} ${unit}.`
          : `No se registraron datos en Meta Ads para ${label} en el período ${selectedMonth}.`,
        slides: '',
      };
    });

    const hasSynced = !!schedule?.last_successful_at;

    const connections: ConnectionStatus[] = baseConnections.map(conn => {
      if (conn.provider === 'meta' && hasSynced) {
        return {
          ...conn,
          state: 'connected',
          lastSuccessfulSyncAt: schedule.last_successful_at,
        };
      }
      return conn;
    });

    return {
      projectId,
      mode: hasSynced ? 'live' : 'setup',
      month: selectedMonth,
      reportingTimezone: 'America/Bogota',
      connections,
      campaigns,
      targets,
      reports,
      sync: {
        intervalDays: schedule?.interval_days ?? 7,
        nextScheduledAt: schedule?.next_scheduled_at ?? null,
        lastSuccessfulAt: schedule?.last_successful_at ?? null,
      },
    };
  } catch (err) {
    console.error('Error fetching overview from Supabase:', err);
    return {
      projectId,
      mode: 'setup',
      month: selectedMonth,
      reportingTimezone: 'America/Bogota',
      connections: baseConnections,
      campaigns: [],
      targets: [],
      reports: {},
      sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
    };
  }
}
