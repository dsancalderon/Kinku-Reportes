import { createServer } from 'node:http';
import { handler } from './handler';

const port = Number(process.env.PORT || 3001);
createServer(handler).listen(port, '127.0.0.1', () => console.log(`API local: http://127.0.0.1:${port}`));
