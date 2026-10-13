import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, received_at TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
        next_try INTEGER NOT NULL DEFAULT 0, error TEXT);`);
  }
  enqueue(events) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const insert = this.db.prepare('INSERT OR IGNORE INTO jobs (id, body) VALUES (?, ?)');
      for (const event of events) insert.run(event.id, JSON.stringify(event));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  due(now = Date.now()) {
    return this.db.prepare("SELECT * FROM jobs WHERE status='pending' AND next_try<=? ORDER BY rowid LIMIT 1").get(now);
  }
  complete(jobId, lead) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const inserted = this.db.prepare('INSERT OR IGNORE INTO leads VALUES (?, ?, ?)')
        .run(lead.id, lead.receivedAt, JSON.stringify(lead)).changes > 0;
      this.db.prepare("UPDATE jobs SET status='done', error=NULL WHERE id=?").run(jobId);
      this.db.exec('COMMIT');
      return inserted;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  fail(job, code, permanent = false) {
    const attempts = job.attempts + 1;
    const status = permanent || attempts >= 8 ? 'failed' : 'pending';
    const next = Date.now() + Math.min(60_000, 1000 * 2 ** attempts);
    this.db.prepare('UPDATE jobs SET attempts=?, status=?, next_try=?, error=? WHERE id=?')
      .run(attempts, status, next, code, job.id);
  }
  retryFailed() {
    return this.db.prepare("UPDATE jobs SET status='pending', attempts=0, next_try=0, error=NULL WHERE status='failed'").run().changes;
  }
  list(limit = 200) {
    return this.db.prepare('SELECT body FROM leads ORDER BY received_at DESC, id DESC LIMIT ?')
      .all(limit).map(row => JSON.parse(row.body));
  }
  stats() {
    const result = { leads: this.db.prepare('SELECT count(*) AS n FROM leads').get().n, pending: 0, failed: 0 };
    for (const row of this.db.prepare('SELECT status, count(*) AS n FROM jobs GROUP BY status').all()) {
      if (row.status === 'pending' || row.status === 'failed') result[row.status] = row.n;
    }
    return result;
  }
  close() { this.db.close(); }
}
