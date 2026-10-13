import test from 'node:test';
import assert from 'node:assert/strict';
import { isLead, isStats, liveUrl, mergeLeads } from '../src/leads.ts';
import type { Lead } from '../src/leads.ts';
const lead = (id: string, receivedAt: string): Lead => ({ id, receivedAt, name: 'Alex', email: '', phone: '',
  pageId: '1', formId: '2', source: 'meta', createdAt: null, fields: {} });
test('duplicate events and catch-up snapshots merge without losing newer leads', () => {
  const older = lead('1', '2026-10-13T00:00:00.000Z'), newer = lead('2', '2026-10-13T01:00:00.000Z');
  const merged = mergeLeads([newer], [older, older]);
  assert.deepEqual(merged.map(x => x.id), ['2', '1']);
  assert.equal(mergeLeads(merged, [newer]).length, 2);
});
test('malformed lead messages and invalid statistics are rejected', () => {
  assert.equal(isLead(lead('1', '2026-10-13T00:00:00.000Z')), true);
  assert.equal(isLead({ id: '1' }), false);
  assert.equal(isLead({ ...lead('1', 'bad'), source: 'unknown' }), false);
  assert.equal(isStats({ leads: 0, pending: 0, failed: 0 }), true);
  assert.equal(isStats({ leads: -1, pending: 0, failed: 0 }), false);
});
test('live URL uses TLS when the backend uses HTTPS', () => {
  assert.equal(liveUrl('https://example.com'), 'wss://example.com/live');
  assert.equal(liveUrl('http://localhost:4000/'), 'ws://localhost:4000/live');
});
