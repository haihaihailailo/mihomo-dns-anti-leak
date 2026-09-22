// 被现有唯一离线验证入口 validate_health_checks.py 调用；只读、合成数据、无联网。
const assert = require("node:assert/strict");
const { ROOT, read, parse, evaluate, normalize, renderProfiles } = require("./build_profiles.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { checkConsolidation } = require("./validate_consolidation.cjs");
const { checkMihomoTuning } = require("./validate_mihomo_tuning.cjs");
// 已退役的根目录入口不可重新出现；共同源码只供生成器使用。
for (const file of ["防DNS泄露.yaml", "防DNS泄露.js", "Windows-国内网络覆写.yaml", "Windows-国内网络覆写.js"]) {
  assert(!fs.existsSync(path.join(ROOT, file)), `旧入口应已移除：${file}`);
}
const clone = value => JSON.parse(JSON.stringify(value));
const builtins = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);
const deviceTun = {
  // 这些都是客户端可直接开关/选择的单值设备项；公共模板不得凭空下发，也不得覆盖显式输入。
  // 尤其 stack 现在包含 mips 等客户端选项，必须由设备侧按平台/实测选择，而不是仓库固定 mixed。
  enable: true, device: "synthetic-tun", stack: "mips", "auto-route": false,
  "auto-detect-interface": false, "strict-route": false,
  mtu: 1400, gso: false, "gso-max-size": 0,
  "auto-redirect": false, "inet4-address": ["198.18.0.1/30"], "inet6-address": [],
};
// 客户端自有的应用/用户筛选；仅用合成值，不代表任何设备的实际名单。
const tunSelectors = {
  "include-package": ["org.example.second", "org.example.first"],
  "exclude-package": ["org.example.excluded.second", "org.example.excluded.first"],
  "include-android-user": [10, 0],
  "include-uid": [10102, 10101],
  "exclude-uid": [10202, 10201],
  "include-uid-range": ["10100:10199", "10000:10099"],
  "exclude-uid-range": ["10300:10399", "10200:10299"],
};
function assertTunSelectors(result, expected) {
  for (const key of Object.keys(tunSelectors)) {
    assert.equal(Object.hasOwn(result.tun, key), Object.hasOwn(expected, key), `TUN 筛选字段存在性变化：${key}`);
    if (Object.hasOwn(expected, key)) assert.deepEqual(clone(result.tun[key]), expected[key], `TUN 筛选值/顺序变化：${key}`);
  }
}
function checkTunSelectors(js, source, label) {
  // evaluate 会克隆输入/输出，无法检出引用泄漏；同一 VM 内直接调用真实入口。
  const sandbox = vm.createContext({});
  vm.runInContext(js, sandbox, { timeout: 5000 });
  const run = input => {
    sandbox.input = input;
    return vm.runInContext("main(input)", sandbox, { timeout: 5000 });
  };
  const baseline = clone(run({}));
  assert.deepEqual(normalize(baseline), normalize(source));
  function check(input) {
    const previous = input.tun || {};
    const expected = clone(previous);
    const result = run(input);
    assert.equal(result, input, "main(config) 应保留原地覆写接口");
    assertTunSelectors(result, expected);
    for (const key of Object.keys(expected)) assert.notEqual(result.tun[key], previous[key], `筛选数组未深拷贝：${key}`);
    const stripped = clone(result);
    for (const key of Object.keys(tunSelectors)) delete stripped.tun[key];
    assert.deepEqual(stripped, baseline, "保留筛选字段不得改变其余配置");
    const snapshot = clone(result);
    assert.deepEqual(clone(run(result)), snapshot, "携带筛选字段重复覆写不幂等");
    for (const key of Object.keys(expected)) result.tun[key].reverse().push(expected[key][0] ?? 0);
    assert.deepEqual(clone(previous), expected, "修改输出污染了调用前的名单引用");
    assert.deepEqual(clone(run({})), baseline, "输出污染了共享常量或后续无名单调用");
    assertTunSelectors(run({ tun: clone(expected) }), expected);
  }
  check({});
  check({ tun: {} });
  check({ tun: Object.create(tunSelectors) }); // 继承属性不是客户端显式设置。
  for (const [key, value] of Object.entries(tunSelectors)) {
    check({ tun: { [key]: clone(value) } });
    check({ tun: { [key]: [] } });
    const missing = clone(tunSelectors);
    delete missing[key];
    check({ tun: missing });
  }
  check({ tun: clone(tunSelectors) });
  // 合成两层：前置名单交给 JS 保留；末层普通数组替换，空数组清空，省略则保留。
  const pre = run({ tun: { ...clone(deviceTun), ...clone(tunSelectors) } });
  for (const [key, value] of Object.entries(tunSelectors)) {
    for (const replacement of [[value[1]], []]) {
      const merged = mergeClient(pre, { tun: { [key]: replacement } });
      assertTunSelectors(merged, { ...tunSelectors, [key]: replacement });
      const restored = clone(merged);
      restored.tun[key] = clone(pre.tun[key]);
      assert.deepEqual(restored, clone(pre), "软件末层替换不得波及其他字段");
    }
    const lost = clone(pre);
    delete lost.tun[key];
    assert.throws(() => assertTunSelectors(lost, tunSelectors), { code: "ERR_ASSERTION" }, `负向控制未检出丢失：${key}`);
  }
  assert.deepEqual(mergeClient(pre, { tun: {} }), clone(pre), "软件末层省略名单应保留前置名单");
  for (const [key, value] of Object.entries(deviceTun)) assert.deepEqual(clone(pre.tun[key]), value);
  console.log(`${label}: 7 个 TUN 筛选字段独立/空值/缺省/深拷贝/幂等/前后层合并、7 个丢失负向控制 OK`);
}
// Sparkle 的末层合并：对象递归、普通数组替换。仅用于合成输入，不操作客户端。
function mergeClient(base, controlled) {
  const result = clone(base);
  for (const [key, value] of Object.entries(controlled)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeClient(result[key] || {}, value) : clone(value);
  }
  return result;
}
function checkDeviceBoundary(js, source) {
  const input = { tun: clone(deviceTun), dns: { ipv6: false }, mode: "rule", ipv6: true,
    "mixed-port": 17890, "unified-delay": false };
  const result = evaluate(js, input);
  for (const [key, value] of Object.entries(deviceTun)) assert.deepEqual(result.tun[key], value, `设备字段丢失：tun.${key}`);
  for (const key of Object.keys(deviceTun)) assert(!Object.hasOwn(evaluate(js).tun, key), `设备字段不应凭空下发：${key}`);
  // unified-delay（统一延迟）和 TUN 单值项一样交客户端；仓库不能强制 true，也不能在缺省时自行补值。
  assert.equal(result["unified-delay"], false, "客户端关闭统一延迟后不得被仓库重新开启");
  assert.equal(evaluate(js, { "unified-delay": true })["unified-delay"], true, "客户端开启统一延迟后应保留");
  assert(!Object.hasOwn(evaluate(js), "unified-delay"), "客户端未设置统一延迟时仓库不得凭空下发");

  // 自定义 JS 运行在 ClashMi 最终客户端补丁之前；输入里的 IPv6 可能来自机场订阅旧值。
  // 所以这里故意要求公共 DNS 仍为 ipv6=true，不能把“订阅阶段字段”误当成当前 UI 状态。
  assert.deepEqual(result.dns, source.dns, "订阅阶段 IPv6 旧值不得覆盖公共 DNS 能力");

  // 模拟 ClashMi 的最后一层：只由客户端顶层 ipv6 决定最终有效 IPv6。
  // Mihomo 的有效 DNS IPv6 需要顶层 ipv6 与 dns.ipv6 同时为 true；公共层固定能力后，
  // 无论订阅旧值是什么，UI 最终 false/true 都能得到 false/true，避免反向锁死。
  const effectiveIpv6 = config => config.ipv6 === true && config.dns?.ipv6 === true;
  const uiOff = mergeClient(evaluate(js, { ipv6: true, dns: { ipv6: false } }), { ipv6: false });
  const uiOn = mergeClient(evaluate(js, { ipv6: false, dns: { ipv6: false } }), { ipv6: true });
  assert.equal(effectiveIpv6(uiOff), false, "客户端最终关闭 IPv6 后有效 DNS IPv6 必须关闭");
  assert.equal(effectiveIpv6(uiOn), true, "客户端最终开启 IPv6 后不能被订阅旧 dns.ipv6=false 锁死");

  assert.deepEqual(evaluate(js, result), result, "携带设备字段时重复覆写不幂等");
  const controlled = { tun: { ...deviceTun, stack: "gvisor", "strict-route": true,
    "route-exclude-address": ["192.0.2.0/24"], "dns-hijack": ["any:53", "tcp://any:53"] } };
  const merged = mergeClient(result, controlled);
  for (const [key, value] of Object.entries(controlled.tun)) assert.deepEqual(merged.tun[key], value, `软件末层字段未保留：${key}`);
  assert.deepEqual(merged.dns, result.dns);
  assert.deepEqual(merged.rules, result.rules);
  assert.deepEqual(merged["proxy-groups"], result["proxy-groups"]);
  // 客户端末层应能把仓库未下发的单值开关/模式改成任意合法值；这里用不同值验证覆盖链路。
  assert.equal(merged.tun.stack, "gvisor");
  assert.equal(merged.tun["strict-route"], true);
  const delayMerged = mergeClient(result, { "unified-delay": true });
  assert.equal(delayMerged["unified-delay"], true, "客户端末层应能切换统一延迟");
  // 回归之前的真实问题：后置数组不会自动追加仓库的 TCP 劫持项。
  const incomplete = mergeClient(result, { tun: { "dns-hijack": ["any:53"] } });
  assert(!incomplete.tun["dns-hijack"].includes("tcp://any:53"));
}
function checkSharedFakeIp(js, source, label) {
  const expected = { ipv6: true, "fake-ip-range6": "fdfe:dcba:9876::1/64" };
  const check = config => {
    assert.equal(config.dns["enhanced-mode"], "fake-ip");
    assert.equal(config.dns["fake-ip-range"], "198.18.0.1/16");
    for (const [key, value] of Object.entries(expected)) assert.equal(config.dns[key], value, `公共 DNS 字段错误：${key}`);
  };
  check(source);
  for (const enabled of [undefined, false, true]) {
    for (const dns of [undefined, {}, { ipv6: false }, { "fake-ip-range6": "" },
      { ipv6: false, "fake-ip-range6": "fd00:1234::1/64" }]) {
      const input = {};
      if (enabled !== undefined) Object.assign(input, { ipv6: enabled, tun: { enable: enabled } });
      if (dns !== undefined) input.dns = clone(dns);
      const result = evaluate(js, input);
      // 这里验证的是“订阅 → JS”阶段，不是客户端最终 UI 合并；因此旧 dns.ipv6 必须被公共能力值覆盖。
      check(result);
      assert.deepEqual(result.dns, source.dns, "输入不能改变其余 DNS 策略");
      assert.deepEqual(result.dns, mergeClient(input, source).dns, "YAML/JS 对订阅阶段 DNS 的覆写语义不同");
      assert.equal(Object.hasOwn(result, "ipv6"), Object.hasOwn(input, "ipv6"));
      assert.equal(result.ipv6, enabled, "不得强开客户端顶层 IPv6");
      assert.equal(result.tun.enable, enabled, "不得强开客户端 TUN");
      assert.deepEqual(evaluate(js, result), result, "DNS 双栈覆写必须幂等");
    }
  }
  // 负向控制：公共模板若关闭 DNS IPv6、丢失地址池或沿用旧池，必须被检测到。
  for (const patch of [{ ipv6: false }, { "fake-ip-range6": undefined }, { "fake-ip-range6": "fd00:1234::1/64" }]) {
    const broken = clone(source);
    Object.assign(broken.dns, patch);
    assert.throws(() => check(broken), { code: "ERR_ASSERTION" });
  }
  console.log(`${label}: 公共 DNS 双栈能力、订阅旧值覆盖、客户端最终 IPv6 门控、固定地址池、幂等与负向控制 OK`);
}
const driverRules = [
  "DOMAIN-SUFFIX,download.nvidia.com,DIRECT", "DOMAIN-SUFFIX,download.nvidia.cn,DIRECT",
  "DOMAIN,ota.nvidia.com,DIRECT", "DOMAIN,gfwsl.geforce.cn,DIRECT",
];

function checkDriverRouting(config, foreign = false) {
  const rules = config.rules;
  const firstProcess = rules.findIndex(rule => rule.startsWith("PROCESS-"));
  const ads = rules.indexOf("RULE-SET,reject,广告过滤");
  for (const rule of driverRules) {
    assert.equal(rules.filter(item => item === rule).length, 1, `驱动规则缺失或重复：${rule}`);
    assert(rules.indexOf(rule) > ads && rules.indexOf(rule) < firstProcess, "驱动下载须在广告之后、进程代理之前");
    const [type, domain] = rule.split(",");
    for (const key of type === "DOMAIN-SUFFIX" ? [domain, `.${domain}`] : [domain]) {
      assert.deepEqual(config.dns["nameserver-policy"][key], foreign
        ? ["https://1.1.1.1/dns-query#DIRECT", "https://8.8.8.8/dns-query#DIRECT"]
        : ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"], `驱动 DNS 环境/直连策略错误：${key}`);
    }
  }
  assert(!rules.includes("DOMAIN-SUFFIX,nvidia.com,DIRECT"), "进程直连不能扩大为所有程序访问 NVIDIA 均直连");
  assert(rules.includes("PROCESS-NAME,NVIDIA App.exe,DIRECT"), "NVIDIA App 须按用户要求整进程直连");
}

function checkReferences(config, { sparkle = true } = {}) {
  const groups = new Map(config["proxy-groups"].map(group => [group.name, group]));
  const providers = config["rule-providers"];
  assert.equal(groups.size, config["proxy-groups"].length, "重复策略组");
  assert.equal(new Set(config.rules).size, config.rules.length, "重复规则");
  function visit(name, stack = []) {
    if (builtins.has(name)) return;
    assert(groups.has(name), `无效策略引用：${name}`);
    assert(!stack.includes(name), `策略循环：${[...stack, name]}`);
    for (const target of groups.get(name).proxies || []) visit(target, [...stack, name]);
  }
  for (const name of groups.keys()) visit(name);
  for (const rule of config.rules) {
    const [type, value, policy] = rule.split(",");
    if (type === "RULE-SET") assert(providers[value], `未知规则集：${value}`);
    visit(["AND", "OR", "NOT"].includes(type) ? rule.slice(rule.lastIndexOf(",") + 1)
      : type === "MATCH" ? value : policy);
  }
  for (const [key, servers] of Object.entries(config.dns["nameserver-policy"])) {
    if (key.startsWith("rule-set:")) assert(providers[key.slice(9)], `DNS 未知规则集：${key}`);
    if (sparkle && Array.isArray(servers)) assert(!key.startsWith("+"), "禁止 Sparkle 数组前导加号合并键");
    for (const server of Array.isArray(servers) ? servers : [servers]) if (server.includes("#")) visit(server.split("#")[1]);
  }
}

function firstExit(groups, name) {
  if (builtins.has(name)) return name;
  const group = groups[name];
  return group["include-all"] ? group["empty-fallback"] : firstExit(groups, group.proxies[0]);
}

for (const { environment, stem, yaml, js, base, consolidatedConfig, detailedConfig } of renderProfiles()) {
  assert.equal(read(`${stem}.yaml`), yaml, `${stem}.yaml 生成结果过期`);
  assert.equal(read(`${stem}.js`), js, `${stem}.js 生成结果过期`);
  const compact = parse(read(`${stem}.yaml`));
  assert.deepEqual(normalize(compact), normalize(evaluate(read(`${stem}.js`))), `${stem} 全配置不同步`);
  checkConsolidation(consolidatedConfig, detailedConfig, environment, "mihomo");
  checkMihomoTuning(compact, consolidatedConfig);
  checkReferences(compact);
  checkDeviceBoundary(js, compact);
  checkSharedFakeIp(js, compact, stem);
  checkTunSelectors(js, compact, stem);
  // 原有环境语义测试继续覆盖详细中间配置；公开精简结果另作独立全对象比较。
  const config = detailedConfig;
  checkReferences(config);
  checkDriverRouting(config, environment === "国外");

  // 环境差异的精确允许范围：不改共同规则、订阅、测速端点、TUN 或其他全局键。
  const restored = clone(config);
  restored.dns = clone(base.dns);
  const groups = Object.fromEntries(config["proxy-groups"].map(group => [group.name, group]));
  for (let i = 0; i < restored["proxy-groups"].length; i++) {
    const group = restored["proxy-groups"][i];
    const original = base["proxy-groups"][i];
    assert.equal(group.name, original.name);
    if (environment === "国外" && ["节点选择", "GitHub"].includes(group.name)) {
      assert.equal(group.proxies[0], "DIRECT");
      assert.deepEqual([...group.proxies].sort(), [...original.proxies].sort());
      group.proxies = clone(original.proxies);
    }
    if (environment === "国外" && group.name === "自动选择") {
      assert.equal(group.lazy, true);
      group.lazy = original.lazy;
    }
  }
  assert.deepEqual(restored, base, `${stem} 存在未授权的共同配置变化`);
  assert.equal(config.dns["direct-nameserver-follow-policy"], true);
  for (const key of ["default-nameserver", "proxy-server-nameserver", "direct-nameserver"]) {
    assert(config.dns[key].length);
    for (const server of config.dns[key]) assert(server.startsWith("https://"));
  }
  assert(config.dns["proxy-server-nameserver"].every(server => server.endsWith("#DIRECT")), "节点解析必须不依赖节点本身");
  for (const group of Object.values(groups)) if (group["include-all"]) assert.equal(group["empty-fallback"], "REJECT");
  for (const group of ["国内服务", "越南服务"]) assert.equal(groups[group].proxies[0], "DIRECT");
  assert.equal(firstExit(groups, "中国节点"), "REJECT", "无回国节点不得隐式直连");
  assert.equal(groups.AI.proxies[0], "美国-自动");
  for (const name of ["[SSR]港广专线3_回国", "[SSR]港沪专线3_回国", "IEPL回国", "广州回国01", "上海回国"]) {
    for (const group of ["中国节点", "中国-自动"]) assert(new RegExp(groups[group].filter.replace(/^\(\?i\)/, ""), "i").test(name));
    for (const group of ["自动选择", "香港节点", "香港-自动"]) assert(!new RegExp(groups[group].filter.replace(/^\(\?i\)/, ""), "i").test(name));
  }
  for (const name of ["[TRO]新加坡V4", "[TRO]日本大阪15", "[SSR]台湾2"]) {
    for (const group of ["中国节点", "中国-自动"]) assert(!new RegExp(groups[group].filter.replace(/^\(\?i\)/, ""), "i").test(name));
  }

  if (environment === "国内") {
    const expected = {
      ...base.dns,
      "default-nameserver": ["https://223.5.5.5/dns-query"],
      "proxy-server-nameserver": ["https://223.5.5.5/dns-query#DIRECT", "https://doh.pub/dns-query#DIRECT"],
      "direct-nameserver": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      "direct-nameserver-follow-policy": true,
    };
    // 业务 DNS 出口另由 validate_service_ownership.cjs 的独立样本验证；其余 DNS 必须不变。
    assert.deepEqual({ ...config.dns, "nameserver-policy": base.dns["nameserver-policy"] }, expected,
      "国内入口须独立提供完整国内 DNS 基线");
    assert(config.dns.fallback.every(server => server.endsWith("#节点选择")));
    assert.equal(config.dns["fallback-filter"].geoip, true);
  } else {
    assert.deepEqual(config.dns["default-nameserver"], ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"]);
    assert.deepEqual(config.dns.fallback, []);
    assert.equal(config.dns["fallback-filter"].geoip, false);
    for (const name of ["节点选择", "漏网之鱼", "GitHub", "YouTube", "谷歌服务", "Netflix", "Meta / X", "游戏平台", "TikTok", "Spotify", "微软服务"]) {
      assert.equal(firstExit(groups, name), "DIRECT", `${name} 国外新配置未默认直连`);
    }
    for (const key of ["rule-set:cn", "rule-set:wechat", "rule-set:alipay", "aliapp.org", ".aliapp.org", "yhglobal.com", ".yhglobal.com"]) {
      assert(config.dns["nameserver-policy"][key].every(server => server.endsWith("#国内服务")), `回国 DNS 未跟随国内服务：${key}`);
    }
    for (const rule of config.rules) {
      const [type, domain, policy] = rule.split(",");
      if (policy !== "AI" || !["DOMAIN", "DOMAIN-SUFFIX"].includes(type)) continue;
      for (const key of type === "DOMAIN" ? [domain] : [domain, `.${domain}`]) {
        assert(config.dns["nameserver-policy"][key].every(server => server.endsWith("#AI")), `AI DNS 未跟随 AI：${key}`);
      }
    }
  }
  // 模拟不同客户端状态与已有节点。JS 应保留它们，不能输出本机专属状态。
  for (const enabled of [undefined, false, true]) {
    const input = {
      mode: "rule", "find-process-mode": "off", "mixed-port": 17890,
      proxies: [{ name: "合成测试节点", type: "socks5", server: "127.0.0.1", port: 9 }],
      "proxy-providers": { fixture: { type: "inline", payload: [] } },
    };
    if (enabled !== undefined) Object.assign(input, {
      ipv6: enabled, tun: { enable: enabled, "inet6-address": ["fdfe:dcba:9876::1/126"] },
      dns: { ipv6: enabled, "fake-ip-range6": "fd00:1234::1/64" },
    });
    const expected = clone(input);
    const result = evaluate(js, input);
    for (const key of ["mode", "ipv6", "find-process-mode", "mixed-port", "proxies", "proxy-providers"]) {
      assert.deepEqual(result[key], expected[key], `客户端字段变化：${key}`);
    }
    for (const [section, keys] of Object.entries({ tun: ["enable", "inet6-address"] })) {
      for (const key of keys) {
        assert.deepEqual(result[section][key], expected[section]?.[key]);
        if (enabled === undefined) assert(!Object.hasOwn(result[section], key));
      }
    }
    // JS 此时只处理订阅阶段数据；客户端最终 IPv6 开关在后续补丁层生效，因此整段 DNS 应保持公共基线。
    assert.deepEqual(normalize(result.dns), normalize(compact.dns), "DNS 应使用公共值而非订阅输入旧值");
    assert.deepEqual(normalize(evaluate(js, result)), normalize(result), "重复覆写不幂等");
  }
  console.log(`${stem}: 全配置同步、差异范围、DNS/分流、回国隔离、空组保护、客户端保留 OK`);
}

// 保留内部共同源码的引用、驱动规则与客户端字段回归。
const main = parse(read(".github/config/shared.yaml"));
checkReferences(main);
checkDriverRouting(main);
checkDeviceBoundary(read(".github/config/shared.js"), main);
checkSharedFakeIp(read(".github/config/shared.js"), main, "shared.js");
checkTunSelectors(read(".github/config/shared.js"), main, "shared.js");
for (const file of [".github/config/shared.js", "防DNS泄露-国内版.js", "防DNS泄露-国外版.js"]) {
  new (require("node:vm").Script)(read(file), { filename: file });
}
console.log("内部共同源码引用、驱动精确直连、三个 JS 语法、旧入口移除 OK");
require("./validate_rule_sources.cjs").run();
require("./validate_priority.cjs").run();
require("./validate_ssh_direct.cjs").run();
require("./validate_service_ownership.cjs").run();
require("./validate_router_profiles.cjs").run();
require("./validate_node_server_aliases.cjs").run();
require("./validate_substore_aliases.cjs").run();
