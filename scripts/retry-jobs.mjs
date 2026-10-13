import { readConfig } from '../server/src/config.mjs';
const config = readConfig();
const response = await fetch(`http://127.0.0.1:${config.port}/api/jobs/retry`, {
  method: 'POST', headers: { Authorization: `Bearer ${config.apiToken}` },
});
if (!response.ok) throw new Error(`Retry failed (${response.status}).`);
console.log(await response.json());
