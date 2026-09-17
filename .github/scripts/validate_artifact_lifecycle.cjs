// Called only by the bounded canonical offline runner. Fixtures are public synthetic bytes.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { Store, POLICY, ROOT, evidence, verify, usageClear, withBuildBudget } = require('./artifact_lifecycle.cjs');
assert.equal(process.env.MIHOMO_LIFECYCLE_SELFTEST, '1', 'Use validate_health_checks.py');
const fixture = path.join(ROOT, 'artifact-lifecycle-selftest.tmp');
assert(!fs.existsSync(fixture), 'Previous interrupted fixture exists; preserve and review, do not create another');
const created = new Map(), dirs = new Set(), descriptors = new Map();
const original = Object.fromEntries(['openSync', 'closeSync', 'writeFileSync', 'renameSync', 'unlinkSync', 'mkdirSync', 'linkSync', 'symlinkSync'].map(k => [k, fs[k]]));
const inside = file => typeof file === 'string' && (path.resolve(file) === fixture || path.resolve(file).startsWith(fixture + path.sep));
function remember(file) { if (inside(file)) created.set(path.resolve(file), { evidence: evidence(file) }); }
// Track creation/write events, not an after-the-fact scan/adoption of unknown fixture files.
fs.openSync = (file, flags, ...args) => {
  const fd = original.openSync(file, flags, ...args);
  if (inside(file) && typeof flags === 'string' && /[wax+]/.test(flags)) descriptors.set(fd, path.resolve(file));
  return fd;
};
fs.closeSync = fd => { const file = descriptors.get(fd); descriptors.delete(fd); original.closeSync(fd); if (file) remember(file); };
fs.writeFileSync = (file, ...args) => { original.writeFileSync(file, ...args); if (typeof file === 'string') remember(file); };
fs.mkdirSync = (dir, ...args) => { const value = original.mkdirSync(dir, ...args); if (inside(dir)) dirs.add(path.resolve(dir)); return value; };
fs.renameSync = (from, to) => { original.renameSync(from, to); if (inside(from)) created.delete(path.resolve(from)); if (inside(to)) remember(to); };
fs.unlinkSync = file => { original.unlinkSync(file); if (inside(file)) created.delete(path.resolve(file)); };
fs.symlinkSync = (target, file, type) => {
  original.symlinkSync(target, file, type);
  if (inside(file)) created.set(path.resolve(file), { link: fs.readlinkSync(file) });
};
// Hardlinks are deliberately rejected by the manager; remove the exact synthetic alias immediately in its test.
let probes = 0;
const modelProbe = files => { probes++; assert(files.every(file => file.startsWith(fixture + path.sep))); };
const policy = { ...POLICY, budgetBytes: 4 * 1024 * 1024, auditLimitBytes: 1024 * 1024,
  reservations: { rules: 16384, runtime: 16384, endpoints: 16384 } };
const open = (name, overrides = {}) => new Store({ root: path.join(fixture, name), policy,
  usageProbe: modelProbe, ...overrides }).open();
const cases = [];
let complete = false;
(async () => {
try {
  fs.mkdirSync(fixture);
  {
    let s = open('retention');
    let run = s.begin('rules'); const first = run.id;
    const shared = run.put('body.txt', 'same immutable rule'); run.finish('validated');
    s = open('retention'); s.retainValidated(first, 'release'); s.close();
    s = open('retention'); run = s.begin('rules');
    assert.equal(run.put('body.txt', 'same immutable rule'), shared, 'Content dedup must reuse exact file, not copy/link');
    const second = run.id; run.put('second.txt', 'candidate-specific'); run.finish('validated');
    s = open('retention'); run = s.begin('runtime', undefined, [second]); run.put('case.yaml', 'synthetic'); run.finish('validated');
    s = open('retention'); run = s.begin('rules'); run.put('body.txt', 'new rules'); run.finish('validated');
    assert(fs.existsSync(shared), 'Formal restore root must survive');
    assert(fs.existsSync(path.join(s.root, 'runs', second, 'second.txt')), 'Retained dependency must survive');
    s = open('retention'); s.prune(); const before = JSON.stringify(s.state); s.prune(); assert.equal(JSON.stringify(s.state), before); s.close();
    cases.push('formal+candidate+transitive-dependency preservation, dedup, prune idempotence');
  }
  {
    let s = open('failed'); let r = s.begin('rules'); const old = r.put('old.txt', 'old failure'); r.finish('failed');
    s = open('failed'); r = s.begin('rules'); const latest = r.put('new.txt', 'latest failure'); r.finish('failed');
    assert(!fs.existsSync(old) && fs.existsSync(latest));
    assert.equal(Object.values(s.state.roots.rules).length, 1);
    cases.push('one latest sealed failure, exact-file orphan deletion');
  }
  {
    const s = open('active'); const r = s.begin('rules'); const file = r.put('breakpoint.txt', 'active');
    s.prune(); assert(fs.existsSync(file));
    assert.throws(() => new Store({ root: s.root, policy }).open(), /EEXIST|exist/i);
    const moduleFile = path.join(__dirname, 'artifact_lifecycle.cjs');
    const result = execFileSync(process.execPath, ['--max-old-space-size=64', '-e',
      `const {Store}=require(${JSON.stringify(moduleFile)});try{new Store({root:${JSON.stringify(s.root)}}).open();process.exit(3)}catch(e){if(e.code!=='EEXIST')throw e;console.log('LOCKED')}`],
    { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(result.trim(), 'LOCKED');
    s.close(); assert.throws(() => open('active'), /Active breakpoint/);
    cases.push('real concurrent process exclusion, active/interrupted lease fail-closed');
  }
  {
    const s = open('capacity', { policy: { ...policy, budgetBytes: 1000 } });
    assert.throws(() => s.begin('rules'), /Capacity admission/);
    assert.equal(fs.readdirSync(path.join(s.root, 'runs')).length, 0);
    const b = open('per-run'); const r = b.begin('rules');
    assert.throws(() => r.put('oversize.bin', Buffer.alloc(16385)), /reservation/);
    assert(!fs.existsSync(path.join(r.directory, 'oversize.bin')));
    cases.push('pre-allocation total budget, pre-write reservation');
  }
  {
    let s = open('usage'); let r = s.begin('rules'); const file = r.put('old.txt', 'preserve when usage unknown'); r.finish('failed');
    s = open('usage', { usageProbe: () => { throw Error('USAGE_UNKNOWN'); } });
    r = s.begin('rules'); r.put('new.txt', 'new failure');
    assert.throws(() => r.finish('failed'), /USAGE_UNKNOWN/);
    assert(fs.existsSync(file)); assert(fs.existsSync(s.lock));
    cases.push('unknown/in-use preservation, cleanup failure blocks next producer');
  }
  {
    const s = open('unknown'); const r = s.begin('rules');
    fs.writeFileSync(path.join(r.directory, 'unknown.txt'), 'not registered by manager');
    assert.throws(() => r.finish('validated'), /Undeclared/);
    cases.push('unknown output never adopted');
  }
  {
    let s = open('drift'); let r = s.begin('rules'); const file = r.put('body.txt', 'original'); r.finish('validated');
    fs.writeFileSync(file, 'modified'); assert.throws(() => open('drift'), /drift/); assert(fs.existsSync(file));
    cases.push('retained restore hash drift fails closed');
  }
  {
    const s = open('atomic'); const r = s.begin('rules');
    const saved = fs.renameSync;
    fs.renameSync = () => { throw Error('SIMULATED_ATOMIC_FAILURE'); };
    try { assert.throws(() => r.put('x.txt', 'x'), /SIMULATED_ATOMIC_FAILURE/); } finally { fs.renameSync = saved; }
    assert(fs.existsSync(path.join(s.root, 'state.next')));
    assert(!fs.existsSync(path.join(r.directory, 'x.txt')));
    assert.throws(() => open('atomic'), /EEXIST|exist/i);
    cases.push('atomic commit interruption preserves evidence and refuses continuation');
  }
  {
    const s = open('paths');
    assert.throws(() => s.begin('rules', path.join(fixture, 'outside')), /Output must/);
    const r = s.begin('rules'); assert.throws(() => r.put('../escape', 'x'));
    const file = r.put('body.txt', 'single link'); const alias = path.join(fixture, 'hardlink');
    fs.linkSync(file, alias);
    try { assert.throws(() => s.inspect(), /single-link/); } finally { fs.unlinkSync(alias); remember(file); }
    const junction = path.join(fixture, 'junction');
    fs.symlinkSync(r.directory, junction, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => evidence(path.join(junction, 'body.txt')), /Linked|reparse/);
    cases.push('outside/traversal/hardlink/junction rejection');
  }
  {
    let s = open('logs'); let r = s.begin('endpoints'); const file = r.put('report.txt', 'old ordinary log');
    r.record.created = Date.now() - 8 * 86400000; r.finish('validated'); assert(!fs.existsSync(file));
    s = open('logs'); r = s.begin('endpoints'); r.put('report.txt', 'protected oversized log');
    s.policy = { ...s.policy, logMaxBytes: 2 };
    assert.throws(() => r.finish('validated'), /logs exceed/);
    cases.push('seven-day ordinary log expiry, protected log byte cap');
  }
  {
    let s = open('partial-delete'); let r = s.begin('rules');
    r.put('old-one.txt', 'one'); const oldTwo = r.put('old-two.txt', 'two'); r.finish('failed');
    s = open('partial-delete'); r = s.begin('rules'); r.put('new.txt', 'new');
    const saved = fs.unlinkSync;
    fs.unlinkSync = file => { if (file === oldTwo) throw Error('SIMULATED_DELETE_FAILURE'); return saved(file); };
    try { assert.throws(() => r.finish('failed'), /SIMULATED_DELETE_FAILURE/); } finally { fs.unlinkSync = saved; }
    assert.equal(s.state.pending.action, 'delete'); assert(fs.existsSync(oldTwo));
    assert.throws(() => open('partial-delete'), /EEXIST|exist/i);
    cases.push('partial deletion remains pending and blocks further generation');
  }
  {
    const s = open('external'); const r = s.begin('runtime');
    r.expectExternal(['cache.db']); fs.writeFileSync(path.join(r.directory, 'cache.db'), 'synthetic owned-core output');
    r.finish('validated'); assert.equal(Object.keys(s.state.files).length, 1);
    cases.push('explicitly declared owned-core output registration');
  }
  {
    const legacy = path.join(fixture, 'unregistered'); fs.mkdirSync(legacy);
    fs.writeFileSync(path.join(legacy, 'unknown.txt'), 'preserve');
    assert.throws(() => open('unregistered'), /Unregistered store/);
    assert(!fs.existsSync(path.join(legacy, 'lock')), 'Do not create a lock in an unregistered old directory');
    let s = open('identity'); let r = s.begin('rules'); const file = r.put('body.txt', 'same bytes'); r.finish('validated');
    fs.unlinkSync(file); fs.writeFileSync(file, 'same bytes');
    assert.throws(() => open('identity'), /drift/);
    cases.push('no legacy adoption, same-byte identity replacement rejected');
  }
  {
    const file = path.join(fixture, 'native-usage.txt'); fs.writeFileSync(file, 'public synthetic occupancy probe');
    if (process.platform === 'win32') {
      usageClear([file]);
      const child = spawn(process.execPath, ['-e', `const fs=require('fs');const fd=fs.openSync(${JSON.stringify(file)},'r');console.log('ready');setTimeout(()=>{fs.closeSync(fd)},5000)`],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const closed = new Promise(resolve => child.once('close', resolve));
      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(Error('Synthetic holder startup timeout')), 2000);
          child.once('error', e => { clearTimeout(timer); reject(e); });
          child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
        });
        assert.throws(() => usageClear([file]), /FileStream|being used|IOException|Occupied|used by another|另一个|进程|Command failed/i);
      } finally { child.kill(); await closed; }
      cases.push('native Windows exact-file free/occupied gates');
    }
    else cases.push('native non-Windows usage not assumed by model tests');
  }
  // Wiring contracts: prevent an unused standalone lifecycle script regression.
  const source = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert(source('.github/scripts/build_profiles.cjs').includes('withBuildBudget(bytes, produce)'));
  let produced = false;
  assert.throws(() => withBuildBudget(POLICY.sourceBuildMaxBytes + 1, () => { produced = true; }), /capacity/);
  assert.equal(produced, false);
  for (const file of ['check_remote_rules.cjs', 'check_health_endpoints.cjs', 'validate_mihomo_runtime.cjs']) {
    const text = source('.github/scripts/' + file);
    assert(text.includes('artifact_lifecycle.cjs') && text.includes('.finish('), 'Producer not wired: ' + file);
  }
  const YAML = require('yaml');
  for (const file of ['validate-config.yml', 'validate-health-checks.yml']) {
    const workflow = YAML.parse(source('.github/workflows/' + file));
    for (const event of ['push', 'pull_request']) for (const entry of ['.github/artifact-policy.json',
      '.github/scripts/artifact_lifecycle.cjs', '.github/scripts/artifact_usage.ps1', '.github/scripts/validate_artifact_lifecycle.cjs'])
      assert(workflow.on[event].paths.includes(entry));
  }
  assert(source('.github/workflows/validate-config.yml').includes('/.generated/runs/rules-check'));
  assert(source('.github/workflows/check-health-endpoints.yml').includes('retention-days: 7'));
  assert(probes > 0);
  complete = true;
} finally {
  // Only teardown files created/updated through this harness, never discover-and-delete.
  Object.assign(fs, original);
  if (complete) {
    for (const [file, expected] of created) {
      assert(inside(file));
      if (expected.link !== undefined) assert.equal(fs.readlinkSync(file), expected.link);
      else verify(file, expected.evidence);
    }
    for (const [file] of created) fs.unlinkSync(file);
    for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
      assert(inside(dir) && !fs.lstatSync(dir).isSymbolicLink()); fs.rmdirSync(dir); // exact empty registered fixture directory only
    }
  }
}
console.log('生成物生命周期：' + cases.length + ' 类合成/接线检查 OK；无存量清理、无客户端操作');
})().catch(error => { console.error(error); process.exitCode = 1; });
