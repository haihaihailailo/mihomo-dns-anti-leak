// 由唯一离线入口调用：不联网、不读订阅、不操作路由器。
const assert = require('node:assert/strict');
const YAML = require('yaml');
const { read, renderProfiles } = require('./build_profiles.cjs');
const { routerConfig, renderRouterProfiles } = require('./build_router_profiles.cjs');
const clone = value => JSON.parse(JSON.stringify(value));

function run() {
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
}
module.exports = { run };
