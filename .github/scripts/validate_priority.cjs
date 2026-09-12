// 独立合成用例：验证首条匹配，不把离线模型当作客户端实测。
const assert = require("node:assert/strict");
const { read, parse, evaluate } = require("./build_profiles.cjs");
const { parseShadow } = require("./build_native_profiles.cjs");
const AI = ["openai", "anthropic", "google-gemini", "github-copilot"];
const GITHUB_DOMAINS = ["github.com", "githubusercontent.com", "githubassets.com", "github.io"];
const GITHUB_HOSTS = ["github.com", "api.github.com", "raw.githubusercontent.com",
  "avatars.githubusercontent.com", "github.githubassets.com", "pages.github.io"];
const EDITORS = ["Code.exe", "code.exe", "Postman.exe", "JetBrains Toolbox.exe", "idea64.exe", "pycharm64.exe", "webstorm64.exe"];
const FIXTURES = {
  private: ["router.test"], reject: ["ads.example.test"],
  openai: ["chatgpt.com", "openai.com"], anthropic: ["claude.ai"],
  "google-gemini": ["gemini.google.com"], "github-copilot": ["githubcopilot.com"],
  google: ["google.com"], github: [...GITHUB_DOMAINS, "githubcopilot.com"],
  microsoft: ["teams.microsoft.com", ...GITHUB_DOMAINS, "githubcopilot.com"],
  "geolocation-!cn": ["chatgpt.com", "openai.com", "claude.ai", "githubcopilot.com", "google.com", ...GITHUB_DOMAINS],
};
const suffix = (host, domain) => host === domain || host.endsWith("." + domain);
const member = (name, host) => (FIXTURES[name] || []).some(domain => suffix(host, domain));
function firstRoute(config, host, processName) {
  for (const rule of config.rules) {
    const [type, value, target] = rule.split(",");
    if (type === "MATCH") return value;
    if ((type === "DOMAIN" && host === value) ||
        (type === "DOMAIN-SUFFIX" && suffix(host, value)) ||
        (type === "DOMAIN-KEYWORD" && host.includes(value)) ||
        (type === "RULE-SET" && member(value, host)) ||
        (type === "PROCESS-NAME" && processName === value)) return target;
  }
  throw Error("合成流量没有兜底规则");
}
function firstDns(config, host, prefix = "rule-set:") {
  for (const [key, value] of Object.entries(config.dns["nameserver-policy"])) {
    if (key.startsWith(prefix) ? member(key.slice(prefix.length), host)
      : key.startsWith("+.") ? suffix(host, key.slice(2))
      : key.startsWith(".") ? host.endsWith(key) : host === key) return value;
  }
}
function checkOrder(config, prefix = "rule-set:") {
  const keys = Object.keys(config.dns["nameserver-policy"]);
  assert.equal(keys[0], prefix + "private", "私有域名 DNS 须优先");
  const github = keys.indexOf(prefix + "github");
  assert(github >= 0, "缺少 GitHub DNS");
  for (const general of ["microsoft", "cn", "geolocation-!cn"]) {
    const at = keys.indexOf(prefix + general);
    if (at >= 0) assert(github < at, "GitHub DNS 被 " + general + " 遮挡");
  }
  for (const ai of AI) {
    assert(keys.includes(prefix + ai), "缺少 AI DNS：" + ai);
    for (const general of ["cn", "geolocation-!cn", "microsoft", "google", "github"]) {
      const at = keys.indexOf(prefix + general);
      if (at >= 0) assert(keys.indexOf(prefix + ai) < at, ai + " DNS 被 " + general + " 遮挡");
    }
  }
  if (prefix === "rule-set:") {
    for (const [key, value] of Object.entries(config.dns["nameserver-policy"])) {
      if (!key.startsWith(prefix)) assert(keys.indexOf(key) < keys.indexOf(prefix + "openai"), "明确域名例外须早于服务集合：" + key);
      if (key.startsWith(prefix) && AI.includes(key.slice(prefix.length)) && value.some(x => x.endsWith("#AI"))) {
        assert(value.every(x => x.endsWith("#AI")), "同一 AI 策略不得混合 DNS 出口");
      }
    }
  }
}
function checkGithub(config, prefix = "rule-set:") {
  const policies = config.dns["nameserver-policy"];
  for (const host of GITHUB_HOSTS) {
    assert.deepEqual(firstDns(config, host, prefix), policies[prefix + "github"], host + " 未命中 GitHub DNS");
  }
  assert.deepEqual(firstDns(config, "teams.microsoft.com", prefix), policies[prefix + "microsoft"]);
  assert.deepEqual(firstDns(config, "api.githubcopilot.com", prefix), policies[prefix + "github-copilot"]);
  for (const host of ["notgithub.com", "github.com.evil.test"]) assert(!member("github", host));
  const bad = structuredClone(config);
  bad.dns["nameserver-policy"] = Object.fromEntries(Object.keys(policies).map(key =>
    key === prefix + "github" ? [prefix + "microsoft", policies[prefix + "microsoft"]]
      : key === prefix + "microsoft" ? [prefix + "github", policies[prefix + "github"]] : [key, policies[key]]));
  assert.throws(() => checkOrder(bad, prefix), /GitHub DNS 被 microsoft 遮挡/);
  if (prefix === "rule-set:") {
    assert(policies[prefix + "github"].every(value => value.endsWith("#节点选择")), "GitHub DNS 须跟随节点选择");
    assert.notDeepEqual(firstDns(bad, "raw.githubusercontent.com"), policies[prefix + "github"]);
  }
}
function checkRoutes(config, domestic) {
  checkDirectSite(config);
  assert.equal(firstRoute(config, "jspoo.com.evil.test", "Code.exe"), "节点选择");
  assert.equal(firstRoute(config, "notjspoo.com", "Code.exe"), "节点选择");
  const expectedDns = domestic ? ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"]
    : ["https://1.1.1.1/dns-query#DIRECT", "https://8.8.8.8/dns-query#DIRECT"];
  for (const host of ["jspoo.com", "www.jspoo.com", "static.jspoo.com"]) {
    assert.deepEqual(firstDns(config, host), expectedDns, "指定直连网站 DNS 语义错误");
  }
  for (const editor of EDITORS) {
    assert.equal(firstRoute(config, "api.githubcopilot.com", editor), "AI", editor + " 抢先截走 Copilot");
    assert.equal(firstRoute(config, "api.openai.com", editor), "AI");
    assert.equal(firstRoute(config, "github.com", editor), "节点选择");
  }
  for (const host of GITHUB_HOSTS) assert.equal(firstRoute(config, host), "节点选择");
  for (const app of ["WeChat.exe", "com.tencent.mm", "com.eg.android.AlipayGphone"]) {
    assert.equal(firstRoute(config, "api.openai.com", app), domestic ? "DIRECT" : "国内服务", "保留整应用选路");
  }
  for (const app of ["Teams.exe", "ms-teams.exe"]) {
    assert.equal(firstRoute(config, "teams.microsoft.com", app), "微软/苹果服务");
  }
  assert.equal(firstRoute(config, "download.nvidia.com", "NVIDIA App.exe"), "DIRECT");
  assert.equal(firstRoute(config, "ads.example.test", "Code.exe"), "广告过滤");
  assert.equal(firstRoute(config, "router.test", "Code.exe"), "DIRECT");
}
function checkDirectSite(config) {
  const rule = "DOMAIN-SUFFIX,jspoo.com,DIRECT";
  assert.equal(config.rules.filter(item => item === rule).length, 1);
  const ads = config.rules.findIndex(item => item.startsWith("RULE-SET,") && item.endsWith(",广告过滤"));
  assert(ads >= 0 && config.rules.indexOf(rule) === ads + 1, "指定网站位于广告之后、通用业务之前");
  for (const host of ["jspoo.com", "www.jspoo.com", "static.jspoo.com"]) {
    assert.equal(firstRoute(config, host, "Code.exe"), "DIRECT");
  }
}
function run() {
  for (const stem of [".github/config/shared", "防DNS泄露-国内版", "防DNS泄露-国外版"]) {
    const config = parse(read(stem + ".yaml"));
    assert.deepEqual(Object.keys(config.dns["nameserver-policy"]),
      Object.keys(evaluate(read(stem + ".js")).dns["nameserver-policy"]), stem + " YAML/JS DNS 顺序不同步");
    checkOrder(config);
    checkGithub(config);
    if (stem.startsWith(".github/")) continue;
    const domestic = stem.includes("国内");
    checkRoutes(config, domestic);
    if (!domestic) for (const host of ["chatgpt.com", "claude.ai", "api.githubcopilot.com", "gemini.google.com"]) {
      assert(firstDns(config, host)?.every(server => server.endsWith("#AI")), host + " 未选择 AI DNS");
    }
    // 负向控制：恢复旧遮挡必须被当前测试捕获。
    const badDns = structuredClone(config);
    const policies = badDns.dns["nameserver-policy"];
    badDns.dns["nameserver-policy"] = {
      "rule-set:private": policies["rule-set:private"],
      "rule-set:geolocation-!cn": policies["rule-set:geolocation-!cn"],
      ...policies,
    };
    assert.throws(() => checkOrder(badDns));
    const badRoute = structuredClone(config);
    badRoute.rules.unshift("PROCESS-NAME,Code.exe,节点选择");
    assert.throws(() => checkRoutes(badRoute, domestic));
  }
  for (const stem of [".github/config/shared", "stash-国内版", "stash-国外版"]) {
    const config = parse(read(stem + ".stoverride"));
    checkOrder(config, "geosite:");
    checkGithub(config, "geosite:");
    checkDirectSite(config);
    assert.deepEqual(config.dns["nameserver-policy"]["+.jspoo.com"],
      stem.includes("国外") ? ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"] : "https://223.5.5.5/dns-query");
  }
  for (const file of [".github/config/shared.conf", "shadowrocket-国内版.conf", "shadowrocket-国外版.conf"]) {
    checkDirectSite(parseShadow(read(file)));
  }
  console.log("DNS 有序同步、AI/GitHub/微软集合重叠、进程首匹配、整应用优先级及负向控制 OK");
}
if (require.main === module) run();
module.exports = { run };
