import type { Overview } from '../../shared/contracts';
import type { ProjectId } from '../../shared/projects';

export async function getOverview(project: ProjectId, signal?: AbortSignal): Promise<Overview> {
  const response = await fetch(`/api/overview?project=${project}`, { signal });
  if (!response.ok) throw new Error('No se pudo consultar el servidor de reportes.');
  return response.json() as Promise<Overview>;
}
