import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { Store } from '../src/store.mjs';
import { createApp } from '../src/app.mjs';
import { retrieveLead, normalizeLead, LeadFetchError } from '../src/meta.mjs';

const config = { apiToken: 'test-access-token-more-than-24-chars', demoMode: false,
  appSecret: 'test-secret', verifyToken: 'verify-me', pageToken: 'test-page-token',
  graphVersion: 'v99.0', pageId: '123', formId: '456', webOrigin: 'http://localhost:8081' };
const event = id => ({ id, pageId: '123', formId: '456' });
const fixture = id => normalizeLead({ id, field_data: [
  { name: 'full_name', values: ['Ada Lovelace'] }, { name: 'email', values: ['ada@example.com'] },
] }, event(id), 'meta');
const payload = ids => ({ object: 'page', entry: [{ id: '123', changes: ids.map(id => ({ field: 'leadgen', value: { leadgen_id: id, page_id: '123', form_id: '456' } })) }] });
async function service(t, overrides = {}, options = {}) {
  const store = new Store(':memory:');
  const app = createApp({ ...config, ...overrides }, store, { retrieve: async e => fixture(e.id), ...options });
  app.httpServer.listen(0, '127.0.0.1'); await once(app.httpServer, 'listening');
  const port = app.httpServer.address().port;
  t.after(async () => { await app.close(); store.close(); });
  return { ...app, store, base: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/live` };
}
function post(base, body, signature) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return fetch(`${base}/webhooks/meta`, { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-Hub-Signature-256': signature || `sha256=${createHmac('sha256', config.appSecret).update(raw).digest('hex')}` }, body: raw });
}
async function live(url, token = config.apiToken, options = {}) {
  const socket = new WebSocket(url, options);
  await once(socket, 'open');
  const next = once(socket, 'message');
  socket.send(JSON.stringify({ type: 'auth', token }));
  const [raw] = await next;
  return { socket, snapshot: JSON.parse(raw.toString()) };
}
test('Meta verification returns exactly the challenge and rejects wrong tokens', async t => {
  const { base } = await service(t);
  const ok = await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`);
  assert.equal(ok.status, 200); assert.equal(await ok.text(), '12345');
  assert.equal((await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=12345`)).status, 403);
});
test('signed batch creates leads and pushes them to an already-open client; duplicate delivery stays unique', async t => {
  const s = await service(t);
  const client = await live(s.ws);
  assert.equal(client.snapshot.leads.length, 0);
  const received = [];
  const completed = new Promise(resolve => client.socket.on('message', raw => {
    const message = JSON.parse(raw.toString()); received.push(message); if (received.length === 2) resolve();
  }));
  assert.equal((await post(s.base, payload(['1001', '1002']))).status, 200);
  await completed;
  assert.deepEqual(new Set(received.map(m => m.lead.id)), new Set(['1001', '1002']));
  assert.ok(received.every(m => m.type === 'lead.created' && m.lead.email === 'ada@example.com'));
  await post(s.base, payload(['1001', '1002'])); await s.worker.kick();
  assert.equal(s.store.stats().leads, 2); assert.equal(received.length, 2);
  client.socket.terminate();
});
test('reconnect snapshot includes leads delivered while disconnected', async t => {
  const s = await service(t);
  const first = await live(s.ws); first.socket.terminate();
  await post(s.base, payload(['2001'])); await s.worker.kick();
  const next = await live(s.ws);
  assert.equal(next.snapshot.leads[0].id, '2001'); next.socket.terminate();
});
test('bad signatures, malformed signed JSON, and foreign Page/form events do not create leads', async t => {
  const s = await service(t);
  assert.equal((await post(s.base, payload(['3001']), 'sha256=' + '0'.repeat(64))).status, 403);
  assert.equal((await post(s.base, '{broken')).status, 400);
  const foreign = payload(['3002']); foreign.entry[0].changes[0].value.page_id = '999';
  await post(s.base, foreign);
  const wrongForm = payload(['3003']); wrongForm.entry[0].changes[0].value.form_id = '999';
  await post(s.base, wrongForm); await s.worker.kick(); assert.equal(s.store.stats().leads, 0);
});
test('HTTP and WebSocket lead access require the app token', async t => {
  const s = await service(t);
  assert.equal((await fetch(`${s.base}/api/leads`)).status, 401);
  const socket = new WebSocket(s.ws); await once(socket, 'open');
  const closed = once(socket, 'close'); socket.send(JSON.stringify({ type: 'auth', token: 'bad' }));
  const [code] = await closed; assert.equal(code, 4401);
});
test('temporary retrieval failure is stored for retry and succeeds later', async t => {
  let attempts = 0;
  const s = await service(t, {}, { retrieve: async e => { if (++attempts === 1) throw new LeadFetchError('graph_2'); return fixture(e.id); } });
  await post(s.base, payload(['4001'])); await s.worker.kick();
  assert.equal(s.store.stats().pending, 1); assert.equal(s.store.stats().leads, 0);
  s.store.db.prepare('UPDATE jobs SET next_try=0').run();
  await s.worker.kick(); assert.equal(s.store.stats().leads, 1); assert.equal(s.store.stats().pending, 0);
});
test('permanent retrieval failures remain visible and can be explicitly retried', async t => {
  const s = await service(t, {}, { retrieve: async () => { throw new LeadFetchError('graph_190', true); } });
  await post(s.base, payload(['4002'])); await s.worker.kick();
  assert.equal(s.store.stats().failed, 1); assert.equal(s.store.stats().pending, 0);
  assert.equal(s.store.retryFailed(), 1); assert.equal(s.store.stats().pending, 1);
});
test('committed inbox and leads survive closing and reopening the database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lead-live-test-')), path = join(dir, 'test.sqlite');
  let store;
  try {
    store = new Store(path); store.enqueue([event('5001'), event('5002')]); store.complete('5001', fixture('5001')); store.close();
    store = new Store(path); assert.equal(store.list()[0].id, '5001'); assert.equal(store.due().id, '5002');
  } finally { store?.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('demo mode is labelled and Meta endpoints are disabled; production has no demo injection', async t => {
  const s = await service(t, { demoMode: true });
  assert.equal((await post(s.base, payload(['6001']))).status, 503);
  const res = await fetch(`${s.base}/api/demo/leads`, { method: 'POST', headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 202); await s.worker.kick(); assert.equal(s.store.list()[0].source, 'demo');
  const production = await service(t);
  assert.equal((await fetch(`${production.base}/api/demo/leads`, { method: 'POST', headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
});
test('Graph retrieval uses bearer auth, maps fields, and classifies token errors without exposing secrets', async () => {
  const lead = await retrieveLead(event('7001'), config, async (url, options) => {
    assert.equal(url.searchParams.has('access_token'), false);
    assert.equal(options.headers.Authorization, `Bearer ${config.pageToken}`);
    return Response.json({ id: '7001', created_time: '2026-10-13T00:00:00+0000', field_data: [
      { name: 'first_name', values: ['Grace'] }, { name: 'last_name', values: ['Hopper'] },
    ] });
  });
  assert.equal(lead.name, 'Grace Hopper'); assert.equal(lead.email, '');
  await assert.rejects(retrieveLead(event('7001'), config, async () => Response.json({ error: { code: 190, message: 'secret-token' } }, { status: 400 })), error => error.message === 'graph_190' && error.permanent);
});

test('Android default Origin does not prevent authenticated native live delivery', async t => {
  const s = await service(t);
  const client = await live(s.ws, config.apiToken, { origin: 'http://10.0.2.2:4000' });
  assert.equal(client.snapshot.type, 'snapshot');
  const next = once(client.socket, 'message');
  await post(s.base, payload(['8001']));
  const [raw] = await next;
  assert.equal(JSON.parse(raw.toString()).lead.id, '8001');
  client.socket.terminate();
});
