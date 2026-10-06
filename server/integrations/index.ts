import type { ConnectionStatus } from '../../shared/contracts';
import { projects, providerLabels, type ProjectId } from '../../shared/projects.js';
export function getConnections(projectId: ProjectId): ConnectionStatus[] {
  return projects.find(project => project.id === projectId)!.providers.map(provider => ({
    projectId, provider, label: providerLabels[provider], state: 'not_connected', lastSuccessfulSyncAt: null,
  }));
}
