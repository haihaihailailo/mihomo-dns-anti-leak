// 显式启用的本机诊断；真实订阅只经 stdin 和 loopback API 传递，不落盘、不打印。
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const YAML = require('yaml');
const {applyNodeServerAliases} = require('./node_server_aliases.cjs');
const lifecycle = require('./artifact_lifecycle.cjs');
async function main() {
  assert(process.env.SUBSCRIPTION_PROBE_OPT_IN === '1', 'Explicit network probe opt-in required');
  const inputs = JSON.parse(process.env.SUBSCRIPTION_PROBE_FILES || '[]');
  const extensions = process.env.SUBSCRIPTION_PROBE_EXTENSIONS === '1';
  const requested = JSON.parse(process.env.SUBSCRIPTION_PROBE_NAMES || '[]');
  assert(Array.isArray(requested) && requested.length <= 8 && requested.every(name => typeof name === 'string' && name.length <= 256));
  assert(inputs.length > 0 && inputs.length <= 3);
  const subscriptions = inputs.map(file => {
    assert(path.isAbsolute(file) && fs.statSync(file).size < 4 * 1024 * 1024);
    const raw = fs.readFileSync(file, 'utf8');
    const config = YAML.parse(raw, {maxAliasCount: 100});
    assert(Array.isArray(config.proxies) && config.proxies.length <= 200);
    const originalUdp = config.proxies.filter(p => p.udp === true).length;
    applyNodeServerAliases(config);
    // 抽样协议/传输与主要地区；可选精确节点名通过环境变量传入，不固化私人名单。
    const selected = new Set(), counts = new Map();
    const real = p => !/^(Traffic|Expire|Expiry|Expiration)\s*[:：]|官网|套餐|剩余|到期|过期/i.test(p.name);
    config.proxies.forEach((p, index) => {
      if (!real(p)) return;
      const key = `${p.type}/${p.network || 'default'}`;
      if ((counts.get(key) || 0) < (extensions ? 1 : 2)) selected.add(index);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    for (const region of (extensions ? [] : [/香港|Hong Kong/i, /新加坡|Singapore/i, /美国|United States/i])) {
      const index = config.proxies.findIndex(p => real(p) && region.test(p.name));
      if (index >= 0) selected.add(index);
    }
    for (const name of requested) {
      const index = config.proxies.findIndex(p => real(p) && p.name === name);
      if (index >= 0) selected.add(index);
    }
    assert(selected.size <= 16, 'Bounded sample exceeded');
    return {source: path.basename(file), modified: fs.statSync(file).mtime.toISOString(),
      total: config.proxies.length, originalUdp, enabledUdp: config.proxies.filter(p => p.udp === true).length,
      types: Object.fromEntries(counts), hosts: config.hosts || {},
      proxies: [...selected].map(i => config.proxies[i])};
  });
  const artifact = lifecycle.begin('runtime', undefined, lifecycle.dependency(process.env.SUBSCRIPTION_PROBE_PREVIOUS));
  artifact.expectExternal(['cache.db', 'cache.db-shm', 'cache.db-wal']);
  let success = false;
  try {
    const child = spawn(process.env.SUBSCRIPTION_PROBE_PYTHON, [path.join(__dirname, 'probe_subscription_capabilities.py'),
      process.env.MIHOMO_TEST_BIN, artifact.directory], {windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']});
    let output = '';
    child.stdout.on('data', data => { output += data; if (output.length > 512000) child.kill(); });
    // Python 只将节点名和结果写到 stderr；内核 stdout/stderr 均丢弃。
    child.stderr.on('data', data => process.stderr.write(data));
    child.stdin.end(JSON.stringify(subscriptions));
    const exit = await new Promise((resolve, reject) => {child.once('error', reject); child.once('close', resolve);});
    assert.equal(exit, 0, 'Guarded network probe failed');
    const report = JSON.parse(output);
    artifact.put('capabilities.json', JSON.stringify(report, null, 2));
    success = true;
    console.log(JSON.stringify({report: artifact.directory, ...report}, null, 2));
  } finally {artifact.finish(success ? 'validated' : 'failed');}
}
main().catch(error => {console.error(error.name + ': diagnostic did not complete; preserve registered evidence'); process.exitCode = 1;});
