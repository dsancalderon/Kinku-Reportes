import type { Overview } from '../shared/contracts';
import { getConnections } from './integrations/index';
import type { ProjectId } from '../shared/projects';
export function getSetupOverview(projectId: ProjectId): Overview {
  return {
    projectId, mode: 'setup', reportingTimezone: 'America/Bogota', connections: getConnections(projectId), campaigns: [],
    sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
  };
}
