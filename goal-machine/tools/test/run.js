// Runs the browser tests a few at a time and prints one summary: how long each took, how many checks passed, and any
// that failed. It starts the local server (python3 -m http.server 8765 from the repo root) if it isn't running.
//   node run.js            the quick set (a few minutes): run after every change
//   node run.js full       every test (not the 25-minute manager balance simulation, managers.js: run that on its own)
//   node run.js chaos,cards   just these
//   PAR=2 node run.js full   how many at once (default 3; the cloud machine has 4 cores)
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const DIR = __dirname, ROOT = path.resolve(DIR, '../../..');
const NOT = ['mockserver', 'helpers', 'run', 'managers'];  // helpers, this runner, and the long balance simulation
const ALL = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(n => !NOT.includes(n)).sort();
// the quick set: every page in every look, the layout, the season CHAOS, the rewards and the cards
const QUICK = ['sweep', 'layout527', 'chaosseasons', 'szlook', 'rewards526', 'cards', 'features', 'offline531', 'beaten532', 'record5321', 'new533', 'new534', 'tour536'];
const arg = process.argv[2] || 'quick';
const list = arg === 'full' ? ALL : arg === 'quick' ? QUICK : arg.split(',').map(s => s.trim().replace(/\.js$/, '')).filter(Boolean);
const PAR = Math.max(1, +(process.env.PAR || 3));
const LIMIT = 15 * 60 * 1000;  // a single test that takes longer than this is stopped and counted as failed

const up = () => new Promise(res => http.get('http://localhost:8765/goal-machine/', r => { r.resume(); res(r.statusCode === 200); }).on('error', () => res(false)));
async function server() {
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', '8765'], { cwd: ROOT, detached: true, stdio: 'ignore' }).unref();
  for (let k = 0; k < 40 && !(await up()); k++) await new Promise(r => setTimeout(r, 250));
  if (!(await up())) { console.error('Couldn’t start the local server on port 8765'); process.exit(2); }
}

function one(name) {
  return new Promise(res => {
    const t0 = Date.now(), out = [];
    const p = spawn('node', [name + '.js'], { cwd: DIR, env: process.env });
    p.stdout.on('data', d => out.push(d)); p.stderr.on('data', d => out.push(d));
    const kill = setTimeout(() => { out.push(Buffer.from('\n✗ stopped: took longer than 15 minutes')); p.kill('SIGKILL'); }, LIMIT);
    p.on('close', code => {
      clearTimeout(kill);
      const text = Buffer.concat(out).toString(), lines = text.split('\n');
      const pass = lines.filter(l => l.startsWith('✓')).length, fail = lines.filter(l => l.startsWith('✗'));
      const crash = code !== 0 && !fail.length ? lines.filter(l => /Error|error/.test(l)).slice(0, 3) : [];
      fs.mkdirSync(path.join(DIR, 'lay'), { recursive: true });
      fs.writeFileSync(path.join(DIR, 'lay', name + '.log'), text);  // the whole output, for when something fails
      res({ name, secs: Math.round((Date.now() - t0) / 1000), pass, fail, crash, ok: code === 0 && !fail.length });
    });
  });
}

(async () => {
  const unknown = list.filter(n => !fs.existsSync(path.join(DIR, n + '.js')));
  if (unknown.length) { console.error('No such test: ' + unknown.join(', ')); process.exit(2); }
  await server();
  const t0 = Date.now(), queue = list.slice(), done = [];
  console.log(`Running ${list.length} test${list.length > 1 ? 's' : ''}, ${Math.min(PAR, list.length)} at a time…`);
  await Promise.all(Array.from({ length: Math.min(PAR, list.length) }, async () => {
    while (queue.length) {
      const r = await one(queue.shift()); done.push(r);
      console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(14)} ${String(r.secs).padStart(4)}s  ${r.pass} passed${r.fail.length ? `, ${r.fail.length} failed` : ''}${r.crash.length ? ', crashed' : ''}`);
      r.fail.concat(r.crash).forEach(l => console.log('      ' + l.trim().slice(0, 200)));
    }
  }));
  const bad = done.filter(r => !r.ok), mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n${bad.length ? `✗ ${bad.length} of ${done.length} failed: ${bad.map(r => r.name).join(', ')} (full output in lay/<name>.log)` : `✓ all ${done.length} passed`} · ${mins} min`);
  const slow = done.slice().sort((a, b) => b.secs - a.secs).slice(0, 5).map(r => `${r.name} ${r.secs}s`).join(', ');
  console.log(`  slowest: ${slow}`);
  process.exit(bad.length ? 1 : 0);
})();
