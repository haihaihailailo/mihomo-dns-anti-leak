// 独立合成用例：验证首条匹配，不把离线模型当作客户端实测。
const assert = require("node:assert/strict");
const { read, parse, evaluate } = require("./build_profiles.cjs");
const { parseShadow } = require("./build_native_profiles.cjs");
const AI = ["openai", "anthropic", "google-gemini", "github-copilot"];
const GITHUB_DOMAINS = ["github.com", "githubusercontent.com", "githubassets.com", "github.io"];
const GITHUB_HOSTS = ["github.com", "api.github.com", "raw.githubusercontent.com",
  "avatars.githubusercontent.com", "github.githubassets.com", "pages.github.io"];
const EDITORS = ["Code.exe", "code.exe", "Postman.exe", "JetBrains Toolbox.exe", "idea64.exe", "pycharm64.exe", "webstorm64.exe"];
const GPU_PROCESSES = ["NVIDIA App.exe", "NVIDIA GeForce Experience.exe", "NvContainer.exe",
  "NVDisplay.Container.exe", "nvngx_update.exe", "AMDSoftware.exe", "AMDRSServ.exe", "AMDInstallManager.exe"];
const FIXTURES = {
  private: ["router.test"], reject: ["ads.example.test", "ads.tampermonkey.net", "ads.getui.com"],
  openai: ["chatgpt.com", "openai.com"], anthropic: ["claude.ai"],
  "google-gemini": ["gemini.google.com"], "github-copilot": ["githubcopilot.com"],
  google: ["google.com"], github: [...GITHUB_DOMAINS, "githubcopilot.com"],
  microsoft: ["teams.microsoft.com", ...GITHUB_DOMAINS, "githubcopilot.com"],
  "geolocation-!cn": ["chatgpt.com", "openai.com", "claude.ai", "githubcopilot.com", "google.com", "tampermonkey.net", ...GITHUB_DOMAINS],
};
const suffix = (host, domain) => host === domain || host.endsWith("." + domain);
const ADS_URL = "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Surge-RULE-SET-Only.Ads.list";
const member = (name, host) => (FIXTURES[name === ADS_URL ? "reject" : name] || []).some(domain => suffix(host, domain));
function firstRoute(config, host, processName) {
  for (const rule of config.rules) {
    const [type, value, target] = rule.split(",");
    if (type === "MATCH" || type === "FINAL") return value;
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
      if (/^\.?(vn|com\.vn|net\.vn|org\.vn|edu\.vn|gov\.vn)$/.test(key)) {
        for (const service of ["openai", "google", "youtube", "microsoft", "github"]) {
          assert(keys.indexOf(key) > keys.indexOf(prefix + service), "地域兜底须晚于专属服务：" + key);
        }
        assert(keys.indexOf(key) < keys.indexOf(prefix + "cn"), "越南地域兜底仍须早于通用国内集合");
      } else if (!key.startsWith(prefix)) assert(keys.indexOf(key) < keys.indexOf(prefix + "openai"), "明确域名例外须早于服务集合：" + key);
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
function checkTampermonkey(config, foreign = false, prefix = "rule-set:") {
  const rule = "DOMAIN-SUFFIX,tampermonkey.net,DIRECT";
  assert.equal(config.rules.filter(item => item === rule).length, 1, "缺少或重复 Tampermonkey 直连");
  const index = config.rules.indexOf(rule);
  const siteIndex = config.rules.indexOf("DOMAIN-SUFFIX,jspoo.com,DIRECT");
  assert.equal(index, siteIndex + 1, "Tampermonkey 应在既有网站例外后、业务规则前");
  if (config.dns) {
    const keys = prefix === "rule-set:" ? ["tampermonkey.net", ".tampermonkey.net"] : ["+.tampermonkey.net"];
    for (const key of keys) assert(Object.hasOwn(config.dns["nameserver-policy"], key), "缺少明确的 Tampermonkey DNS 键：" + key);
  }
  for (const host of ["tampermonkey.net", "www.tampermonkey.net", "accounts.tampermonkey.net"]) {
    assert.equal(firstRoute(config, host, "Code.exe"), "DIRECT", host + " 被进程或通用集合抢先匹配");
    if (config.dns) {
      const expected = foreign
        ? ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"].map(url => prefix === "rule-set:" ? url + "#DIRECT" : url)
        : prefix === "rule-set:" ? ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"] : "https://223.5.5.5/dns-query";
      assert.deepEqual(firstDns(config, host, prefix), expected, host + " DNS 仍跟随通用代理集合");
    }
  }
  const without = structuredClone(config);
  without.rules = without.rules.filter(item => item !== rule);
  for (const host of ["nottampermonkey.net", "tampermonkey.net.evil.test", "accounts.google.com", "login.microsoftonline.com"]) {
    assert(!suffix(host, "tampermonkey.net"));
    assert.equal(firstRoute(config, host, "Code.exe"), firstRoute(without, host, "Code.exe"), "不可改变第三方登录或相似域名分流");
  }
  if (prefix === "rule-set:" && config.dns) {
    assert.equal(firstRoute(config, "ads.tampermonkey.net", "Code.exe"), "广告过滤", "既有广告优先级不得被绕过");
  }
}
function tampermonkeyRegression(config, foreign = false, prefix = "rule-set:") {
  checkTampermonkey(config, foreign, prefix);
  const bad = structuredClone(config);
  bad.rules = bad.rules.filter(item => item !== "DOMAIN-SUFFIX,tampermonkey.net,DIRECT");
  assert.throws(() => checkTampermonkey(bad, foreign, prefix), /Tampermonkey/);
  if (config.dns) {
    const badDns = structuredClone(config);
    for (const key of ["tampermonkey.net", ".tampermonkey.net", "+.tampermonkey.net"]) delete badDns.dns["nameserver-policy"][key];
    assert.throws(() => checkTampermonkey(badDns, foreign, prefix), /DNS/);
  }
}
const DOMESTIC_EXACT = ["aweme.snssdk.com", "is.snssdk.com"];
const PUSH_SUFFIXES = ["getui.com", "getui.net", "gepush.com", "igexin.com"];
function checkDomesticDomains(config, foreign, shared, prefix = "rule-set:") {
  const target = foreign || shared ? "国内服务" : "DIRECT";
  const expectedRules = [...DOMESTIC_EXACT.map(host => "DOMAIN," + host + "," + target),
    ...PUSH_SUFFIXES.map(host => "DOMAIN-SUFFIX," + host + "," + target)];
  const anchor = config.rules.indexOf("DOMAIN-SUFFIX,tampermonkey.net,DIRECT");
  assert(anchor >= 0);
  assert.deepEqual(config.rules.slice(anchor + 1, anchor + 7), expectedRules, "国内域名必须位于广告/网站例外之后、业务规则之前");
  for (const rule of expectedRules) assert.equal(config.rules.filter(item => item === rule).length, 1, "国内域名规则必须唯一");
  const hosts = [...DOMESTIC_EXACT, ...PUSH_SUFFIXES.flatMap(host => [host, "sdk." + host])];
  for (const host of hosts) {
    assert.equal(firstRoute(config, host, "Code.exe"), target, "国内域名被通用规则截走：" + host);
    if (config.dns) {
      const expected = prefix === "geosite:" ? "https://223.5.5.5/dns-query"
        : ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"].map(url => foreign ? url + "#国内服务" : url);
      assert.deepEqual(firstDns(config, host, prefix), expected, "国内域名 DNS 出口错误：" + host);
    }
  }
  assert.equal(firstRoute(config, "ads.getui.com", "Code.exe"), "广告过滤", "推送例外不可绕过广告规则");
  const without = structuredClone(config);
  without.rules = without.rules.filter(rule => !expectedRules.includes(rule));
  if (without.dns) {
    for (const key of [...DOMESTIC_EXACT, ...PUSH_SUFFIXES.flatMap(host => [host, "." + host, "+." + host])]) {
      delete without.dns["nameserver-policy"][key];
    }
  }
  const negatives = [...DOMESTIC_EXACT.flatMap(host => ["sub." + host, host + ".evil.test", "not" + host]),
    ...PUSH_SUFFIXES.flatMap(host => [host + ".evil.test", "not" + host]),
    "snssdk.com", "i.snssdk.com", "ecomuser.snssdk.com", "tiktok.com"];
  for (const host of negatives) {
    assert.equal(firstRoute(config, host, "Code.exe"), firstRoute(without, host, "Code.exe"), "国内例外扩大到其他域名：" + host);
    if (config.dns) assert.deepEqual(firstDns(config, host, prefix), firstDns(without, host, prefix), "国内 DNS 例外扩大范围：" + host);
  }
}
function domesticDomainRegression(config, foreign = false, shared = false, prefix = "rule-set:") {
  checkDomesticDomains(config, foreign, shared, prefix);
  const bad = structuredClone(config);
  bad.rules = bad.rules.filter(rule => !rule.startsWith("DOMAIN,aweme.snssdk.com,"));
  assert.throws(() => checkDomesticDomains(bad, foreign, shared, prefix), /国内域名/);
  if (config.dns) {
    const badDns = structuredClone(config);
    delete badDns.dns["nameserver-policy"]["aweme.snssdk.com"];
    assert.throws(() => checkDomesticDomains(badDns, foreign, shared, prefix), /DNS/);
  }
}
function checkGpuProcesses(config) {
  const ads = config.rules.indexOf("RULE-SET,reject,广告过滤");
  const ai = config.rules.indexOf("PROCESS-NAME,com.openai.chatgpt,AI");
  assert(ads >= 0 && ai > ads);
  for (const process of GPU_PROCESSES) {
    const rules = config.rules.filter(rule => rule.startsWith("PROCESS-NAME," + process + ","));
    assert.deepEqual(rules, ["PROCESS-NAME," + process + ",DIRECT"], "GPU 进程必须唯一且直连：" + process);
    const index = config.rules.indexOf(rules[0]);
    assert(index > ads && index < ai, "GPU 进程必须先于业务规则");
    for (const host of ["download.gfe.nvidia.com", "gfwsl.geforce.com", "drivers.amd.com", "accounts.google.com", "api.openai.com"]) {
      assert.equal(firstRoute(config, host, process), "DIRECT", process + " 的请求被域名规则截走");
    }
    assert.equal(firstRoute(config, "ads.example.test", process), "广告过滤");
    assert.equal(firstRoute(config, "router.test", process), "DIRECT");
  }
  assert(!config.rules.includes("PROCESS-NAME,setup.exe,DIRECT"), "通用安装程序不得整体绕过分流");
  const without = structuredClone(config);
  without.rules = without.rules.filter(rule => !GPU_PROCESSES.some(process => rule.startsWith("PROCESS-NAME," + process + ",")));
  for (const process of ["chrome.exe", "setup.exe", "Intel Driver & Support Assistant.exe"]) {
    assert.equal(firstRoute(config, "api.openai.com", process), firstRoute(without, "api.openai.com", process), "不可影响其他软件的原有策略");
  }
}
function run() {
  for (const stem of [".github/config/shared", "防DNS泄露-国内版", "防DNS泄露-国外版"]) {
    const config = parse(read(stem + ".yaml"));
    assert.deepEqual(Object.keys(config.dns["nameserver-policy"]),
      Object.keys(evaluate(read(stem + ".js")).dns["nameserver-policy"]), stem + " YAML/JS DNS 顺序不同步");
    checkOrder(config);
    checkGithub(config);
    tampermonkeyRegression(config, stem.includes("国外"));
    domesticDomainRegression(config, stem.includes("国外"), stem.startsWith(".github/"));
    domesticDomainRegression(evaluate(read(stem + ".js")), stem.includes("国外"), stem.startsWith(".github/"));
    checkGpuProcesses(config);
    const badGpu = structuredClone(config);
    badGpu.rules = badGpu.rules.map(rule => rule === "PROCESS-NAME,NVIDIA App.exe,DIRECT" ? "PROCESS-NAME,NVIDIA App.exe,节点选择" : rule);
    assert.throws(() => checkGpuProcesses(badGpu), /GPU 进程/);
    if (stem.startsWith(".github/")) continue;
    const domestic = stem.includes("国内");
    checkRoutes(config, domestic);
    for (const host of ["chatgpt.com", "claude.ai", "api.githubcopilot.com", "gemini.google.com"]) {
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
    tampermonkeyRegression(config, stem.includes("国外"), "geosite:");
    domesticDomainRegression(config, stem.includes("国外"), stem.startsWith(".github/"), "geosite:");
    assert.deepEqual(config.dns["nameserver-policy"]["+.jspoo.com"],
      stem.includes("国外") ? ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"] : "https://223.5.5.5/dns-query");
  }
  for (const file of [".github/config/shared.conf", "shadowrocket-国内版.conf", "shadowrocket-国外版.conf"]) {
    checkDirectSite(parseShadow(read(file)));
    tampermonkeyRegression(parseShadow(read(file)));
    domesticDomainRegression(parseShadow(read(file)), file.includes("国外"), file.startsWith(".github/"));
  }
  for (const region of ["国内", "国外"]) {
    domesticDomainRegression(parse(read("防DNS泄露-路由器-" + region + "版.yaml")), region === "国外");
  }
  console.log("国内精确域名/推送后缀的跨入口路由、DNS、广告优先级、相似域名及负向控制 OK");
  console.log("DNS 有序同步、AI/GitHub/微软集合重叠、GPU 整进程直连、整应用优先级、Tampermonkey 直连/DNS及负向控制 OK");
}
if (require.main === module) run();
module.exports = { run };
