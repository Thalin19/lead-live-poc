import { readConfig } from './config.mjs';
import { Store } from './store.mjs';
import { createApp } from './app.mjs';

const config = readConfig();
const store = new Store(config.databasePath);
const service = createApp(config, store, { onError: code => console.error(`[lead-live] ${code}`) });
service.httpServer.listen(config.port, config.host, () => {
  console.log(`Lead Live listening on ${config.host}:${config.port} (${config.demoMode ? 'LOCAL DEMO' : 'META'} mode)`);
});
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await service.close(); store.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
service.httpServer.on('error', error => { console.error(`Server failed: ${error.code}`); process.exitCode = 1; void shutdown(); });
