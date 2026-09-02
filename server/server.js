// This import MUST come before every other import in this file. ES module
// imports execute in the order they're written, before any of this file's
// own top-level code runs — so if this were below other imports that read
// process.env at module-load time (like app.js does), .env would still be
// unloaded when they ran.
import './config/env.js';

import http from 'node:http';
import app, { allowedOrigins } from './app.js';
import { connectDatabase } from './config/db.js';
import { initRealtime } from './realtime/socket.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace-this-with-a-long-random-string') {
  console.error(
    'JWT_SECRET is missing or still the placeholder value. Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
      'and set it in server/.env before starting the server.'
  );
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;
const httpServer = http.createServer(app);
initRealtime(httpServer, allowedOrigins);

connectDatabase()
  .then(() => httpServer.listen(port, () => console.log(`TouchBite API + realtime listening on port ${port}`)))
  .catch((error) => {
    console.error(`Unable to start server: ${error.message}`);
    process.exit(1);
  });
