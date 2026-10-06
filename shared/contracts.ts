export type Provider = 'meta' | 'google_ads' | 'hubspot';

export interface ConnectionStatus {
  projectId: import('./projects').ProjectId;
  provider: Provider;
  label: string;
  state: 'not_connected' | 'connected' | 'error';
  lastSuccessfulSyncAt: string | null;
  details?: string;
}

export interface MonthlyTarget {
  id?: string;
  projectId: import('./projects').ProjectId;
  month: string;
  channel: Provider;
  objective: string;
  lineName: string;
  targetKpi: number;
  targetUnit: string;
  budgetSpend: number;
  targetCostPerResult: number;
}

export interface CampaignMetrics {
  projectId: import('./projects').ProjectId;
  provider: 'meta' | 'google_ads';
  accountId: string;
  campaignId: string;
  campaignName: string;
  lineName?: string;
  month?: string;
  date: string;
  accountTimezone: string;
  currency: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  platformConversions: number | null;
  conversionDefinition: string;
  fetchedAt: string;
}

export interface ReportRowItem {
  name: string;
  result: number | null;
  target: number | null;
  spend: number | null;
  budget: number | null;
  unit: string;
  costPerResult: number | null;
}

export interface ReportView {
  id: string;
  label: string;
  unit: string;
  stats: [string, string, string][];
  rows: ReportRowItem[];
  note: string;
  slides?: string;
}

export interface Overview {
  projectId: import('./projects').ProjectId;
  mode: 'setup' | 'live';
  month: string;
  reportingTimezone: 'America/Bogota';
  connections: ConnectionStatus[];
  campaigns: CampaignMetrics[];
  targets: MonthlyTarget[];
  reports: Record<string, ReportView>;
  sync: { intervalDays: 7; nextScheduledAt: string | null; lastSuccessfulAt: string | null };
}
