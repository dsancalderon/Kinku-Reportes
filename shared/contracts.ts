export type Provider = 'meta' | 'google_ads' | 'hubspot';

export interface ConnectionStatus {
  projectId: import('./projects').ProjectId;
  provider: Provider;
  label: string;
  state: 'not_connected';
  lastSuccessfulSyncAt: string | null;
}

// Los proveedores y sus monedas se conservan separados al agregar resultados.
export interface CampaignMetrics {
  projectId: import('./projects').ProjectId;
  provider: 'meta' | 'google_ads';
  accountId: string;
  campaignId: string;
  campaignName: string;
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

export interface Overview {
  projectId: import('./projects').ProjectId;
  mode: 'setup';
  reportingTimezone: 'America/Bogota';
  connections: ConnectionStatus[];
  campaigns: CampaignMetrics[];
  sync: { intervalDays: 7; nextScheduledAt: string | null; lastSuccessfulAt: string | null };
}
