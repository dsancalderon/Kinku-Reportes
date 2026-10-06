import type { IncomingMessage, ServerResponse } from 'node:http';

export default function healthHandler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.writeHead(200);
  res.end(JSON.stringify({ status: 'ok', mode: 'setup' }));
}
