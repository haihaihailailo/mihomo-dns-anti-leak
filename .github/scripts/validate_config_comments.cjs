// 只读、合成验收：注释覆盖、重复生成、原生标记、JS 执行结果和可选 Git 基线对比。
'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { ROOT, read, parse, evaluate, renderProfiles } = require('./build_profiles.cjs');
const { renderNativeProfiles, parseShadow } = require('./build_native_profiles.cjs');
const { renderRouterProfiles, renderRouterOverrides } = require('./build_router_profiles.cjs');
const { annotateYaml, annotateJs, annotateShadow, MARK } = require('./config_comments.cjs');
const profiles = renderProfiles();
const outputs = [...profiles.flatMap(p => [{ file: p.stem + '.yaml', content: p.yaml }, { file: p.stem + '.js', content: p.js }]),
  ...renderNativeProfiles(), ...renderRouterProfiles(profiles), ...renderRouterOverrides(profiles)];
assert.equal(outputs.length, 12);
for (const { file, content } of outputs) assert.equal(read(file), content, file + ' 注释生成结果过期');
const files = [...['yaml', 'js', 'stoverride', 'conf'].map(ext => '.github/config/shared.' + ext), ...outputs.map(x => x.file)];
const activeLines = text => text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
const parser = file => file.endsWith('.js') ? evaluate : file.endsWith('.conf')
  ? file.includes('路由器') ? activeLines : parseShadow : parse;
const annotate = file => file.endsWith('.js') ? annotateJs : file.endsWith('.conf') ? annotateShadow : annotateYaml;
for (const file of files) {
  const text = read(file);
  assert(text.includes(MARK), file + ' 缺少中文注释');
  if (file.includes('路由器') && file.endsWith('.conf')) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('ruby_edit ')) {
      assert(lines[i - 1].startsWith('# ' + MARK), file + ' 覆写命令缺少注释');
    }
  } else {
    assert.equal(annotate(file)(text), text, file + ' 注释不完整或重复生成不稳定');
  }
}

// 小型负向控制：省略注释必须能被覆盖检查察觉，特殊标记/字面量不能被破坏。
const yamlFixture = 'dns:\n  nameserver-policy: #!replace\n    "example.test": ["https://example.test/dns-query#AI"]\nrules:\n  - DOMAIN,example.test,DIRECT\n';
const yamlCommented = annotateYaml(yamlFixture);
assert.notEqual(yamlCommented, yamlFixture);
assert(yamlCommented.includes('nameserver-policy: #!replace'));
assert.deepEqual(parse(yamlCommented), parse(yamlFixture));
assert.equal(annotateYaml(yamlCommented), yamlCommented);
const jsFixture = 'const RULES_TEXT = `\nDOMAIN,example.test,DIRECT\n`;\nfunction main(config) { return { rules: RULES_TEXT.split("\\n").filter(Boolean), literal: "https://example.test/#AI" }; }\n';
assert.deepEqual(evaluate(annotateJs(jsFixture)), evaluate(jsFixture));
assert.equal(annotateJs(annotateJs(jsFixture)), annotateJs(jsFixture));

// 仅在明确的注释验收模式启用：比较固定 SHA 中的公开配置，不读取凭据或历史私有文件。
if (process.env.CONFIG_COMMENTS_BASELINE) {
  const ref = process.env.CONFIG_COMMENTS_BASELINE;
  assert(/^[0-9a-f]{40}$/.test(ref), '注释基线必须是完整 commit SHA');
  const git = args => execFileSync('git', ['-c', 'safe.directory=' + ROOT.replace(/\\/g, '/'), ...args],
    { cwd: ROOT, encoding: 'utf8', timeout: 10000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }).replace(/\r\n/g, '\n');
  for (const file of files) {
    const before = git(['show', ref + ':' + file]);
    const after = read(file);
    assert.deepEqual(parser(file)(after), parser(file)(before), file + ' 注释改变了有效配置');
    if (file.endsWith('.yaml') || file.endsWith('.stoverride')) {
      // 比较序列化结果也验证所有对象的键顺序，尤其 nameserver-policy。
      assert.equal(JSON.stringify(parse(after)), JSON.stringify(parse(before)), file + ' 配置键顺序改变');
      const markers = text => text.split('\n').filter(line => line.includes('#!replace'));
      assert.deepEqual(markers(after), markers(before), file + ' Stash 覆写标记改变');
    }
    if (file.endsWith('.js')) for (const input of [{}, { tun: { enable: false, mtu: 1400 }, mode: 'rule', ipv6: false }]) {
      assert.equal(JSON.stringify(evaluate(after, input)), JSON.stringify(evaluate(before, input)), file + ' JS 合成输入结果改变');
    }
  }
  console.log('注释基线 ' + ref + '：16 个配置的有效内容、键/规则顺序及 JS 执行结果完全一致');
  // 复用已有的只读配置回归；不调用产生文件的生命周期或隔离内核测试。
  require('./validate_profiles.cjs');
}
console.log('16 个配置的中文注释覆盖、生成一致性、幂等与字面量/覆写标记保护 OK（只读，无客户端操作）');
