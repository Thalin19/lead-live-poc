import { createHmac } from 'node:crypto';
import { readConfig } from '../server/src/config.mjs';
const config = readConfig();
if (config.demoMode) throw new Error('Fill Meta configuration and set DEMO_MODE=false first.');
async function check(path, fields) {
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${path}`);
  if (fields) url.searchParams.set('fields', fields);
  url.searchParams.set('appsecret_proof', createHmac('sha256', config.appSecret).update(config.pageToken).digest('hex'));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.pageToken}` }, signal: AbortSignal.timeout(15_000) });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`Meta check failed: HTTP ${res.status}, Graph code ${body.error?.code || 'unknown'}. Check token permissions and Page lead access.`);
  return body;
}
await check(config.pageId, 'id'); console.log('Page is readable.');
const apps = await check(`${config.pageId}/subscribed_apps`, 'id,subscribed_fields');
console.log(`Apps subscribed to leadgen: ${apps.data?.filter(app => app.subscribed_fields?.includes('leadgen')).length || 0}. Verify your intended App ID is among them.`);
if (config.formId) { await check(config.formId, 'id'); console.log('Configured form is readable.'); }
if (process.argv[2]) { await check(process.argv[2], 'id,created_time,field_data'); console.log('Specified lead is retrievable.'); }
console.log('Read-only checks complete. No tokens or lead contact details were printed.');
