// 被现有唯一离线验证入口 validate_health_checks.py 调用；只读、合成数据、无联网。
const assert = require("node:assert/strict");
const { ROOT, read, parse, evaluate, normalize, renderProfiles } = require("./build_profiles.cjs");
const fs = require("node:fs");
const path = require("node:path");
const { checkConsolidation } = require("./validate_consolidation.cjs");
// 已退役的根目录入口不可重新出现；共同源码只供生成器使用。
for (const file of ["防DNS泄露.yaml", "防DNS泄露.js", "Windows-国内网络覆写.yaml", "Windows-国内网络覆写.js"]) {
  assert(!fs.existsSync(path.join(ROOT, file)), `旧入口应已移除：${file}`);
}
const clone = value => JSON.parse(JSON.stringify(value));
const builtins = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);
const deviceTun = {
  enable: true, device: "synthetic-tun", mtu: 1400, gso: false, "gso-max-size": 0,
  "auto-redirect": false, "inet4-address": ["198.18.0.1/30"], "inet6-address": [],
};
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
  const input = { tun: clone(deviceTun), dns: { ipv6: false }, mode: "rule", ipv6: true, "mixed-port": 17890 };
  const result = evaluate(js, input);
  for (const [key, value] of Object.entries(deviceTun)) assert.deepEqual(result.tun[key], value, `设备字段丢失：tun.${key}`);
  for (const key of Object.keys(deviceTun)) assert(!Object.hasOwn(evaluate(js).tun, key), `设备字段不应凭空下发：${key}`);
  assert.deepEqual(result.dns, { ...source.dns, ipv6: false }, "保留设备字段不得改变公共 DNS 策略");
  assert.deepEqual(evaluate(js, result), result, "携带设备字段时重复覆写不幂等");
  const controlled = { tun: { ...deviceTun, stack: "gvisor", "route-exclude-address": ["192.0.2.0/24"], "dns-hijack": ["any:53", "tcp://any:53"] } };
  const merged = mergeClient(result, controlled);
  for (const [key, value] of Object.entries(controlled.tun)) assert.deepEqual(merged.tun[key], value, `软件末层字段未保留：${key}`);
  assert.deepEqual(merged.dns, result.dns);
  assert.deepEqual(merged.rules, result.rules);
  assert.deepEqual(merged["proxy-groups"], result["proxy-groups"]);
  assert.equal(merged.tun["strict-route"], source.tun["strict-route"]);
  // 回归之前的真实问题：后置数组不会自动追加仓库的 TCP 劫持项。
  const incomplete = mergeClient(result, { tun: { "dns-hijack": ["any:53"] } });
  assert(!incomplete.tun["dns-hijack"].includes("tcp://any:53"));
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
  assert(!rules.includes("DOMAIN-SUFFIX,nvidia.com,DIRECT"), "不得把全部 NVIDIA 服务强制直连");
  assert(rules.includes("PROCESS-NAME,NVIDIA App.exe,节点选择"), "保留其他 NVIDIA App 连接的原策略");
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
    visit(type === "MATCH" ? value : policy);
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

for (const { environment, stem, yaml, js, base, detailedConfig } of renderProfiles()) {
  assert.equal(read(`${stem}.yaml`), yaml, `${stem}.yaml 生成结果过期`);
  assert.equal(read(`${stem}.js`), js, `${stem}.js 生成结果过期`);
  const compact = parse(read(`${stem}.yaml`));
  assert.deepEqual(normalize(compact), normalize(evaluate(read(`${stem}.js`))), `${stem} 全配置不同步`);
  checkConsolidation(compact, detailedConfig, environment, "mihomo");
  checkReferences(compact);
  checkDeviceBoundary(js, compact);
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
    if (environment === "国外" && ["节点选择", "GitHub", "电报消息"].includes(group.name)) {
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
    assert.deepEqual(config.dns, expected, "国内入口须独立提供完整国内 DNS 策略");
    assert(config.dns.fallback.every(server => server.endsWith("#节点选择")));
    assert.equal(config.dns["fallback-filter"].geoip, true);
  } else {
    assert.deepEqual(config.dns["default-nameserver"], ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"]);
    assert.deepEqual(config.dns.fallback, []);
    assert.equal(config.dns["fallback-filter"].geoip, false);
    for (const name of ["节点选择", "漏网之鱼", "GitHub", "YouTube", "谷歌服务", "电报消息", "Netflix", "Meta / X", "游戏平台", "TikTok", "Spotify", "微软服务"]) {
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
      dns: { ipv6: enabled, "fake-ip-range6": "fdfe:dcba:9876::1/64" },
    });
    const expected = clone(input);
    const result = evaluate(js, input);
    for (const key of ["mode", "ipv6", "find-process-mode", "mixed-port", "proxies", "proxy-providers"]) {
      assert.deepEqual(result[key], expected[key], `客户端字段变化：${key}`);
    }
    for (const [section, keys] of Object.entries({ tun: ["enable", "inet6-address"], dns: ["ipv6", "fake-ip-range6"] })) {
      for (const key of keys) {
        assert.deepEqual(result[section][key], expected[section]?.[key]);
        if (enabled === undefined) assert(!Object.hasOwn(result[section], key));
      }
    }
    assert.deepEqual(normalize(evaluate(js, result)), normalize(result), "重复覆写不幂等");
  }
  console.log(`${stem}: 全配置同步、差异范围、DNS/分流、回国隔离、空组保护、客户端保留 OK`);
}

// 原生客户端另做解析与域名规则回归，不能把 Mihomo 能加载当作它们的实机通过。
const main = parse(read(".github/config/shared.yaml"));
const stash = parse(read(".github/config/shared.stoverride"));
checkReferences(main);
checkDriverRouting(main);
checkDeviceBoundary(read(".github/config/shared.js"), main);
checkReferences(stash, { sparkle: false });
const shadowRules = read(".github/config/shared.conf").split("[Rule]")[1].split("\n")
  .map(line => line.trim()).filter(line => line && !line.startsWith("#"));
for (const rule of driverRules) {
  assert.equal(stash.rules.filter(item => item === rule).length, 1);
  const [type, domain] = rule.split(",");
  assert.equal(stash.dns["nameserver-policy"][type === "DOMAIN-SUFFIX" ? `+.${domain}` : domain], "https://223.5.5.5/dns-query");
  assert.equal(read(".github/config/shared.conf").split("\n").filter(line => line.trim() === rule).length, 1);
  for (const rules of [stash.rules, shadowRules]) {
    const ads = rules.findIndex(item => item.startsWith("RULE-SET,") && item.endsWith(",广告过滤"));
    assert(ads >= 0 && rules.indexOf(rule) > ads && rules.indexOf(rule) < rules.indexOf("GEOIP,VN,越南服务,no-resolve"), "原生客户端驱动规则不得被国家 IP 规则抢先匹配");
  }
}
for (const file of [".github/config/shared.js", "防DNS泄露-国内版.js", "防DNS泄露-国外版.js"]) {
  new (require("node:vm").Script)(read(file), { filename: file });
}
console.log("内部共同源码 / Stash 引用、驱动精确直连、三个 JS 语法、旧入口移除 OK");
require("./validate_native_profiles.cjs");
require("./validate_rule_sources.cjs");
