// Only newly registered public/synthetic artifacts. No legacy adoption or recursive deletion.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const POLICY = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/artifact-policy.json'), 'utf8'));
const digest = body => crypto.createHash('sha256').update(body).digest('hex');
const safeName = name => typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,120}$/.test(name);
const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
function ancestors(file) {
  let current = path.resolve(file);
  for (;;) {
    const s = fs.lstatSync(current);
    assert(!s.isSymbolicLink() && samePath(fs.realpathSync(current), current), 'Linked/reparse path: ' + current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function evidence(file) {
  ancestors(file);
  const fd = fs.openSync(file, 'r');
  try {
    const s = fs.fstatSync(fd, { bigint: true });
    assert(s.isFile() && s.nlink === 1n, 'Not a single-link regular file');
    const body = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    assert.equal(s.mtimeNs, after.mtimeNs, 'File changed while reading');
    assert.equal(s.size, BigInt(body.length));
    return { bytes: body.length, sha256: digest(body), identity: `${s.dev}:${s.ino}`,
      mtime: String(s.mtimeNs), ctime: String(s.ctimeNs) };
  } finally { fs.closeSync(fd); }
}
function verify(file, expected) { assert.deepEqual(evidence(file), expected, 'Artifact identity/content drift: ' + file); }
function writeNew(file, body) {
  ancestors(path.dirname(file));
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return evidence(file);
}
function usageClear(files) {
  if (!files.length) return;
  if (process.platform === 'win32') {
    const result = execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-File',
      path.join(__dirname, 'artifact_usage.ps1')], { input: JSON.stringify(files), encoding: 'utf8',
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1024 * 1024 });
    assert.equal(JSON.parse(result).clear, true, 'Artifact usage unknown/in use');
    return;
  }
  // Linux: unreadable /proc means UNKNOWN, never permission to delete.
  assert.equal(process.platform, 'linux', 'Native usage check unavailable; preserve artifacts');
  const wanted = new Set(files.map(file => { const s = fs.statSync(file, { bigint: true }); return `${s.dev}:${s.ino}`; }));
  for (const pid of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) {
    let descriptors;
    try { descriptors = fs.readdirSync(`/proc/${pid}/fd`); }
    catch (e) { if (e.code === 'ENOENT' || e.code === 'ESRCH') continue; throw e; }
    for (const fd of descriptors) {
      try { const s = fs.statSync(`/proc/${pid}/fd/${fd}`, { bigint: true }); assert(!wanted.has(`${s.dev}:${s.ino}`), 'Artifact in use'); }
      catch (e) { if (e.code !== 'ENOENT' && e.code !== 'ESRCH') throw e; }
    }
    // mmap can outlive a file descriptor.
    let maps;
    try { maps = fs.readFileSync(`/proc/${pid}/maps`, 'utf8'); }
    catch (e) { if (e.code === 'ENOENT' || e.code === 'ESRCH') continue; throw e; }
    for (const file of files) assert(!maps.includes(file), 'Mapped artifact in use');
  }
}
function checkPolicy(p) {
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.root, '.generated');
  for (const k of ['budgetBytes', 'auditLimitBytes', 'logMaxBytes', 'sourceBuildMaxBytes'])
    assert(Number.isSafeInteger(p[k]) && p[k] > 0, 'Invalid capacity policy');
  assert(p.logMaxBytes <= 104857600 && p.logMaxAgeDays > 0 && p.logMaxAgeDays <= 7);
  for (const k of ['rules', 'runtime', 'endpoints']) assert(Number.isSafeInteger(p.reservations[k]) && p.reservations[k] > 0);
}
checkPolicy(POLICY);
class Store {
  constructor(options = {}) {
    this.root = path.resolve(options.root || path.join(ROOT, POLICY.root));
    assert(this.root.startsWith(ROOT + path.sep), 'Managed artifacts must remain in this checkout');
    this.policy = options.policy || POLICY; checkPolicy(this.policy);
    this.probe = options.usageProbe || usageClear;
    this.lock = path.join(this.root, 'lock');
    this.stateFile = path.join(this.root, 'state.json');
    this.owned = false;
  }
  file(relative) {
    assert(typeof relative === 'string' && /^runs\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(relative), 'Invalid registered path');
    const file = path.resolve(this.root, relative);
    assert(file.startsWith(this.root + path.sep)); return file;
  }
  open() {
    if (!fs.existsSync(this.root)) {
      ancestors(path.dirname(this.root)); fs.mkdirSync(this.root);
      fs.mkdirSync(path.join(this.root, 'runs')); fs.mkdirSync(path.join(this.root, 'audit'));
      writeNew(this.stateFile, JSON.stringify({ version: 1, runs: {}, files: {}, roots: {}, audits: {}, pending: null }));
    }
    ancestors(this.root);
    // A pre-existing unregistered directory is not ours, even if it happens to have this name.
    assert(fs.existsSync(this.stateFile), 'Unregistered store; preserve without adopting');
    ancestors(this.stateFile);
    assert(fs.lstatSync(this.stateFile).isFile());
    for (const dir of ['runs', 'audit']) {
      ancestors(path.join(this.root, dir)); assert(fs.lstatSync(path.join(this.root, dir)).isDirectory());
    }
    // wx serializes allocation, registration, retention and all producers; no stale-lock stealing.
    this.lockEvidence = writeNew(this.lock, JSON.stringify({ pid: process.pid, nonce: crypto.randomUUID() }));
    this.owned = true;
    this.state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    this.stateEvidence = evidence(this.stateFile);
    assert.equal(this.state.version, 1);
    assert(!this.state.pending, 'Interrupted transaction; preserve and review');
    assert(!Object.values(this.state.runs).some(run => run.status === 'active'), 'Active breakpoint; preserve and review');
    this.inspect(); return this;
  }
  inspect() {
    ancestors(this.root);
    for (const [id, run] of Object.entries(this.state.runs)) {
      assert(safeName(id) && Object.hasOwn(this.policy.reservations, run.product));
      assert(['active', 'validated', 'failed', 'retired'].includes(run.status));
      assert(Array.isArray(run.dependencies) && run.dependencies.every(dep => safeName(dep) && this.state.runs[dep]), 'Unknown dependency');
      for (const [name, file] of Object.entries(run.outputs)) assert(safeName(name) && this.state.files[file], 'Missing registered output');
    }
    for (const file of Object.keys(this.state.files)) assert(this.state.runs[file.split('/')[1]], 'Missing owning run');
    const known = new Set(['runs', 'audit', 'state.json', 'lock']);
    for (const name of fs.readdirSync(this.root)) assert(known.has(name), 'Unknown managed-root object: ' + name);
    let bytes = 0;
    for (const [relative, meta] of Object.entries(this.state.files)) { verify(this.file(relative), meta); bytes += meta.bytes; }
    for (const id of fs.readdirSync(path.join(this.root, 'runs'))) {
      assert(safeName(id) && this.state.runs[id], 'Unregistered directory; preserve');
      const dir = path.join(this.root, 'runs', id); ancestors(dir);
      for (const name of fs.readdirSync(dir)) assert(this.state.files[`runs/${id}/${name}`], 'Unknown output; preserve: ' + name);
    }
    let auditBytes = 0;
    for (const name of fs.readdirSync(path.join(this.root, 'audit'))) {
      assert(/^[0-9a-f-]+\.json$/.test(name), 'Unknown audit object');
      assert(this.state.audits[name], 'Unregistered audit; preserve');
      verify(path.join(this.root, 'audit', name), this.state.audits[name]);
      auditBytes += this.state.audits[name].bytes;
    }
    assert.equal(fs.readdirSync(path.join(this.root, 'audit')).length, Object.keys(this.state.audits).length, 'Missing audit');
    assert(auditBytes <= this.policy.auditLimitBytes, 'Audit budget reached; preserve audits and stop');
    return { bytes: bytes + auditBytes + evidence(this.stateFile).bytes, auditBytes };
  }
  save() {
    assert(this.owned); verify(this.lock, this.lockEvidence);
    verify(this.stateFile, this.stateEvidence);
    const temp = path.join(this.root, 'state.next');
    writeNew(temp, JSON.stringify(this.state));
    fs.renameSync(temp, this.stateFile); // crash before rename leaves state.next: next open refuses it.
    this.stateEvidence = evidence(this.stateFile);
  }
  audit(event) {
    const body = JSON.stringify({ at: new Date().toISOString(), ...event });
    assert(this.inspect().auditBytes + Buffer.byteLength(body) <= this.policy.auditLimitBytes, 'Audit budget reached');
    const name = crypto.randomUUID() + '.json';
    this.state.pending = { action: 'audit', name }; this.save();
    this.state.audits[name] = writeNew(path.join(this.root, 'audit', name), body);
    this.state.pending = null; this.save();
  }
  retained() {
    const ids = new Set();
    const visit = id => {
      assert(this.state.runs[id], 'Missing retained dependency');
      if (ids.has(id)) return; ids.add(id);
      for (const dependency of this.state.runs[id].dependencies) visit(dependency);
    };
    for (const [product, root] of Object.entries(this.state.roots)) for (const [role, id] of Object.entries(root)) {
      if (!id) continue;
      const run = this.state.runs[id]; assert(run, 'Missing retained root');
      if (product === 'endpoints' && role !== 'release' && !run.hold
        && Date.now() - run.created > this.policy.logMaxAgeDays * 86400000) continue;
      visit(id);
    }
    for (const [id, run] of Object.entries(this.state.runs)) if (run.status === 'active' || run.hold) visit(id);
    const files = new Set();
    for (const id of ids) for (const file of Object.values(this.state.runs[id].outputs)) files.add(file);
    const logs = new Set([...ids].filter(id => this.state.runs[id].product === 'endpoints')
      .flatMap(id => Object.values(this.state.runs[id].outputs)));
    assert([...logs].reduce((n, file) => n + this.state.files[file].bytes, 0) <= this.policy.logMaxBytes,
      'Retained logs exceed capacity; preserve protected roots and stop');
    return { ids, files };
  }
  prune() {
    this.inspect(); const retained = this.retained();
    // Verify the entire retained closure before removing any orphan, including recovery roots.
    for (const file of retained.files) verify(this.file(file), this.state.files[file]);
    const garbage = Object.keys(this.state.files).filter(file => !retained.files.has(file));
    for (let i = 0; i < garbage.length; i += 64) this.probe(garbage.slice(i, i + 64).map(file => this.file(file)));
    if (!garbage.length) return;
    this.audit({ action: 'delete-intent', files: garbage.map(file => ({ file, ...this.state.files[file] })) });
    this.state.pending = { action: 'delete', files: garbage }; this.save();
    for (const file of garbage) {
      verify(this.file(file), this.state.files[file]);
      fs.unlinkSync(this.file(file)); // exact regular file only; never recursive or forced.
      delete this.state.files[file];
    }
    for (const [id, run] of Object.entries(this.state.runs)) if (!retained.ids.has(id)) {
      run.outputs = {}; run.status = 'retired'; // Keep identity/audit metadata; no directory deletion.
    }
    this.state.pending = null; this.save();
    this.audit({ action: 'delete-complete', files: garbage });
  }
  begin(product, output, dependencies = []) {
    assert(this.owned && !this.state.pending && Object.hasOwn(this.policy.reservations, product));
    this.prune();
    const reserve = this.policy.reservations[product];
    assert(this.inspect().bytes + reserve <= this.policy.budgetBytes, 'Capacity admission refused; retained/unknown content is not disposable');
    const id = output ? path.basename(path.resolve(output)) : `${product}-${crypto.randomUUID()}`;
    assert(safeName(id));
    const dir = path.join(this.root, 'runs', id);
    if (output) assert(samePath(path.resolve(output), dir), 'Output must be a new directory under .generated/runs/');
    assert(!this.state.runs[id] && !fs.existsSync(dir), 'Output already exists; no overwrite/adoption');
    for (const dep of dependencies) assert(this.state.runs[dep]?.status === 'validated', 'Dependency not validated');
    this.state.runs[id] = { product, status: 'active', outputs: {}, dependencies, created: Date.now(), reserve, external: [] };
    this.state.pending = { action: 'create-run', id }; this.save(); fs.mkdirSync(dir);
    this.state.pending = null; this.save(); return new Run(this, id);
  }
  close() { verify(this.lock, this.lockEvidence); fs.unlinkSync(this.lock); this.owned = false; }
  retainValidated(id, role) {
    assert(this.owned && ['release', 'candidate'].includes(role));
    const run = this.state.runs[id]; assert(run?.status === 'validated', 'Recovery root must be validated');
    for (const file of Object.values(run.outputs)) verify(this.file(file), this.state.files[file]);
    (this.state.roots[run.product] ||= {})[role] = id; this.save();
  }
}
class Run {
  constructor(store, id) { this.store = store; this.id = id; this.directory = path.join(store.root, 'runs', id); }
  get record() { return this.store.state.runs[this.id]; }
  check(extra = 0) {
    let size = 0;
    for (const name of fs.readdirSync(this.directory)) size += evidence(path.join(this.directory, name)).bytes;
    assert(size + extra <= this.record.reserve, 'Run reservation exceeded; preserve and stop');
  }
  put(name, body, { materialize = false } = {}) {
    assert(!this.store.state.pending && safeName(name) && this.record.status === 'active' && !this.record.outputs[name]);
    body = Buffer.from(body); this.check(body.length);
    const store = this.store;
    if (!materialize) {
      const found = Object.entries(store.state.files).find(([, meta]) => meta.sha256 === digest(body) && meta.bytes === body.length);
      if (found) { verify(store.file(found[0]), found[1]); this.record.outputs[name] = found[0]; store.save(); return store.file(found[0]); }
    }
    const relative = `runs/${this.id}/${name}`;
    store.state.pending = { action: 'write', file: relative }; store.save();
    store.state.files[relative] = writeNew(store.file(relative), body);
    this.record.outputs[name] = relative; store.state.pending = null; store.save();
    return store.file(relative);
  }
  expectExternal(names) {
    assert(names.every(safeName));
    this.record.external = [...new Set([...this.record.external, ...names])]; this.store.save();
  }
  sealExternal() {
    assert(!this.store.state.pending, 'Interrupted output registration');
    this.check();
    for (const name of fs.readdirSync(this.directory)) {
      const relative = `runs/${this.id}/${name}`;
      if (this.store.state.files[relative]) { verify(this.store.file(relative), this.store.state.files[relative]); continue; }
      assert(this.record.external.includes(name), 'Undeclared external output; preserve and stop: ' + name);
      const file = this.store.file(relative); this.store.probe([file]);
      this.store.state.files[relative] = evidence(file); this.record.outputs[name] = relative;
    }
    this.store.save();
  }
  finish(status) {
    assert(['validated', 'failed'].includes(status)); this.sealExternal();
    this.store.inspect();
    this.record.status = status;
    const roots = this.store.state.roots[this.record.product] ||= {};
    roots[status === 'validated' ? 'candidate' : 'failure'] = this.id;
    this.store.save(); this.store.prune(); this.store.close();
  }
}
function begin(product, output, dependencies) {
  const store = new Store().open(); return store.begin(product, output, dependencies);
}
function readSnapshot(directory, name) {
  const store = new Store();
  if (path.resolve(directory).startsWith(store.root + path.sep)) {
    assert(safeName(name)); ancestors(store.root);
    const state = JSON.parse(fs.readFileSync(store.stateFile, 'utf8'));
    assert(!state.pending, 'Interrupted managed snapshot');
    const id = path.basename(directory), run = state.runs[id];
    assert(samePath(path.resolve(directory), path.join(store.root, 'runs', id)) && run?.status === 'validated');
    const relative = run.outputs[name]; assert(relative && state.files[relative]);
    verify(store.file(relative), state.files[relative]); return fs.readFileSync(store.file(relative));
  }
  // Explicit pre-existing snapshots are read-only dependencies; never enroll or delete them.
  assert(safeName(name)); const file = path.join(directory, name); evidence(file); return fs.readFileSync(file);
}
function dependency(directory) {
  const root = path.join(ROOT, POLICY.root);
  return directory && path.resolve(directory).startsWith(root + path.sep) ? [path.basename(directory)] : [];
}
function preflightBuild(bytes = 0) {
  assert(Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= POLICY.sourceBuildMaxBytes, 'Source generation capacity exceeded');
  const store = new Store();
  if (!fs.existsSync(store.root)) return;
  store.open();
  try { store.prune(); assert(store.inspect().bytes + bytes <= POLICY.budgetBytes, 'Managed capacity exceeded'); }
  finally { if (!store.state.pending) store.close(); }
}
function withBuildBudget(bytes, produce) {
  assert(Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= POLICY.sourceBuildMaxBytes, 'Source generation capacity exceeded');
  assert.equal(typeof produce, 'function');
  const store = new Store().open();
  store.prune(); assert(store.inspect().bytes + bytes <= POLICY.budgetBytes, 'Managed capacity exceeded');
  // Fixed tracked outputs are never enrolled as disposable artifacts. A partial source write blocks further builds.
  store.state.pending = { action: 'source-build', reservedBytes: bytes }; store.save();
  produce();
  store.state.pending = null; store.save(); store.close();
}
module.exports = { Store, begin, readSnapshot, dependency, preflightBuild, withBuildBudget, usageClear, evidence, verify, POLICY, ROOT };
if (require.main === module) {
  assert.equal(process.argv[2], '--check'); preflightBuild();
  console.log('Artifact capacity/registration preflight OK (legacy directories untouched)');
}
