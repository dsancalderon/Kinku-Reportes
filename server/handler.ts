import type { IncomingMessage, ServerResponse } from 'node:http';
import healthHandler from '../api/health';
import overviewHandler from '../api/overview';
import syncHandler from '../api/sync';

const isTest = process.execArgv?.includes?.('--test') || process.env.NODE_ENV === 'test';
if (!isTest && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(); } catch { /* ignore */ }
}

export async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;

  if (path === '/api/health' || path === '/health') {
    return healthHandler(req, res);
  }
  if (path === '/api/overview' || path === '/overview') {
    return overviewHandler(req, res);
  }
  if (path === '/api/sync' || path === '/sync') {
    return syncHandler(req, res);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
}
