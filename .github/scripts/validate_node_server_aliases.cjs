// 唯一离线入口调用；仅内存合成输入、受超时约束的 JS VM，不访问订阅或设备。
"use strict";
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { applyNodeServerAliases } = require("./node_server_aliases.cjs");
const { read } = require("./build_profiles.cjs");
const clone = value => JSON.parse(JSON.stringify(value));

function run() {
  let checks = 0;
  const check = (label, fn) => {
    try { fn(); checks++; } catch (error) { error.message = label + ": " + error.message; throw error; }
  };
  // 和手机一样，仅提供 config 对象，不提供 require / process / 文件及网络 API。
  function runner(code, expression = "main(input)") {
    const sandbox = vm.createContext({});
    vm.runInContext(code, sandbox, { timeout: 1000 });
    return input => {
      sandbox.input = input;
      return vm.runInContext(expression, sandbox, { timeout: 1000 });
    };
  }
  const rewrite = runner(applyNodeServerAliases.toString(), "applyNodeServerAliases(input)");
  const base = { name: "合成 SS", type: "ss", server: "entry.example.test", port: 1234,
    password: "synthetic-only", cipher: "aes-128-gcm", udp: false };
  const hosts = { "entry.example.test": "relay.example.test" };
  const input = (extra = {}) => ({ hosts: clone(hosts), proxies: [clone(base)], ...extra });
  const server = config => rewrite(config).proxies[0].server;
  check("基本转换及只有 server 差异", () => {
    const before = input();
    const originalNodes = before.proxies;
    assert.equal(rewrite(before), before);
    assert.deepEqual(clone(before.proxies), [{ ...base, server: "relay.example.test" }]);
    assert.deepEqual(originalNodes, [base]);
    assert.deepEqual(before.hosts, hosts);
    assert.deepEqual(clone(rewrite(before)), clone(before));
  });
  for (const config of [{}, { hosts }, { proxies: [base] }, input({ hosts: {} }),
    input({ hosts: { "*.example.test": "relay.example.test" } }),
    input({ hosts: { "unrelated.example.test": "invalid value" } })]) {
    check("缺省/无匹配不改变内容", () => {
      const before = clone(config);
      assert.deepEqual(clone(rewrite(config)), before);
    });
  }
  check("串联、大小写、末尾点及新订阅映射", () => {
    assert.equal(server(input({ hosts: { ...hosts, "relay.example.test": "final.example.test" } })), "final.example.test");
    assert.equal(server(input({ hosts: { "ENTRY.EXAMPLE.TEST.": "RELAY.EXAMPLE.TEST." } })), "relay.example.test");
    assert.equal(server(input({ hosts: { "entry.example.test": "updated.example.test" } })), "updated.example.test");
  });
  for (const ip of ["192.0.2.1", "2001:db8::1", ["192.0.2.1", "2001:db8::1"]]) {
    check("IP 及 IP 链交给核心", () => {
      assert.equal(server(input({ hosts: { "entry.example.test": ip } })), base.server);
      assert.equal(server(input({ hosts: { ...hosts, "relay.example.test": ip } })), base.server);
    });
  }
  const obfs = { ...base, plugin: "obfs", "plugin-opts": { mode: "http", host: "cover.example.test" } };
  check("HTTP 混淆 host 及其他字段保留", () => {
    assert.deepEqual(clone(rewrite(input({ proxies: [obfs] })).proxies), [{ ...obfs, server: "relay.example.test" }]);
  });
  for (const proxy of [{ ...base, type: "trojan", sni: base.server }, { ...base, type: "vmess" },
    { ...base, tls: true }, { ...base, plugin: "shadow-tls" }, { ...base, server: "192.0.2.1" },
    { ...obfs, "plugin-opts": { mode: "tls", host: "cover.example.test" } },
    { ...obfs, "plugin-opts": { mode: "http" } }]) {
    check("不支持的协议/插件不转换", () => {
      assert.deepEqual(clone(rewrite(input({ proxies: [proxy] })).proxies), [proxy]);
    });
  }
  const longChain = Object.fromEntries(Array.from({ length: 34 }, (_, i) => [`hop${i}.example.test`, `hop${i + 1}.example.test`]));
  for (const badHosts of [
    { ...hosts, "relay.example.test": base.server }, { "entry.example.test": base.server },
    ...[[], ["relay.example.test"], "https://relay.example.test", "relay.example.test:443", "$(touch forbidden)",
      "-bad.example.test", "relay.example.test\n", "relay.example.test\r\n", "relay.example.test ",
      "192.0.2.1\n", "2001:db8::1\n", "relay.例子.test", "singlelabel", null, 1]
      .map(value => ({ "entry.example.test": value })),
    { ...hosts, "ENTRY.EXAMPLE.TEST.": "other.example.test" },
    { ...hosts, "relay.example.test": "hop0.example.test", ...longChain },
  ]) {
    check("坏映射抛错且无部分修改", () => {
      const config = input({ hosts: badHosts });
      const before = clone(config);
      assert.throws(() => rewrite(config), /node aliases:/);
      assert.deepEqual(config, before);
    });
  }
  check("后续节点错误不留下前面转换", () => {
    const config = input({ proxies: [base, { ...base, server: "broken.example.test" }],
      hosts: { ...hosts, "broken.example.test": "broken.example.test" } });
    const before = clone(config);
    assert.throws(() => rewrite(config), /cyclic mapping/);
    assert.deepEqual(config, before);
  });
  for (const config of [input({ hosts: null }), input({ hosts: [] }), input({ proxies: {} }),
    input({ proxies: [null] }), input({ proxies: Array(4097).fill(base) }),
    input({ hosts: Object.fromEntries(Array.from({ length: 4097 }, (_, i) => [`h${i}.test`, "relay.example.test"])) })]) {
    check("输入类型和容量边界", () => assert.throws(() => rewrite(config), /node aliases:/));
  }
  check("继承键不参与匹配", () => {
    assert.equal(server(input({ hosts: Object.create(hosts) })), base.server);
  });

  // 测真实生成入口：基线仅移除别名调用，完整比较其余 DNS/分流/节点/设备数据。
  for (const region of ["国内", "国外"]) {
    const code = read(`防DNS泄露-${region}版.js`);
    const oldCall = "applySharedConfig(applyNodeServerAliases(config))";
    assert.equal(code.split(oldCall).length, 2, "生成入口必须恰好调用别名转换一次");
    const main = runner(code);
    const withoutAlias = runner(code.replace(oldCall, "applySharedConfig(config)"));
    const subscription = input({ proxies: [base, obfs, { ...base, type: "trojan", sni: base.server }],
      "proxy-providers": { untouched: { type: "http", url: "https://example.test/synthetic" } },
      tun: { enable: false, mtu: 1400, "include-package": ["org.example.app"] }, mode: "rule", ipv6: false });
    check(`${region} JS 全配置差异仅 server，订阅原节点保留`, () => {
      const config = clone(subscription);
      const originalNodes = config.proxies;
      const originalHosts = config.hosts;
      const expected = clone(withoutAlias(clone(subscription)));
      expected.proxies[0].server = expected.proxies[1].server = "relay.example.test";
      assert.equal(main(config), config);
      assert.deepEqual(clone(config), expected);
      assert.deepEqual(originalNodes, subscription.proxies);
      assert.deepEqual(originalHosts, hosts);
      assert.deepEqual(clone(main(config)), expected, "重复运行必须幂等");
      assert.notDeepEqual(clone(withoutAlias(clone(subscription))), expected, "负向控制须检出漏转换");
    });
    check(`${region} JS 新订阅映射，失败不污染整体输入`, () => {
      const updated = clone(subscription);
      updated.hosts[base.server] = "new-relay.example.test";
      assert.equal(main(updated).proxies[0].server, "new-relay.example.test");
      const broken = clone(subscription);
      broken.hosts[base.server] = base.server;
      const before = clone(broken);
      assert.throws(() => main(broken), /cyclic mapping/);
      assert.deepEqual(broken, before);
    });
  }
  console.log(`JS node alias synthetic checks: ${checks} PASS (no phone/runtime validation)`);
}

module.exports = { run };
