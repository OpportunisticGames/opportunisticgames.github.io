// Goal Machine – instant notifications (Supabase Edge Function `push`; a copy of what's deployed, keep the two the same).
// Called by the database (gm_push, on game, friend and challenge changes, and when someone takes your top spot on a
// leaderboard) with {users: [...]}, authenticated by a shared secret in private_config.
// For each of those players' phones it asks app_inbox (with that phone's notification choices) what to tell them, and
// pushes anything not pushed before through Firebase Cloud Messaging. Needs the FCM_SERVICE_ACCOUNT secret (the
// Firebase service-account JSON).
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let cached = { token: '', exp: 0 };

// a Google access token for FCM, from the service account (a signed JWT swapped at Google's token endpoint)
async function accessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp > now + 60) return cached.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('token: ' + JSON.stringify(j));
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return cached.token;
}

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  const { data: cfg } = await sb.from('private_config').select('value').eq('key', 'push_secret').maybeSingle();
  if (!cfg || req.headers.get('x-push-secret') !== cfg.value) return json({ error: 'forbidden' }, 401);
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return json({ skipped: 'FCM_SERVICE_ACCOUNT secret not set' });
  let body: { users?: string[] } = {};
  try { body = await req.json(); } catch (_) { /* empty */ }
  const users = (body.users || []).filter(u => typeof u === 'string').slice(0, 4);
  const sa = JSON.parse(raw);
  let sent = 0; const errors: string[] = [];
  for (const user of users) {
    const { data: phones } = await sb.from('push_tokens').select('token, prefs, tz').eq('username', user);
    for (const ph of phones || []) {
      const { data: items } = await sb.rpc('app_inbox', { p_user: user, p_prefs: ph.prefs, p_state: null, p_tz: ph.tz || 'Europe/London' });
      // only the things that happen: games (your move), results, new friends and challenges (cs started, cf finished,
      // cr reaction, co their reaction back, cm sent to you) and b someone beat your score; reminders stay with the
      // 15-minute check, which knows whether you've played today
      const want = (items || []).filter((x: { id: string }) => /^(g|r|f|cs|cf|cr|co|cm|b):/.test(x.id));
      if (!want.length) continue;
      // (what this phone's had already: skipped here, rather than by a failed insert, which filled the database log)
      const { data: had } = await sb.from('push_sent').select('id').eq('username', ph.token).in('id', want.map((x: { id: string }) => x.id));
      const old = new Set((had || []).map((x: { id: string }) => x.id));
      for (const it of want.filter((x: { id: string }) => !old.has(x.id))) {
        const { data: got } = await sb.from('push_sent').upsert({ username: ph.token, id: it.id }, { onConflict: 'username,id', ignoreDuplicates: true }).select('id');
        if (!got || !got.length) continue;  // another call got there first
        try {
          const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
            method: 'POST', headers: { Authorization: `Bearer ${await accessToken(sa)}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token: ph.token, data: { id: it.id, title: it.title, body: it.body, link: it.link || '' }, android: { priority: 'HIGH' } } }),
          });
          if (res.ok) sent++;
          else {
            const t = await res.text();
            errors.push(`${res.status} ${t.slice(0, 200)}`);
            if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(t)) await sb.from('push_tokens').delete().eq('token', ph.token);  // phone gone
          }
        } catch (e) { errors.push(String(e)); }
      }
    }
  }
  if (Math.random() < 0.05) await sb.from('push_sent').delete().lt('created_at', new Date(Date.now() - 7 * 864e5).toISOString());
  return json({ sent, errors });
});
