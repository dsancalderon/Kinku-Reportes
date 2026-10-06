import type { Overview } from '../../shared/contracts';
import type { ProjectId } from '../../shared/projects';

export async function getOverview(project: ProjectId, month?: string, signal?: AbortSignal): Promise<Overview> {
  const url = month
    ? `/api/overview?project=${project}&month=${encodeURIComponent(month)}`
    : `/api/overview?project=${project}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('No se pudo consultar el servidor de reportes.');
  return response.json() as Promise<Overview>;
}

