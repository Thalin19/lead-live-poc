import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const server = new URL('server/.env', root), mobile = new URL('mobile/.env', root);
if (!existsSync(server)) {
  const token = randomBytes(24).toString('hex');
  writeFileSync(server, `PORT=4000\nHOST=127.0.0.1\nDATABASE_PATH=./data/leads.sqlite\nAPI_TOKEN=${token}\nDEMO_MODE=true\nWEB_ORIGIN=http://localhost:8081\nMETA_GRAPH_VERSION=\nMETA_APP_SECRET=\nMETA_VERIFY_TOKEN=\nMETA_PAGE_ACCESS_TOKEN=\nMETA_PAGE_ID=\nMETA_FORM_ID=\n`);
}
if (!existsSync(mobile)) {
  const token = readFileSync(server, 'utf8').match(/^API_TOKEN=(.+)$/m)?.[1];
  if (!token) throw new Error('Set API_TOKEN in server/.env first.');
  writeFileSync(mobile, `EXPO_PUBLIC_API_URL=http://localhost:4000\nEXPO_PUBLIC_API_TOKEN=${token}\n`);
}
console.log(`Local demo configured at ${fileURLToPath(root)}. Existing configuration was preserved.`);
console.log('Start the server with npm start, then open another terminal and run npm run web or npm run mobile.');
