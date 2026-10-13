import { readConfig } from '../server/src/config.mjs';
const config = readConfig();
if (!config.demoMode) throw new Error('Demo lead creation is disabled in Meta mode.');
const response = await fetch(`http://127.0.0.1:${config.port}/api/demo/leads`, {
  method: 'POST', headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: process.argv[2] || 'Alex Morgan', email: process.argv[3] || 'alex@example.com' }),
});
if (!response.ok) throw new Error(`Demo submission failed (${response.status}).`);
console.log('Sample lead queued. It should appear in the already-open app automatically. This is not a Meta test lead.');
