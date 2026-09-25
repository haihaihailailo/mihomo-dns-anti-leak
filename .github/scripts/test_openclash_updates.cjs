// Run only through validate_health_checks.py. Shell effects are mocked in memory.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { prepare } = require('../../maintenance/prepare-openclash-updates.cjs');
const sha = input => crypto.createHash('sha256').update(input).digest('hex');
const oldGeo = `   [ -z "$(grep "openclash_geo.sh" "$CRON_FILE" 2>/dev/null)" ] && {
      [ "$(uci_get_config "geo_auto_update")" -eq 1 ] && echo "0 $(uci_get_config "geo_update_day_time" || 1) * * $(uci_get_config "geo_update_week_time" || 0) /usr/share/openclash/openclash_geo.sh ipdb #openclash-cron-task" >> $CRON_FILE
      [ "$(uci_get_config "geosite_auto_update")" -eq 1 ] && echo "0 $(uci_get_config "geosite_update_day_time" || 1) * * $(uci_get_config "geosite_update_week_time" || 0) /usr/share/openclash/openclash_geo.sh geosite #openclash-cron-task" >> $CRON_FILE
      [ "$(uci_get_config "geoip_auto_update")" -eq 1 ] && echo "0 $(uci_get_config "geoip_update_day_time" || 1) * * $(uci_get_config "geoip_update_week_time" || 0) /usr/share/openclash/openclash_geo.sh geoip #openclash-cron-task" >> $CRON_FILE
      [ "$(uci_get_config "geoasn_auto_update")" -eq 1 ] && echo "0 $(uci_get_config "geoasn_update_day_time" || 1) * * $(uci_get_config "geoasn_update_week_time" || 0) /usr/share/openclash/openclash_geo.sh geoasn #openclash-cron-task" >> $CRON_FILE
   }
`;
const before = '#!/bin/sh\n# unrelated prefix\n', after = '# unrelated suffix\n';
const fixture = before + oldGeo + after;
const geo = prepare(fixture, sha(fixture), 'geo');
assert(geo.startsWith(before) && geo.endsWith(after));
const oldCurl = `download() {
    if ! mv -f "$DOWNLOAD_TMP" "$DOWNLOAD_PATH"; then
        return 1
    fi
    return 0
}
`;
const curl = prepare(oldCurl, sha(oldCurl), 'overwrite');
for (const kind of ['geo', 'overwrite']) {
  const original = kind === 'geo' ? fixture : oldCurl;
  const patched = kind === 'geo' ? geo : curl;
  for (const invalid of [original + original, original.replace(kind === 'geo' ? 'geosite_auto_update' : 'mv -f', 'upstream_changed'), patched, Buffer.alloc(524289, 120), Buffer.concat([Buffer.from(original), Buffer.from([255])])]) {
    assert.throws(() => prepare(invalid, sha(invalid), kind));
  }
  assert.throws(() => prepare(original, '0'.repeat(64), kind), /hash/);
  assert.throws(() => prepare(original, sha(original), 'unknown'), /kind/);
}
const shell = process.env.OPENCLASH_TEST_SHELL || 'sh';
function run(script) {
  const p = spawnSync(shell, ['-s'], { input: script, encoding: 'utf8', timeout: 4000, maxBuffer: 65536 });
  if (p.error) throw p.error;
  assert.equal(p.status, 0, p.stderr);
  return p.stdout.trim();
}
const shellProbe = spawnSync(shell, ['-c', 'exit 0'], { timeout: 4000 });
if (shellProbe.error?.code === 'ENOENT') {
  if (process.env.CI === 'true' || process.env.OPENCLASH_RUBY_TEST === '1') throw Error('POSIX shell required in CI');
  console.log('OpenClash update builder preservation/rejection PASS; shell behavior NOT RUN (sh unavailable)');
  process.exit(0);
}
assert.equal(shellProbe.status, 0);
// No cron files: echo is an in-memory collector, grep queries that collector.
function geoRun(block, existing, enabled) {
  return run(`CRON_FILE=/dev/null
rows='${existing}'
uci_get_config() { case "$1" in *_auto_update) printf '%s' '${enabled}';; *_week_time) printf '*';; *) printf 4;; esac; }
echo() { rows="$rows
$*"; }
grep() { if [ "$1" = -F ]; then shift; fi; case "$rows" in *"$1"*) printf found;; esac; }
${block}${block}
printf '%s' "$rows"
`).split('\n').filter(Boolean);
}
const existing = '0 4 * * * /usr/share/openclash/openclash_geo.sh ipdb #openclash-cron-task';
assert.equal(geoRun(oldGeo, existing, 1).length, 1, 'negative control must reproduce the missed-task bug');
for (const initial of ['', existing]) {
  const rows = geoRun(geo, initial, 1);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows).size, 4);
  for (const type of ['ipdb', 'geosite', 'geoip', 'geoasn']) assert(rows.some(row => row.endsWith(type + ' #openclash-cron-task')));
}
assert.equal(geoRun(geo, '', 0).length, 0, 'disabled options must remain disabled');
assert.deepEqual(geoRun(geo, existing, 0), [existing]);
// Native post-download body is tested with cmp/mv/rm/log stubs; no downloads,
// file mutation, ETag writes, or real service commands can be executed.
function downloadRun(body, compareStatus, samePath = true, exists = true) {
  return run(`DOWNLOAD_PATH='maintenance/README.md'
FILE_PATH='${exists ? (samePath ? 'maintenance/README.md' : 'README.md') : 'synthetic-file-that-does-not-exist'}'
DOWNLOAD_TMP=synthetic-temp; HEADER_TMP=synthetic-header
cmp() { printf 'compare\n'; return ${compareStatus}; }
mv() { printf 'replace\n'; return 0; }
rm() { :; }; LOG_OUT() { :; }
${body}
download && printf 'restart\n'
printf 'completed\n'
`);
}
assert(downloadRun(oldCurl, 0).includes('restart'), 'negative control must reproduce unnecessary restart');
assert.equal(downloadRun(curl, 0), 'compare\ncompleted');
assert.equal(downloadRun(curl, 1), 'compare\nreplace\nrestart\ncompleted');
assert.equal(downloadRun(curl, 2), 'compare\ncompleted', 'comparison errors must preserve old content');
assert.equal(downloadRun(curl, 0, false), 'replace\nrestart\ncompleted', 'separate-path callers must be unchanged');
assert.equal(downloadRun(curl, 0, true, false), 'replace\nrestart\ncompleted', 'first installation must still work');
console.log('OpenClash updates PASS: source rejection, partial GEO schedules, idempotence, disabled options, identical/changed/error/missing/distinct-path downloads; memory-only shell fixtures');
