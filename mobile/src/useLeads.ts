import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { isLead, isStats, liveUrl, mergeLeads } from './leads';
import type { Lead, Stats } from './leads';
type Status = 'offline' | 'connecting' | 'live' | 'auth-error';
export function useLeads(url: string, token: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<Status>('offline');
  const [mode, setMode] = useState<'demo' | 'meta' | null>(null);
  const [stats, setStats] = useState<Stats>({ leads: 0, pending: 0, failed: 0 });
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false, socket: WebSocket | undefined, retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0, authFailed = false, appActive = AppState.currentState !== 'background';
    let handshake: ReturnType<typeof setTimeout> | undefined;
    const controllers = new Set<AbortController>();
    setLeads([]); setMode(null); setStats({ leads: 0, pending: 0, failed: 0 }); setError('');
    if (!token) { setStatus('offline'); return; }
    function connect() {
      if (disposed || !appActive || authFailed) return;
      setStatus('connecting');
      try { socket = new WebSocket(liveUrl(url)); } catch { setStatus('offline'); setError('Check your server address in Connection settings.'); return; }
      const active = socket;
      const current = () => !disposed && active === socket;
      handshake = setTimeout(() => { if (current()) active.close(); }, 12_000);
      active.onopen = () => { if (current()) active.send(JSON.stringify({ type: 'auth', token })); };
      active.onmessage = event => {
        if (!current()) return;
        let message;
        try { message = JSON.parse(String(event.data)); } catch { return; }
        if (message.type === 'snapshot' && Array.isArray(message.leads) && message.leads.every(isLead)
          && isStats(message.stats) && ['demo', 'meta'].includes(message.mode)) {
          clearTimeout(handshake); attempts = 0;
          setLeads(mergeLeads([], message.leads)); setStats(message.stats); setMode(message.mode);
          setStatus('live'); setError('');
        } else if (message.type === 'lead.created' && isLead(message.lead) && isStats(message.stats)) {
          setLeads(previous => mergeLeads(previous, [message.lead])); setStats(message.stats);
        }
      };
      active.onerror = () => { if (current()) setError('Cannot reach the server. Reconnecting automatically…'); };
      active.onclose = event => {
        if (!current()) return;
        clearTimeout(handshake);
        if (event.code === 4401) { authFailed = true; setStatus('auth-error'); setError('Your app access token was rejected. Update Connection settings.'); return; }
        setStatus('offline');
        if (appActive) {
          setError('Connection interrupted. Your inbox will catch up when reconnected.');
          retry = setTimeout(connect, Math.min(15_000, 750 * 2 ** Math.min(attempts++, 5)));
        }
      };
    }
    async function refreshStatus() {
      if (disposed || !appActive || authFailed) return;
      const controller = new AbortController(); controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${url}/api/status`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const body = await response.json();
        if (!disposed && response.ok && isStats(body)) setStats(body);
      } catch { /* Live connection reports connectivity errors. */ }
      finally { clearTimeout(timeout); controllers.delete(controller); }
    }
    connect();
    const statusTimer = setInterval(refreshStatus, 15_000);
    const listener = AppState.addEventListener('change', state => {
      appActive = state === 'active'; clearTimeout(retry); clearTimeout(handshake);
      const previous = socket; socket = undefined; previous?.close();
      if (appActive) connect(); else setStatus('offline');
    });
    return () => {
      disposed = true; clearTimeout(retry); clearTimeout(handshake); clearInterval(statusTimer);
      listener.remove(); for (const controller of controllers) controller.abort(); socket?.close();
    };
  }, [url, token]);
  return { leads, status, mode, stats, error };
}
