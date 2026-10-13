import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const serverDir = fileURLToPath(new URL('../', import.meta.url));
loadEnv({ path: resolve(serverDir, '.env'), quiet: true });

export function readConfig(env = process.env) {
  const config = {
    port: Number(env.PORT || 4000), host: env.HOST || '127.0.0.1',
    databasePath: resolve(serverDir, env.DATABASE_PATH || './data/leads.sqlite'),
    apiToken: env.API_TOKEN || '', demoMode: env.DEMO_MODE === 'true',
    webOrigin: env.WEB_ORIGIN || 'http://localhost:8081',
    graphVersion: env.META_GRAPH_VERSION || '', appSecret: env.META_APP_SECRET || '',
    verifyToken: env.META_VERIFY_TOKEN || '', pageToken: env.META_PAGE_ACCESS_TOKEN || '',
    pageId: env.META_PAGE_ID || '', formId: env.META_FORM_ID || '',
  };
  if (config.apiToken.length < 24) throw new Error('API_TOKEN must contain at least 24 characters. Run npm run setup.');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid PORT.');
  if (!config.demoMode) {
    for (const key of ['graphVersion', 'appSecret', 'verifyToken', 'pageToken', 'pageId']) {
      if (!config[key]) throw new Error(`Missing Meta configuration: ${key}`);
    }
    if (!/^v\d+\.\d+$/.test(config.graphVersion)) throw new Error('META_GRAPH_VERSION must look like vXX.0.');
    if (!/^\d+$/.test(config.pageId)) throw new Error('META_PAGE_ID must be numeric.');
    if (config.formId && !/^\d+$/.test(config.formId)) throw new Error('META_FORM_ID must be numeric.');
  }
  return config;
}
