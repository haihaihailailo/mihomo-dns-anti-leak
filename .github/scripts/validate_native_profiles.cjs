// 由唯一离线入口 validate_health_checks.py -> validate_profiles.cjs 调用；不连接客户端或订阅。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, read, parse } = require("./build_profiles.cjs");
const { renderNativeProfiles, parseShadow } = require("./build_native_profiles.cjs");
const { checkConsolidation } = require("./validate_consolidation.cjs");
const clone = value => JSON.parse(JSON.stringify(value));
const CN = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
const GLOBAL = ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"];
const changedDefaults = ["节点选择", "GitHub", "电报消息"];
const builtin = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PROXY", "PASS"]);
const stashBaseText = read(".github/config/shared.stoverride");
const stashBase = parse(stashBaseText);
const shadowBase = parseShadow(read(".github/config/shared.conf"));
for (const old of ["stash.stoverride", "shadowrocket.conf"]) assert(!fs.existsSync(path.join(ROOT, old)));

function checkTree(groups, rules, finalType) {
  function visit(name, stack = []) {
    if (builtin.has(name)) return;
    assert(Object.hasOwn(groups, name), "未定义策略：" + name);
    assert(!stack.includes(name), "策略引用循环：" + [...stack, name]);
    for (const target of groups[name].proxies || []) visit(target, [...stack, name]);
  }
  for (const name of Object.keys(groups)) visit(name);
  assert.equal(new Set(rules).size, rules.length, "重复规则");
  for (const rule of rules) {
    const parts = rule.split(",");
    visit(parts[0] === finalType ? parts[1] : parts[2]);
  }
}
function shadowGroup(body) {
  const parts = body.split(",").map(item => item.trim());
  const type = parts.shift();
  const proxies = parts.filter(item => !item.includes("="));
  const options = {};
  for (const part of parts.filter(item => item.includes("="))) {
    const index = part.indexOf("=");
    const key = part.slice(0, index).trim();
    assert(!Object.hasOwn(options, key), "重复策略选项：" + key);
    options[key] = part.slice(index + 1).trim();
  }
  return { type, proxies, options };
}
function firstExit(groups, name) {
  if (builtin.has(name)) return name;
  return groups[name].proxies?.length ? firstExit(groups, groups[name].proxies[0]) : name;
}
function checkDefaults(groups, foreign) {
  for (const name of ["国内服务", "越南服务"]) assert.equal(firstExit(groups, name), "DIRECT");
  assert.equal(groups.AI.proxies[0], "美国-自动", "保留 AI 的美国自动首选");
  assert.equal(groups["节点选择"].proxies[0], foreign ? "DIRECT" : "自动选择");
  assert.equal(groups.GitHub.proxies[0], foreign ? "DIRECT" : "香港-自动");
  assert.equal(groups["电报消息"].proxies[0], foreign ? "DIRECT" : "新加坡-自动");
  if (foreign) for (const name of ["漏网之鱼", "YouTube", "谷歌服务", "Netflix", "Spotify", "Meta / X", "游戏平台", "TikTok"]) {
    assert.equal(firstExit(groups, name), "DIRECT", "国外默认未直连：" + name);
  }
}
function checkReturnFilters(filters) {
  const matches = (group, name) => new RegExp(filters[group].replace(/^\(\?i\)/, ""), "i").test(name);
  for (const name of ["[SSR]港广专线3_回国", "[SSR]港沪专线3_回国", "IEPL回国", "广州回国01", "上海回国"]) {
    for (const group of ["中国节点", "中国-自动"]) assert(matches(group, name), "回国节点未进入：" + group);
    for (const group of Object.keys(filters).filter(key => key !== "全部节点" && !key.startsWith("中国"))) {
      assert(!matches(group, name), "回国节点误入：" + group);
    }
  }
  for (const name of ["[TRO]新加坡V4", "[TRO]日本大阪15", "[SSR]台湾2", "香港 HK01", "中国移动 CN2 香港"]) {
    for (const group of ["中国节点", "中国-自动"]) assert(!matches(group, name), "普通节点误入中国组");
  }
}

const rendered = renderNativeProfiles();
assert.deepEqual(renderNativeProfiles(), rendered, "生成器不确定");
assert.equal(new Set(rendered.map(item => item.file)).size, 4);
for (const { client, environment, file, content, detailedContent } of rendered) {
  assert.equal(read(file), content, file + " 生成结果过期");
  const foreign = environment === "国外";
  if (client === "stash") {
    const compact = parse(content);
    const config = parse(detailedContent);
    checkConsolidation(compact, config, environment, client);
    checkTree(Object.fromEntries(compact["proxy-groups"].map(group => [group.name, group])), compact.rules, "MATCH");
    const groups = Object.fromEntries(config["proxy-groups"].map(group => [group.name, group]));
    assert.equal(Object.keys(groups).length, config["proxy-groups"].length, "重复分组");
    assert.deepEqual(config.rules, stashBase.rules, "不改变规则内容或顺序");
    assert.deepEqual(config["rule-providers"], stashBase["rule-providers"]);
    const restored = clone(config);
    restored.name = stashBase.name;
    restored.summary = stashBase.summary;
    restored.dns = clone(stashBase.dns);
    for (let i = 0; i < config["proxy-groups"].length; i++) {
      const group = restored["proxy-groups"][i];
      const original = stashBase["proxy-groups"][i];
      assert.equal(group.name, original.name);
      if (foreign && changedDefaults.includes(group.name)) {
        assert.deepEqual([...group.proxies].sort(), [...original.proxies].sort());
        group.proxies = clone(original.proxies);
      }
      if (foreign && group.name === "自动选择") {
        assert.equal(group.lazy, true);
        group.lazy = original.lazy;
      }
    }
    assert.deepEqual(restored, stashBase, "Stash 变化超出 DNS、默认出口和元数据范围");
    assert.deepEqual(config.dns["default-nameserver"], foreign ? GLOBAL : [CN[0]]);
    assert.deepEqual(config.dns["proxy-server-nameserver"], foreign ? GLOBAL : CN);
    assert.deepEqual(config.dns.nameserver, foreign ? GLOBAL : CN);
    assert.equal(config.dns["follow-rule"], true);
    const policies = config.dns["nameserver-policy"];
    const expectedPolicies = Object.fromEntries(Object.entries(stashBase.dns["nameserver-policy"]).map(([key, value]) =>
      [key, !foreign || ["geosite:cn", "+.alipaylog.com", "+.aliapp.org"].includes(key) ? value : GLOBAL]));
    assert.deepEqual(policies, expectedPolicies);
    if (foreign) for (const key of ["geosite:microsoft", "geosite:google", "geosite:youtube", "geosite:openai", "geosite:github"]) {
      assert(Object.keys(policies).indexOf(key) < Object.keys(policies).indexOf("geosite:cn"), "专属 DNS 必须优先于 cn");
    }
    const markerLines = text => text.split("\n").filter(line => /^\s*[\w-]+: #!replace$/.test(line)).sort();
    assert.deepEqual(markerLines(content), markerLines(stashBaseText), "Stash 替换标记丢失");
    assert(!content.includes("#DIRECT") && !content.includes("#AI") && !content.includes("empty-fallback:"), "不得混入 Mihomo 专用字段");
    checkTree(groups, config.rules, "MATCH");
    for (const rule of config.rules.filter(rule => rule.startsWith("RULE-SET,"))) assert(config["rule-providers"][rule.split(",")[1]]);
    checkDefaults(groups, foreign);
    checkReturnFilters(Object.fromEntries(config["proxy-groups"].filter(group => group.filter).map(group => [group.name, group.filter])));
  } else {
    const compact = parseShadow(content);
    const config = parseShadow(detailedContent);
    const model = parsed => ({
      general: parsed.general, proxies: parsed.sections.Proxy, rules: parsed.rules,
      "proxy-groups": Object.entries(parsed.groups).map(([name, body]) => {
        const { type, proxies, options } = shadowGroup(body);
        return { name, type, proxies, ...options };
      }),
    });
    assert.deepEqual(Object.keys(compact.sections), Object.keys(config.sections));
    checkConsolidation(model(compact), model(config), environment, client);
    checkTree(Object.fromEntries(Object.entries(compact.groups).map(([name, body]) => [name, shadowGroup(body)])), compact.rules, "FINAL");
    assert.deepEqual(Object.keys(config.sections), Object.keys(shadowBase.sections));
    assert.deepEqual(config.rules, shadowBase.rules, "不得改变 Shadowrocket 规则");
    assert.deepEqual(config.sections.Proxy, shadowBase.sections.Proxy, "不得写入私人节点");
    const restored = { ...config.general };
    for (const key of ["dns-server", "fallback-dns-server", "proxy-dns-server"]) restored[key] = shadowBase.general[key];
    assert.deepEqual(restored, shadowBase.general, "不得改变 IPv6、TUN 绕过等非 DNS 设置");
    const dnsList = key => config.general[key].split(",").map(item => item.trim());
    assert.deepEqual(dnsList("dns-server"), foreign ? GLOBAL : CN);
    assert.deepEqual(dnsList("proxy-dns-server"), foreign ? GLOBAL : [CN[0]]);
    assert.deepEqual(dnsList("fallback-dns-server"), foreign ? GLOBAL : ["https://1.1.1.1/dns-query#proxy", "https://dns.google/dns-query#proxy"]);
    assert.equal(config.general["dns-fallback-system"], "false");
    const groups = Object.fromEntries(Object.entries(config.groups).map(([name, body]) => [name, shadowGroup(body)]));
    assert.deepEqual(Object.keys(groups), Object.keys(shadowBase.groups), "不得删减分组");
    for (const [name, group] of Object.entries(groups)) {
      const original = shadowGroup(shadowBase.groups[name]);
      if (foreign && changedDefaults.includes(name)) {
        assert.deepEqual([...group.proxies].sort(), [...original.proxies].sort());
        assert.equal(group.options["policy-select-name"], "DIRECT");
        assert.deepEqual({ ...group.options, "policy-select-name": undefined }, { ...original.options, "policy-select-name": undefined });
      } else assert.deepEqual(group, original, "无关分组变化：" + name);
    }
    checkTree(groups, config.rules, "FINAL");
    checkDefaults(groups, foreign);
    checkReturnFilters(Object.fromEntries(Object.entries(groups).filter(([, group]) => group.options["policy-regex-filter"]).map(([name, group]) => [name, group.options["policy-regex-filter"]])));
  }
  console.log(file + ": 生成同步、DNS、默认出口、引用/循环、回国隔离、规则/测速保留 OK");
}
