import { retrieveLead } from './meta.mjs';

export function createWorker(store, config, publish, options = {}) {
  let busy = false, stopped = false, active = Promise.resolve();
  const retrieve = options.retrieve || retrieveLead;
  async function drain() {
    if (busy || stopped) return;
    busy = true;
    try {
      let job;
      while (!stopped && (job = store.due())) {
        try {
          const event = JSON.parse(job.body);
          const lead = event.demoLead && config.demoMode ? event.demoLead : await retrieve(event, config);
          const inserted = store.complete(job.id, lead);
          if (inserted) publish(lead);
        } catch (error) {
          const code = error.code || 'lead_processing_error';
          store.fail(job, code, error.permanent === true);
          options.onError?.(code);
        }
      }
    } finally { busy = false; }
  }
  function kick() { if (!busy && !stopped) active = drain(); return active; }
  const timer = setInterval(kick, options.intervalMs || 1000);
  timer.unref();
  return { kick, async stop() { stopped = true; clearInterval(timer); await active; } };
}
