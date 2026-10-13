import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { equalSecret, validSignature, extractEvents, normalizeLead } from './meta.mjs';
import { createWorker } from './worker.mjs';

export function createApp(config, store, options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (req.get('Origin') === config.webOrigin) {
      res.set('Access-Control-Allow-Origin', config.webOrigin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  const authenticated = new Set();
  function send(client, message) {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  }
  const worker = createWorker(store, config, lead => {
    for (const client of authenticated) send(client, { type: 'lead.created', lead, stats: store.stats() });
  }, options);
  const auth = (req, res, next) => equalSecret(req.get('Authorization'), `Bearer ${config.apiToken}`)
    ? next() : res.status(401).json({ error: 'unauthorized' });
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/status', auth, (_req, res) => res.json({ mode: config.demoMode ? 'demo' : 'meta', ...store.stats() }));
  app.get('/api/leads', auth, (_req, res) => res.json({ leads: store.list(), stats: store.stats() }));
  app.post('/api/jobs/retry', auth, (_req, res) => {
    const count = store.retryFailed();
    res.json({ retried: count });
    void worker.kick();
  });
  app.get('/webhooks/meta', (req, res) => {
    if (config.demoMode) return res.status(503).send('Meta integration is disabled in demo mode.');
    if (req.query['hub.mode'] === 'subscribe' && typeof req.query['hub.challenge'] === 'string'
      && equalSecret(req.query['hub.verify_token'], config.verifyToken)) {
      return res.type('text/plain').send(req.query['hub.challenge']);
    }
    res.sendStatus(403);
  });
  app.post('/webhooks/meta', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
    if (config.demoMode) return res.status(503).json({ error: 'meta_disabled_in_demo_mode' });
    if (!Buffer.isBuffer(req.body) || !validSignature(req.body, req.get('X-Hub-Signature-256'), config.appSecret)) {
      return res.status(403).json({ error: 'invalid_signature' });
    }
    let payload;
    try { payload = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ error: 'invalid_json' }); }
    // Acknowledge only after committing the inbox. Retries survive restarts.
    store.enqueue(extractEvents(payload, config));
    res.status(200).send('EVENT_RECEIVED');
    void worker.kick();
  });
  app.post('/api/demo/leads', auth, express.json({ limit: '8kb' }), (req, res) => {
    if (!config.demoMode) return res.sendStatus(404);
    const name = req.body?.name || 'Alex Morgan', email = req.body?.email || 'alex@example.com';
    if (typeof name !== 'string' || name.length > 100 || typeof email !== 'string' || email.length > 200) {
      return res.status(400).json({ error: 'invalid_demo_fields' });
    }
    const event = { id: `demo-${randomUUID()}`, pageId: 'demo-page', formId: 'demo-form' };
    const lead = normalizeLead({ field_data: [{ name: 'full_name', values: [name] }, { name: 'email', values: [email] }] }, event, 'demo');
    store.enqueue([{ ...event, demoLead: lead }]);
    res.status(202).json({ id: lead.id, source: 'demo' });
    void worker.kick();
  });
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'payload_too_large' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
    options.onError?.('server_error');
    res.status(500).json({ error: 'server_error' });
  });

  httpServer.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    // Android sets a default Origin based on its backend URL. Every socket
    // authenticates with an explicit token; no cookie authentication is used.
    if (path !== '/live') {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return socket.destroy();
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  wss.on('connection', client => {
    client.isAlive = true;
    client.on('pong', () => { client.isAlive = true; });
    const timeout = setTimeout(() => client.close(4401, 'Authentication required'), 5000);
    client.on('error', () => {});
    client.on('message', raw => {
      if (authenticated.has(client)) return;
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return client.close(4400, 'Invalid message'); }
      if (message.type !== 'auth' || !equalSecret(message.token, config.apiToken)) return client.close(4401, 'Unauthorized');
      clearTimeout(timeout);
      authenticated.add(client);
      // Synchronous snapshot precedes future broadcasts on this connection.
      send(client, { type: 'snapshot', leads: store.list(), stats: store.stats(), mode: config.demoMode ? 'demo' : 'meta' });
    });
    client.on('close', () => { clearTimeout(timeout); authenticated.delete(client); });
  });
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!client.isAlive) { client.terminate(); continue; }
      client.isAlive = false; client.ping();
    }
  }, 30_000);
  heartbeat.unref();
  async function close() {
    clearInterval(heartbeat);
    await worker.stop();
    for (const client of wss.clients) client.terminate();
    await new Promise(resolve => wss.close(resolve));
    if (httpServer.listening) await new Promise(resolve => httpServer.close(resolve));
  }
  void worker.kick();
  return { app, httpServer, worker, close };
}
