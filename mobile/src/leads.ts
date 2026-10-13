export type Lead = {
  id: string; name: string; email: string; phone: string; pageId: string; formId: string;
  source: 'meta' | 'demo'; receivedAt: string; createdAt: string | null;
  fields: Record<string, string[]>;
};
export type Stats = { leads: number; pending: number; failed: number };
export function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['id', 'name', 'email', 'phone', 'pageId', 'formId', 'receivedAt'].every(key => typeof v[key] === 'string')
    && (v.source === 'meta' || v.source === 'demo') && Number.isFinite(Date.parse(v.receivedAt as string))
    && (v.createdAt === null || (typeof v.createdAt === 'string' && Number.isFinite(Date.parse(v.createdAt))))
    && !!v.fields && typeof v.fields === 'object'
    && Object.values(v.fields).every(values => Array.isArray(values) && values.every(item => typeof item === 'string'));
}
export function isStats(value: unknown): value is Stats {
  if (!value || typeof value !== 'object') return false;
  const v = value as Stats;
  return [v.leads, v.pending, v.failed].every(n => Number.isSafeInteger(n) && n >= 0);
}
export function mergeLeads(current: Lead[], incoming: Lead[]): Lead[] {
  const byId = new Map(current.map(lead => [lead.id, lead]));
  for (const lead of incoming) byId.set(lead.id, lead);
  return [...byId.values()].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.id.localeCompare(a.id)).slice(0, 200);
}
export function liveUrl(base: string): string {
  const url = new URL(`${base.replace(/\/$/, '')}/live`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
