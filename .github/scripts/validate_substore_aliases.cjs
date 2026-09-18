// 由唯一验收入口间接调用；仅使用内存合成订阅，无网络和设备操作。
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const YAML = require('yaml');
const { buildSubstoreAliases } = require('./substore_node_aliases.cjs');

function run() {
  const base = { name: '合成', type: 'ss', server: 'in.aws-agent.com', port: 1234,
    password: 'synthetic', plugin: 'obfs', 'plugin-opts': { mode: 'http', host: 'cover.example.test' },
    udp: false, tfo: false, mptcp: false };
  const context = vm.createContext({ ProxyUtils: { yaml: { safeLoad: YAML.parse } } });
  vm.runInContext(buildSubstoreAliases(), context, { timeout: 1000 });
  const invoke = raw => {
    context.input = [{ ...base }]; context.raw = raw;
    return JSON.parse(JSON.stringify(vm.runInContext('operator(input,"JSON",{raw})', context, { timeout: 1000 })));
  };
  const raw = 'hosts:\n  in.aws-agent.com: out.apt-agent.dev\n';
  assert.deepEqual(invoke([raw]), [{ ...base, server: 'out.apt-agent.dev' }]);
  assert.deepEqual(invoke(['ss://synthetic']), [base]);
  assert.deepEqual(invoke([]), [base]);
  assert.throws(() => invoke(undefined), /raw context required/);
  assert.throws(() => invoke(['hosts: []']), /invalid hosts/);
  assert.throws(() => invoke([raw, raw.replace('out.', 'other.')]), /conflicting/);
  assert.throws(() => invoke(['hosts:\n  in.aws-agent.com: in.aws-agent.com']), /cyclic/);
  assert.equal(context.input[0].server, base.server);
  context.input = [{ ...base, server: 'out.apt-agent.dev' }]; context.raw = [raw];
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('operator(input,"JSON",{raw})', context, { timeout: 1000 }))), context.input);
  console.log('Sub-Store 别名：原始上下文、来源隔离、能力保留、冲突/循环拒绝与幂等 OK');
}
module.exports = { run };
