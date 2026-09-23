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
    const telegram = spawnSync('ruby', [require('node:path').join(__dirname, 'test_openclash_telegram_split.rb')],
      { encoding: 'utf8', timeout: 5000, maxBuffer: 128 * 1024 });
    assert.equal(telegram.status, 0, telegram.error?.message || telegram.stderr);
    process.stdout.write(telegram.stdout);
  } else {
    assert.notEqual(process.env.OPENCLASH_RUBY_TEST, '1', 'Required Ruby runtime is unavailable');
    console.log('Node alias / Telegram native Ruby checks NOT RUN (Ruby unavailable)');
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
    for (const key of ['tun', 'unified-delay', 'ipv6', 'mode', 'mixed-port', 'proxies', 'proxy-providers', 'secret', 'authentication']) {
      assert(!Object.hasOwn(config, key), `路由器模板不得分发设备/私有字段：${key}`);
    }
    for (const key of ['listen', 'ipv6', 'fake-ip-range6']) assert(!Object.hasOwn(config.dns, key));
    assert(source.rules.some(rule => rule.startsWith('PROCESS-')), '缺少进程规则正向样本');
    assert(!config.rules.some(rule => /PROCESS-/.test(rule)));
    assert.deepEqual(config.rules, source.rules.filter(rule => !rule.startsWith('PROCESS-'))
      .map(rule => rule.replace(/^GEOIP,VN,/, 'RULE-SET,geoip-vn,')),
      '当前非进程规则的内容/顺序不得改变；新增逻辑进程规则须单独审查');
    // 全对象差异允许列表：包括策略组、测速、规则集、DNS 策略在内，其余完全不变。
    const restored = clone(config);
    delete restored['find-process-mode'];
    assert.equal(config['geo-auto-update'], false, '路由器 GEO 更新必须交给 OpenClash');
    assert(!Object.hasOwn(config, 'geo-update-interval'), '内核 GEO 更新关闭后不得保留无效间隔');
    assert(config.rules.includes('RULE-SET,geoip-vn,越南服务,no-resolve'));
    assert(!config.rules.some(rule => rule.startsWith('GEOIP,VN,')), '不能依赖只含 CN 的设备库识别越南');
    assert.equal(config['rule-providers']['geoip-vn'].behavior, 'ipcidr');
    assert.equal(config['rule-providers']['geoip-vn'].format, 'mrs');
    for (const provider of Object.values(config['rule-providers'])) {
      if (provider.type === 'http') assert(Number.isInteger(provider.interval) && provider.interval > 0 && provider.interval <= 86400,
        'Enabled rule-provider updates must run at least daily');
    }
    assert.equal(config['rule-providers']['geoip-vn'].url,
      'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/vn.mrs');
    restored['geo-auto-update'] = source['geo-auto-update'];
    restored['geo-update-interval'] = source['geo-update-interval'];
    restored['rule-providers'] = clone(source['rule-providers']);
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
    tun: { enable: true }, 'unified-delay': true, ipv6: true, secret: 'synthetic-only', authentication: ['test:test'],
    proxies: [{ name: 'synthetic-only' }], 'proxy-providers': { test: { url: 'https://example.invalid/' } },
    rules: ['PROCESS-NAME,test.exe,DIRECT', 'AND,((PROCESS-NAME,test.exe),(NETWORK,TCP)),DIRECT',
      'DOMAIN,example.org,DIRECT', 'MATCH,REJECT'] };
  const before = clone(synthetic);
  assert.deepEqual(routerConfig(synthetic), { dns: {}, 'find-process-mode': 'off', 'geo-auto-update': false,
    rules: ['DOMAIN,example.org,DIRECT', 'MATCH,REJECT'] });
  assert.deepEqual(synthetic, before);
  for (const result of renderRouterOverrides(sources)) {
    assert.equal(read(result.file), result.content, `${result.file} 生成结果过期`);
    const activeLines = result.content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    // Only the native update/restart directive is permitted before deterministic Ruby commands.
    // Missing/disabled RESTART, extra General settings and misplaced sections must fail validation.
    assert.deepEqual(activeLines.slice(0, 3), ['[General]', 'RESTART = true', '[Overwrite]'],
      'Module must enable native update activation without overriding device settings');
    const commands = activeLines.slice(3);
    const decoded = {};
    let nodeAdapterSeen = false;
    for (const line of commands) {
      const match = line.match(/^ruby_edit "\$CONFIG_FILE" "\['([a-z-]+)'\]" "([^"\n]+)"$/);
      assert(match, 'Only deterministic ruby_edit commands are allowed');
      const [, key, expression] = match;
      if (key === 'proxies') {
        assert(!nodeAdapterSeen, 'Only one node adapter assignment is allowed');
        nodeAdapterSeen = true;
        const code = expression.match(/^\(lambda \{ \|scope\| scope\.module_eval\('([A-Za-z0-9+/=]+)'\.unpack1\('m0'\)\.force_encoding\('UTF-8'\)\); scope\.const_get\(:OpenClashNodeAliases\)\.rewrite\(Value\.fetch\('proxies', \[\]\), Value\.fetch\('hosts', \{\}\)\) \}\)\.call\(Module\.new\)$/);
        assert(code, 'Only the isolated fixed-source node adapter is allowed');
        assert.equal(Buffer.from(code[1], 'base64').toString('utf8'), read('.github/scripts/openclash_node_aliases.rb'));
        continue;
      }
      assert(!Object.hasOwn(decoded, key), 'Duplicate assignments race in OpenClash');
      const payload = expression.match(/YAML\.safe_load\('([A-Za-z0-9+/=]+)'\.unpack1\('m0'\)\.force_encoding\('UTF-8'\), aliases: true\)/);
      assert(payload);
      assert(!/[`$\\]/.test(expression), 'Shell interpolation in Ruby expression');
      decoded[key] = JSON.parse(Buffer.from(payload[1], 'base64').toString('utf8'));
      if (key === 'dns') {
        const adapter = expression.match(/scope\.module_eval\('([A-Za-z0-9+/=]+)'\.unpack1\('m0'\)\.force_encoding\('UTF-8'\)\)/);
        assert(adapter, 'DNS adapter must be embedded fixed source');
        assert.equal(Buffer.from(adapter[1], 'base64').toString('utf8'), read('.github/scripts/openclash_local_dns.rb'));
      }
    }
    assert.deepEqual(decoded, result.config, 'Module must contain the complete router projection');
    assert(nodeAdapterSeen, 'Remote module must carry the portable node adapter');
    const input = { ...clone(synthetic), 'mixed-port': 9876, mode: 'rule',
      dns: { ...clone(synthetic.dns), 'nameserver-policy': { 'old.invalid': 'old-group' },
        'proxy-server-nameserver-policy': { 'old.invalid': 'old-group' } },
      'proxy-groups': [{ name: 'old-group', type: 'select', proxies: ['DIRECT'] }],
      hosts: { 'entry.aws-agent.com': 'relay.apt-agent.dev', 'plain.example.test': 'relay.example.test' },
      proxies: [
        { name: 'synthetic flower', type: 'ss', server: 'entry.aws-agent.com', password: 'synthetic-only',
          plugin: 'obfs', 'plugin-opts': { mode: 'http', host: 'cover.example.test' },
          udp: false, tfo: true, mptcp: true, 'udp-over-tcp': false, smux: { enabled: false } },
        { name: 'synthetic plain', type: 'ss', server: 'plain.example.test', udp: false },
        { name: 'synthetic TLS', type: 'trojan', server: 'plain.example.test', sni: 'plain.example.test', udp: false },
      ],
      'rule-providers': { old: {} } };
    const expected = { ...clone(input), ...clone(result.config),
      proxies: [ { ...clone(input.proxies[0]), server: 'relay.apt-agent.dev', udp: true },
        { ...clone(input.proxies[1]), server: 'relay.example.test' }, clone(input.proxies[2]) ],
      dns: { ...clone(synthetic.dns), ...clone(result.config.dns) } };
    assert.equal(expected.dns.listen, '127.0.0.1:9999', 'OpenClash CONF 必须保留设备 DNS 监听');
    assert.equal(expected.dns.ipv6, true, 'OpenClash CONF 必须保留设备 DNS IPv6 开关');
    assert.equal(expected.dns['fake-ip-range6'], 'fd00::/64', 'OpenClash CONF 必须保留设备 IPv6 fake-ip 地址池');
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
      console.log(`${result.file}: real sh/Ruby roundtrip, alias/limited UDP, other node fields/device preservation, stale DNS removal OK`);
    } else {
      console.log(`${result.file}: exact payload/source parity OK; native sh/Ruby NOT RUN (OPENCLASH_RUBY_TEST=1)`);
    }
  }
}
module.exports = { run };
