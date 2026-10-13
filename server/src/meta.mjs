import { createHmac, timingSafeEqual } from 'node:crypto';

export function equalSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validSignature(raw, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false;
  return equalSecret(signature, `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`);
}

export function extractEvents(payload, config) {
  if (payload?.object !== 'page' || !Array.isArray(payload.entry)) return [];
  const events = [];
  for (const entry of payload.entry) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      const v = change?.value;
      if (change?.field !== 'leadgen' || !v) continue;
      const id = String(v.leadgen_id || ''), pageId = String(v.page_id || entry.id || '');
      const formId = String(v.form_id || '');
      if (!/^\d+$/.test(id) || pageId !== config.pageId) continue;
      if (config.formId && formId !== config.formId) continue;
      events.push({ id, pageId, formId, createdTime: v.created_time });
    }
  }
  return events;
}

export class LeadFetchError extends Error {
  constructor(code, permanent = false) { super(code); this.code = code; this.permanent = permanent; }
}

export async function retrieveLead(event, config, fetchImpl = fetch) {
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${event.id}`);
  url.searchParams.set('fields', 'id,created_time,field_data,form_id');
  url.searchParams.set('appsecret_proof', createHmac('sha256', config.appSecret).update(config.pageToken).digest('hex'));
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${config.pageToken}` }, signal: AbortSignal.timeout(15_000),
    });
  } catch { throw new LeadFetchError('graph_network_error'); }
  let body;
  try { body = await response.json(); } catch { throw new LeadFetchError('graph_invalid_json'); }
  if (!response.ok || body.error) {
    const code = Number(body?.error?.code || response.status);
    const temporary = response.status === 429 || response.status >= 500 || body?.error?.is_transient === true
      || [1, 2, 4, 17, 32, 613].includes(code);
    throw new LeadFetchError(`graph_${code}`, !temporary);
  }
  if (String(body.id) !== event.id || !Array.isArray(body.field_data)) throw new LeadFetchError('graph_invalid_lead');
  return normalizeLead(body, event, 'meta');
}

export function normalizeLead(body, event, source) {
  const fields = Object.create(null);
  for (const field of body.field_data || []) {
    if (typeof field.name === 'string' && Array.isArray(field.values)) {
      fields[field.name] = field.values.filter(v => typeof v === 'string');
    }
  }
  const first = key => fields[key]?.[0] || '';
  const created = body.created_time || (Number(event.createdTime) ? new Date(Number(event.createdTime) * 1000).toISOString() : null);
  return {
    id: event.id, pageId: event.pageId, formId: event.formId || String(body.form_id || ''), source,
    name: first('full_name') || [first('first_name'), first('last_name')].filter(Boolean).join(' ') || 'Unnamed lead',
    email: first('email'), phone: first('phone_number'), fields,
    createdAt: created && Number.isFinite(Date.parse(created)) ? new Date(created).toISOString() : null,
    receivedAt: new Date().toISOString(),
  };
}
