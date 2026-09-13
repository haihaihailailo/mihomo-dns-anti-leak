// 唯一测试入口间接调用。独立约束最终产物，不能只比较生产生成器的输出。
const assert = require("node:assert/strict");
const { tuneMihomo } = require("./tune_mihomo.cjs");
const clone = value => structuredClone(value);
const REGIONS = ["美国", "日本", "新加坡"];
const NAMES = REGIONS.map(region => region + "-AI-自动");
const SERVERS = ["https://1.1.1.1/dns-query#AI", "https://8.8.8.8/dns-query#AI"];

function checkTuning(actual, before) {
  const groups = Object.fromEntries(actual["proxy-groups"].map(group => [group.name, group]));
  const old = Object.fromEntries(before["proxy-groups"].map(group => [group.name, group]));
  assert.equal(actual["proxy-groups"].length, before["proxy-groups"].length + 3);
  assert(!groups["香港-AI-自动"], "不得生成香港 AI 组");
  assert.equal(Object.keys(groups).length, actual["proxy-groups"].length, "AI 组不得重复");
  assert.deepEqual(actual["proxy-groups"].filter(group => !group.hidden).map(group => group.name),
    before["proxy-groups"].filter(group => !group.hidden).map(group => group.name), "不增加可见分组");
  for (const source of before["proxy-groups"]) {
    const expected = clone(source);
    if (source.type === "url-test") Object.assign(expected, { lazy: true, tolerance: 100 });
    if (source.name === "AI") expected.proxies = [
      ...NAMES, "美国节点", "日本节点", "新加坡节点", "节点选择", "DIRECT",
    ];
    assert.deepEqual(groups[source.name], expected, "既有组超出调优范围：" + source.name);
  }
  for (const region of REGIONS) {
    const group = groups[region + "-AI-自动"];
    assert.deepEqual(group, { ...old[region + "-自动"], name: region + "-AI-自动",
      url: "https://auth.openai.com/favicon.ico", "expected-status": 200, timeout: 10000,
      lazy: true, hidden: true, tolerance: 100 }, "AI 必须独立测速同地区叶节点：" + region);
    assert.equal(group["include-all"], true);
    assert.equal(group["empty-fallback"], "REJECT");
    assert(!group.proxies, "不能嵌套普通地区自动组");
    const regex = new RegExp(group.filter.replace(/^\(\?i\)/, ""), "i");
    const exclude = new RegExp(group["exclude-filter"].replace(/^\(\?i\)/, ""), "i");
    const matches = name => regex.test(name) && !exclude.test(name);
    for (const sample of REGIONS) assert.equal(matches(sample + " 01"), sample === region);
    for (const sample of ["香港 HK01", "台湾01", "越南01", "中国01", "美国01 回国", "香港港广专线3_回国",
      "[SSR]港沪专线3_回国", "IEPL回国", "CN2 专线", "Traffic: 100 GB"]) {
      assert(!matches(sample), "AI 组误收其他地区/回国/提示节点：" + region + " " + sample);
    }
  }
  assert.equal(groups.AI.proxies[0], "美国-AI-自动");
  assert.deepEqual(actual["proxy-groups"].slice(-3).map(group => group.name), NAMES);

  const policy = actual.dns["nameserver-policy"];
  const oldPolicy = before.dns["nameserver-policy"];
  const expectedPolicy = clone(oldPolicy);
  for (const provider of ["openai", "anthropic", "google-gemini", "github-copilot"]) {
    expectedPolicy["rule-set:" + provider] = [...SERVERS];
  }
  const explicitKeys = [];
  for (const rule of before.rules) {
    const [type, domain, target] = rule.split(",");
    if (target !== "AI") continue;
    const keys = type === "DOMAIN" ? [domain] : type === "DOMAIN-SUFFIX" ? [domain, "." + domain] : [];
    for (const key of keys) {
      explicitKeys.push(key);
      expectedPolicy[key] = [...SERVERS];
    }
  }
  assert(explicitKeys.includes("chatgpt.com") && explicitKeys.includes(".openai.com"));
  assert.deepEqual(policy, expectedPolicy, "AI DNS 缺失或影响其他域名");
  const keys = Object.keys(policy);
  assert.equal(keys[0], "rule-set:private");
  for (const key of explicitKeys) assert(keys.indexOf(key) < keys.indexOf("rule-set:openai"), "AI 显式域名须优先");
  assert.deepEqual(keys.filter(key => !explicitKeys.includes(key)),
    Object.keys(oldPolicy).filter(key => !explicitKeys.includes(key)), "其他 DNS 相对优先级不得变化");
  assert(actual.dns["proxy-server-nameserver"].every(server => server.endsWith("#DIRECT")), "节点解析不可依赖 AI 组");

  const restored = clone(actual);
  restored["proxy-groups"] = clone(before["proxy-groups"]);
  restored.dns["nameserver-policy"] = clone(oldPolicy);
  assert.deepEqual(restored, before, "不得改变 rules、providers、TUN、IPv6、DNS 兜底等其他配置");
}

function checkMihomoTuning(actual, before) {
  checkTuning(actual, before);
  assert.deepEqual(tuneMihomo(clone(actual)), actual, "调优重复执行必须幂等");
  const mutations = [
    value => { value.dns["nameserver-policy"]["rule-set:openai"] = ["https://1.1.1.1/dns-query#节点选择"]; },
    value => { value["proxy-groups"].find(g => g.name === "美国-AI-自动").proxies = ["美国-自动", "日本-自动"]; },
    value => { value["proxy-groups"].find(g => g.name === "美国-AI-自动")["empty-fallback"] = "DIRECT"; },
    value => { value["proxy-groups"].find(g => g.name === "美国-AI-自动").url = "https://www.google.com/generate_204"; },
    value => { value["proxy-groups"].find(g => g.name === "美国-AI-自动").hidden = false; },
    value => { value["proxy-groups"].find(g => g.name === "自动选择").lazy = false; },
    value => { value["proxy-groups"].find(g => g.name === "AI").proxies.push("香港节点"); },
  ];
  for (const mutate of mutations) {
    const broken = clone(actual); mutate(broken);
    assert.throws(() => checkTuning(broken, before), "负向控制应捕获调优退化");
  }
  console.log("Mihomo 调优：3 个隐藏地区 AI 组、排除香港候选、叶节点隔离、DNS、测速范围、幂等与 7 个负向控制 OK");
}

module.exports = { checkMihomoTuning };
