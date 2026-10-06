import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { handler } from '../server/handler';

test('cada proyecto expone solo sus conexiones y rechaza proyectos desconocidos', async () => {
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const project of ['pekin', 'metriku', 'skala']) {
      const response = await fetch(`${base}/api/overview?project=${project}`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.projectId, project);
      assert.deepEqual(body.connections.map((item: {provider: string}) => item.provider), project === 'pekin' ? ['meta', 'google_ads', 'hubspot'] : ['meta', 'google_ads']);
      assert.ok(body.connections.every((item: {projectId: string}) => item.projectId === project));
      const syncStatus = (await fetch(`${base}/api/sync?project=${project}`, {method: 'POST'})).status;
      assert.ok([200, 409, 500].includes(syncStatus));
    }
    for (const suffix of ['', '?project=unknown']) {
      assert.equal((await fetch(`${base}/api/overview${suffix}`)).status, 400);
      assert.equal((await fetch(`${base}/api/sync${suffix}`, {method: 'POST'})).status, 400);
    }
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
