import type { Provider } from './contracts';
export type ProjectId = 'pekin' | 'metriku' | 'skala';
export const projects: { id: ProjectId; name: string; accent: string; image: string; description: string; providers: Provider[] }[] = [
  { id: 'pekin', name: 'Pekín', accent: '#EB603F', image: '/brand/pekin.png', description: 'Captación, reconocimiento y gestión comercial', providers: ['meta', 'google_ads', 'hubspot'] },
  { id: 'metriku', name: 'Métriku', accent: '#FA9B03', image: '/brand/metriku.jpg', description: 'Interacción, comunidad y posicionamiento', providers: ['meta', 'google_ads'] },
  { id: 'skala', name: 'Skala', accent: '#B389CE', image: '/brand/skala.jpg', description: 'Vivienda e inversión, bajo una misma visión', providers: ['meta', 'google_ads'] },
];
export function isProjectId(value: string | null): value is ProjectId { return projects.some(project => project.id === value); }
export const providerLabels: Record<Provider, string> = { meta: 'Meta Ads', google_ads: 'Google Ads', hubspot: 'HubSpot' };
