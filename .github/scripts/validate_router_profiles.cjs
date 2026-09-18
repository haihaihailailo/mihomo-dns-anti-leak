// 由唯一离线入口调用：不联网、不读订阅、不操作路由器。
const assert = require('node:assert/strict');
const YAML = require('yaml');
const { read, renderProfiles } = require('./build_profiles.cjs');
const { routerConfig, renderRouterProfiles, renderRouterOverrides } = require('./build_router_profiles.cjs');
const { spawnSync } = require('node:child_process');
const clone = value => JSON.parse(JSON.stringify(value));

function run() {
  // 复用唯一测试入口；无 Ruby 的 Windows 主机明确报告未运行，设备/CI 可跑同一夹具。
  const rubyVersion = spawnSync('ruby', ['--version'], { encoding: 'utf8', timeout: 3000 });
  if (rubyVersion.status === 0) {
    const aliases = spawnSync('ruby', [require('node:path').join(__dirname, 'test_openclash_node_aliases.rb')],
      { encoding: 'utf8', timeout: 5000, maxBuffer: 128 * 1024 });
    assert.equal(aliases.status, 0, aliases.error?.message || aliases.stderr);
    process.stdout.write(aliases.stdout);
  } else {
    assert.notEqual(process.env.OPENCLASH_RUBY_TEST, '1', 'Required Ruby runtime is unavailable');
    console.log('Node alias native Ruby checks NOT RUN (Ruby unavailable)');
  }
  const sources = renderProfiles();
  for (const result of renderRouterProfiles(sources)) {
    const source = sources.find(p => p.environment === result.environment).config;
    const before = clone(source);
    const config = result.config;
    assert.equal(read(result.file), result.content, `${result.file} 生成结果过期`);
    for (const version of ['1.1', '1.2']) {
      assert.deepEqual(YAML.parse(result.content, { version, merge: true, uniqueKeys: true, maxAliasCount: 1000 }), config);
    }
    assert.match(result.content, /^find-process-mode: "off"$/m);
    assert.equal(config['find-process-mode'], 'off');
    for (const key of ['tun', 'ipv6', 'mode', 'mixed-port', 'proxies', 'proxy-providers', 'secret', 'authentication']) {
      assert(!Object.hasOwn(config, key), `路由器模板不得分发设备/私有字段：${key}`);
    }
    for (const key of ['listen', 'ipv6', 'fake-ip-range6']) assert(!Object.hasOwn(config.dns, key));
    assert(source.rules.some(rule => rule.startsWith('PROCESS-')), '缺少进程规则正向样本');
    assert(!config.rules.some(rule => /PROCESS-/.test(rule)));
    assert.deepEqual(config.rules, source.rules.filter(rule => !rule.startsWith('PROCESS-')),
      '当前非进程规则的内容/顺序不得改变；新增逻辑进程规则须单独审查');
    // 全对象差异允许列表：包括策略组、测速、规则集、DNS 策略在内，其余完全不变。
    const restored = clone(config);
    delete restored['find-process-mode'];
    restored.rules = clone(source.rules);
    restored.dns = clone(source.dns);
    if (Object.hasOwn(source, 'tun')) restored.tun = clone(source.tun);
    assert.deepEqual(restored, source);
    assert.deepEqual(routerConfig(config), config, '路由器投影必须幂等');
    assert.deepEqual(source, before, '不得修改桌面/手机源配置');
    assert.equal(config['proxy-groups'].find(g => g.name === 'AI').proxies[0], '美国-AI-自动');
    assert.equal(config['proxy-groups'].some(g => g.name === '中国节点'), result.environment === '国外');
    console.log(`${result.file}: YAML 1.1/1.2、设备边界、完整差异、进程移除、生成漂移 OK (${config.rules.length} rules)`);
  }
  const synthetic = { dns: { listen: '127.0.0.1:9999', ipv6: true, 'fake-ip-range6': 'fd00::/64' },
    tun: { enable: true }, ipv6: true, secret: 'synthetic-only', authentication: ['test:test'],
    proxies: [{ name: 'synthetic-only' }], 'proxy-providers': { test: { url: 'https://example.invalid/' } },
    rules: ['PROCESS-NAME,test.exe,DIRECT', 'AND,((PROCESS-NAME,test.exe),(NETWORK,TCP)),DIRECT',
      'DOMAIN,example.org,DIRECT', 'MATCH,REJECT'] };
  const before = clone(synthetic);
  assert.deepEqual(routerConfig(synthetic), { dns: {}, 'find-process-mode': 'off',
    rules: ['DOMAIN,example.org,DIRECT', 'MATCH,REJECT'] });
  assert.deepEqual(synthetic, before);
  for (const result of renderRouterOverrides(sources)) {
    assert.equal(read(result.file), result.content, `${result.file} 生成结果过期`);
    const commands = result.content.split('\n').filter(line => line && !line.startsWith('#') && line !== '[Overwrite]');
    const decoded = {};
    for (const line of commands) {
      const match = line.match(/^ruby_edit "\$CONFIG_FILE" "\['([a-z-]+)'\]" "([^"\n]+)"$/);
      assert(match, 'Only deterministic ruby_edit commands are allowed');
      const [, key, expression] = match;
      assert(!Object.hasOwn(decoded, key), 'Duplicate assignments race in OpenClash');
      const payload = expression.match(/YAML\.safe_load\('([A-Za-z0-9+/=]+)'\.unpack1\('m0'\)\.force_encoding\('UTF-8'\), aliases: true\)/);
      assert(payload);
      assert(!/[`$\\]/.test(expression), 'Shell interpolation in Ruby expression');
      decoded[key] = JSON.parse(Buffer.from(payload[1], 'base64').toString('utf8'));
    }
    assert.deepEqual(decoded, result.config, 'Module must contain the complete router projection');
    const input = { ...clone(synthetic), 'mixed-port': 9876, mode: 'rule',
      dns: { ...clone(synthetic.dns), 'nameserver-policy': { 'old.invalid': 'old-group' },
        'proxy-server-nameserver-policy': { 'old.invalid': 'old-group' } },
      'proxy-groups': [{ name: 'old-group', type: 'select', proxies: ['DIRECT'] }],
      'rule-providers': { old: {} } };
    const expected = { ...clone(input), ...clone(result.config),
      dns: { ...clone(synthetic.dns), ...clone(result.config.dns) } };
    if (process.env.OPENCLASH_RUBY_TEST === '1') {
      // Run actual POSIX shell quoting and Ruby assignment semantics, in memory.
      // Mirrors official ruby_edit's Value$2=$3 contract, not router service logic.
      const shell = 'ruby_edit() { printf "threads << Thread.new { Value%s=%s }\\n" "$2" "$3"; }\nCONFIG_FILE=synthetic-only\n' + commands.join('\n');
      const sh = spawnSync('sh', ['-s'], { input: shell, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
      assert.equal(sh.status, 0, sh.error?.message || sh.stderr);
      const program = `require 'yaml'; require 'json'; Value=JSON.parse(STDIN.read); 2.times do\nthreads=[]\n${sh.stdout}\nthreads.each(&:value)\nend; STDOUT.write(JSON.generate(Value))`;
      const ruby = spawnSync('ruby', ['-E', 'UTF-8', '-e', program], {
        input: JSON.stringify(input), encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
      });
      assert.equal(ruby.status, 0, ruby.error?.message || ruby.stderr);
      assert.deepEqual(JSON.parse(ruby.stdout), expected, 'Ruby merge, Chinese/regex roundtrip and idempotence');
      console.log(`${result.file}: real sh/Ruby roundtrip, private/device preservation, stale DNS removal OK`);
    } else {
      console.log(`${result.file}: exact payload/source parity OK; native sh/Ruby NOT RUN (OPENCLASH_RUBY_TEST=1)`);
    }
  }
}
module.exports = { run };
