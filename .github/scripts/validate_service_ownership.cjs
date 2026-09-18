// 唯一离线入口调用；代表性规则集是合成重叠样本，不冒充实时上游或客户端实测。
const assert = require("node:assert/strict");
const { read, parse, evaluate } = require("./build_profiles.cjs");
const { parseShadow } = require("./build_native_profiles.cjs");
const { SHARED_AI_HOSTS } = require("./validate_rule_sources.cjs");
const { unwrapInThGuard } = require("./in_th_guard.cjs");
const BILI = "哔哩哔哩港澳台";
const SYSTEM = "微软/苹果服务";
const BILI_PACKAGES = ["tv.danmaku.bili", "com.bstar.intl", "com.bilibili.app.blue",
  "com.bilibili.app.in", "com.bilibili.comic", "com.bilibili.comic.intl", "tv.danmaku.bilibilihd"];
const STEAM_PROCESSES = ["com.valvesoftware.android.steam.community", "steam.exe", "steamwebhelper.exe"];
const GAME_PACKAGES = ["com.tencent.tmgp.cf", "com.oplus.games", "com.xiaomi.gamecenter.sdk.service",
  "com.xiaomi.migameservice", "com.xiaomi.minigame"];
const EXTRA_AI_HOSTS = ["www.perplexity.ai", "www.perplexity.com", "api.pplx.ai", "ppl-ai-file-upload.s3.amazonaws.com",
  "pplx-res.cloudinary.com", "www.cursor.com", "api.cursor.sh", "api.cursorapi.com", "cdn.cursor-cdn.com",
  "api.codeium.com", "api.codeiumdata.com", "windsurf.build", "www.windsurf.com"];
const BILI_HOSTS = ["www.bilibili.com", "api.bilibili.com", "passport.bilibili.com", "live.bilibili.com",
  "b23.tv", "i0.hdslb.com", "api.biliapi.net", "video.bilivideo.com", "img.biliimg.com",
  "www.biligame.com", "upos-hz-mirrorakam.akamaized.net", "www.bilibili.tv", "p.bstarstatic.com"];
const MEMBERS = {
  private: ["router.test"], reject: ["ads.example.test", "ads.bilibili.com"],
  bilibili: ["bilibili.com", "b23.tv", "hdslb.com", "biliapi.net", "bilivideo.com", "biliimg.com",
    "biligame.com", "upos-hz-mirrorakam.akamaized.net", "bilibili.tv"],
  biliintl: ["bstarstatic.com", "biliintl.com", "bilibili.tv"],
  "steam-cn": ["steamchina.com", "dl.steam.clngaa.com"],
  "category-games-cn": ["biligame.com", "wegame.com", "in.th"],
  steam: ["steampowered.com", "steamcommunity.com", "steamstatic.com", "steamchina.com"],
  "category-games-global": ["xbox.com", "xboxlive.com", "battle.net"],
  openai: ["openai.com", "chatgpt.com"], anthropic: ["claude.ai"],
  "google-gemini": ["gemini.google.com", "gemini.gstatic.com"], "github-copilot": ["githubcopilot.com"],
  google: ["google.com", "google.com.vn", "youtube.vn", "gstatic.com"], youtube: ["youtube.com", "youtube.vn"], github: ["github.com", "githubcopilot.com"],
  microsoft: ["microsoft.com", "windowsupdate.com", "office.com", "xbox.com", "xboxlive.com", "github.com", "githubcopilot.com"],
  apple: ["apple.com", "icloud.com"], telegram: ["telegram.org"],
  netflix: ["netflix.com"], spotify: ["spotify.com"], tiktok: ["tiktok.com"],
  wechat: ["weixin.qq.com"], alipay: ["alipay.com"],
};
MEMBERS.cn = [...MEMBERS.bilibili, ...MEMBERS["steam-cn"], ...MEMBERS["category-games-cn"],
  ...MEMBERS.microsoft, ...MEMBERS.apple, ...MEMBERS.wechat, ...MEMBERS.alipay];
MEMBERS["geolocation-!cn"] = Object.values(MEMBERS).flat();
const suffix = (host, domain) => host === domain || host.endsWith("." + domain);
function providerName(value) {
  if (!value.startsWith("https://")) return value;
  const name = value.split("/").at(-1).replace(/\.list$/, "");
  return ({ "steam@cn": "steam-cn", "category-games-!cn": "category-games-global", BiliBiliIntl: "biliintl",
    AWAvenue: "reject", China_Domain: "cn" })[name]
    || (value.includes("Only.Ads") ? "reject" : name.toLowerCase());
}
function firstRoute(config, host, process = "browser.exe") {
  for (const rule of config.rules) {
    const inner = unwrapInThGuard(rule);
    if (inner !== rule && suffix(host, "in.th")) continue;
    const [type, value, owner] = inner.split(",");
    if (["MATCH", "FINAL"].includes(type)) return value;
    if ((type === "PROCESS-NAME" && value === process)
      || (type === "DOMAIN" && value === host)
      || (type === "DOMAIN-SUFFIX" && suffix(host, value))
      || (type === "DOMAIN-KEYWORD" && host.includes(value))
      || (["RULE-SET", "DOMAIN-SET"].includes(type)
        && (MEMBERS[providerName(value)] || []).some(domain => suffix(host, domain)))) return owner;
  }
  throw Error("缺少路由兜底");
}
function firstDns(config, host) {
  for (const [key, servers] of Object.entries(config.dns["nameserver-policy"])) {
    const ruleSet = key.match(/^(rule-set|geosite):(.+)$/);
    const name = ruleSet && ({ "steam@cn": "steam-cn", "category-games-!cn": "category-games-global" }[ruleSet[2]] || ruleSet[2]);
    if (ruleSet ? (MEMBERS[name] || []).some(domain => suffix(host, domain))
      : key.startsWith("+.") ? suffix(host, key.slice(2))
      : key.startsWith(".") ? host.endsWith(key) : host === key) return servers;
  }
}
function checkRoutes(config, client, domestic) {
  const route = (host, process) => firstRoute(config, host, process);
  const samples = [[BILI_HOSTS, BILI],
    [["store.steampowered.com", "cdn.steamchina.com", "dl.steam.clngaa.com", "www.wegame.com", "www.xbox.com", "assets.xboxlive.com"], "游戏平台"],
    [["www.microsoft.com", "outlook.office.com", "download.windowsupdate.com", "www.apple.com", "p01.icloud.com"], SYSTEM],
    [["chatgpt.com", "api.openai.com", "auth0.openai.com", "claude.ai", "gemini.google.com", "gemini.gstatic.com", "cdn.gemini.gstatic.com", "api.githubcopilot.com", "copilot.microsoft.com", ...EXTRA_AI_HOSTS], "AI"],
    [["api.zalo.me", "api.zalopay.vn", "api.techcombank.com", "ordinary.example.vn"], "越南服务"],
    [["telegram.org"], "电报消息"],
    [["github.com", "www.google.com", "www.google.com.vn", "www.youtube.vn", "youtube.com", "netflix.com", "spotify.com", "tiktok.com"], "节点选择"]];
  for (const [hosts, owner] of samples) for (const host of hosts) {
    assert.equal(route(host), owner, host + " 未进入 " + owner);
    if (client === "mihomo") assert.equal(route(host, "Code.exe"), owner, "通用工具兜底遮挡 " + host);
  }
  for (const host of ["ads.bilibili.com", "ads.example.test"]) assert.equal(route(host), "广告过滤");
  for (const host of ["jspoo.com", "accounts.tampermonkey.net", "download.nvidia.com"]) assert.equal(route(host), "DIRECT");
  for (const host of ["notbilibili.com", "bilibili.com.evil.test", "shared.akamaized.net"]) {
    assert.notEqual(route(host), BILI, "不可扩大到相似域名或共享 CDN 根域名");
  }
  for (const host of [...SHARED_AI_HOSTS, "unrelated.s3.amazonaws.com", "unrelated.cloudinary.com", "copilot.microsoft.com.evil.test", "notcopilot.microsoft.com",
    "www.gstatic.com", "notgemini.gstatic.com", "gemini.gstatic.com.evil.test"]) {
    assert.notEqual(route(host), "AI", "AI 专属资源不可扩展到共享服务根域名");
  }
  if (client !== "mihomo") return;
  const packages = [...BILI_PACKAGES.map(name => [name, BILI]), ...[...STEAM_PROCESSES, ...GAME_PACKAGES].map(name => [name, "游戏平台"]),
    ...["com.microsoft.office.outlook", "com.microsoft.skydrive", "com.microsoft.teams", "com.apple.android.music", "Teams.exe"].map(name => [name, SYSTEM]),
    ["com.zing.zalo", "越南服务"], ["com.openai.chatgpt", "AI"], ["com.microsoft.copilot", "AI"]];
  for (const [name, owner] of packages) {
    assert.deepEqual(config.rules.filter(rule => rule.startsWith("PROCESS-NAME," + name + ",")), ["PROCESS-NAME," + name + "," + owner]);
    assert.equal(route("new-service.example.test", name), owner, "包名/进程未统一：" + name);
    assert.equal(route("ads.example.test", name), "广告过滤");
  }
  assert.equal(route("new-service.example.test", "NVIDIA App.exe"), "DIRECT");
  assert.equal(route("new-service.example.test", "com.tencent.mm"), domestic ? "DIRECT" : "国内服务");
  assert.equal(route("new-service.example.test", "com.eg.android.AlipayGphone"), domestic ? "DIRECT" : "国内服务");
}
function checkDns(config, domestic) {
  const samples = [[BILI_HOSTS, BILI],
    [["cdn.steamchina.com", "www.wegame.com", "assets.xboxlive.com", "store.steampowered.com"], "游戏平台"],
    [["www.microsoft.com", "outlook.office.com", "download.windowsupdate.com", "www.apple.com"], SYSTEM],
    [["api.zalo.me", "api.zalopay.vn", "api.techcombank.com", "ordinary.example.vn"], "越南服务"],
    [["telegram.org"], "电报消息"],
    [["github.com", "www.google.com.vn", "www.youtube.vn", "youtube.com", "netflix.com", "spotify.com", "tiktok.com"], "节点选择"],
    [["api.openai.com", "api.githubcopilot.com", "copilot.microsoft.com", "gemini.gstatic.com", "cdn.gemini.gstatic.com", ...EXTRA_AI_HOSTS], "AI"]];
  for (const [hosts, owner] of samples) for (const host of hosts) {
    const servers = firstDns(config, host);
    assert(Array.isArray(servers) && servers.length === 2 && servers.every(server => server.endsWith("#" + owner)), host + " DNS 未跟随 " + owner);
  }
  assert(config.dns["proxy-server-nameserver"].every(server => server.endsWith("#DIRECT")), "节点启动解析不可依赖业务组");
  assert(firstDns(config, "api.weixin.qq.com").every(server => domestic ? !server.includes("#") : server.endsWith("#国内服务")));
}
function negativeControls(config, domestic) {
  const mutate = fn => { const bad = structuredClone(config); fn(bad); assert.throws(() => checkRoutes(bad, "mihomo", domestic)); };
  mutate(c => { c.rules = c.rules.map(r => r === "RULE-SET,telegram,电报消息" ? "RULE-SET,telegram,节点选择" : r); });
  const badTelegramDns = structuredClone(config);
  badTelegramDns.dns["nameserver-policy"]["rule-set:telegram"] = ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"];
  assert.throws(() => checkDns(badTelegramDns, domestic));
  mutate(c => { c.rules = c.rules.map(r => r === "PROCESS-NAME,tv.danmaku.bili," + BILI ? "PROCESS-NAME,tv.danmaku.bili,DIRECT" : r); });
  mutate(c => { c.rules = c.rules.filter(r => r !== "RULE-SET,bilibili," + BILI); });
  mutate(c => { c.rules = c.rules.map(r => r === "RULE-SET,steam-cn,游戏平台" ? "RULE-SET,steam-cn,DIRECT" : r); });
  mutate(c => { c.rules.unshift("PROCESS-NAME,Code.exe,节点选择"); });
  mutate(c => { c.rules.unshift("RULE-SET,category-games-cn,游戏平台"); });
  mutate(c => { c.rules.unshift("RULE-SET,microsoft," + SYSTEM); });
  mutate(c => { c.rules = c.rules.filter(r => r !== "DOMAIN,copilot.microsoft.com,AI"); });
  mutate(c => { c.rules.unshift("DOMAIN-SUFFIX,auth0.com,AI"); });
  const badDns = structuredClone(config);
  badDns.dns["nameserver-policy"]["rule-set:bilibili"] = ["https://223.5.5.5/dns-query"];
  assert.throws(() => checkDns(badDns, domestic));
  const badRegionDns = structuredClone(config);
  badRegionDns.dns["nameserver-policy"] = { ".vn": config.dns["nameserver-policy"][".vn"], ...config.dns["nameserver-policy"] };
  assert.throws(() => checkDns(badRegionDns, domestic));
  const badApp = structuredClone(config);
  badApp.rules.unshift("DOMAIN,api.openai.com,AI");
  assert.throws(() => checkAppDnsBoundary(badApp));
  const badCrossDns = structuredClone(config);
  badCrossDns.dns["nameserver-policy"] = { "api.openai.com": ["https://1.1.1.1/dns-query#" + BILI],
    ...badCrossDns.dns["nameserver-policy"] };
  assert.throws(() => checkAppDnsBoundary(badCrossDns));
}
function checkAppDnsBoundary(config) {
  for (const [app, host, appOwner, dnsOwner] of [
    ["tv.danmaku.bili", "api.openai.com", BILI, "AI"],
    ["com.microsoft.teams", "www.bilibili.com", SYSTEM, BILI],
  ]) {
    assert.equal(firstRoute(config, host, app), appOwner, "整应用应优先：" + app + " -> " + host);
    const servers = firstDns(config, host);
    assert(servers.length === 2 && servers.every(server => server.endsWith("#" + dnsOwner)),
      "DNS 按域名分组，不应假定等于发起 App 分组：" + host);
  }
}
function checkInThBoundary(config, client, domestic) {
  const sources = client === "shadowrocket" ? [
    "DOMAIN-SET,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games-cn.list",
    "DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list",
  ] : ["RULE-SET,category-games-cn", "RULE-SET,cn"];
  const guards = sources.map((source, i) => "AND,((NOT,((DOMAIN-SUFFIX,in.th))),(" + source + ")),"
    + (i === 0 ? "游戏平台" : domestic ? "DIRECT" : "国内服务"));
  assert.deepEqual(config.rules.filter(rule => rule.includes("in.th")), guards, "仅隔离两个过宽集合，不能增加全后缀强制出口");
  const ordinary = ["in.th", "www.thnic.in.th", "thaionline.in.th", "ordinary.example.in.th"];
  for (const host of ordinary) assert.equal(firstRoute(config, host), "节点选择", "普通 in.th 应继续后续匹配：" + host);
  for (const host of ["notin.th", "in.th.example.test"]) assert.equal(firstRoute(config, host), "节点选择");
  for (const [i, rule] of guards.entries()) {
    const bad = structuredClone(config);
    bad.rules = bad.rules.map(item => item === rule ? unwrapInThGuard(item) : item);
    assert.equal(firstRoute(bad, ordinary[1]), i === 0 ? "游戏平台" : domestic ? "DIRECT" : "国内服务",
      "移除任一隔离条件必须能复现误分类");
  }
  const explicit = structuredClone(config);
  explicit.rules.unshift("DOMAIN-SUFFIX,fixture-game.in.th,游戏平台");
  assert.equal(firstRoute(explicit, "cdn.fixture-game.in.th"), "游戏平台", "已明确的游戏域名不应被公共后缀隔离抢先匹配");
  if (client === "mihomo") {
    for (const app of [...STEAM_PROCESSES, ...GAME_PACKAGES]) assert.equal(firstRoute(config, ordinary[1], app), "游戏平台");
    const expected = ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"];
    for (const host of ordinary) assert.deepEqual(firstDns(config, host), expected, "in.th DNS 不应误归国内游戏：" + host);
    for (const key of ["in.th", ".in.th"]) {
      const bad = structuredClone(config);
      delete bad.dns["nameserver-policy"][key];
      assert(firstDns(bad, key === "in.th" ? "in.th" : ordinary[1]).every(server => server.endsWith("#游戏平台")),
        "去掉 DNS 隔离须复现游戏组解析");
    }
    const keys = Object.keys(config.dns["nameserver-policy"]);
    assert(keys.indexOf(".steampowered.com") >= 0 && keys.indexOf(".steampowered.com") < keys.indexOf("in.th"), "具体游戏 DNS 须先于公共后缀隔离");
    assert(keys.indexOf(".in.th") < keys.indexOf("rule-set:category-games-cn"));
  } else if (client === "stash") {
    // Stash 文档优先级是 exact > wildcard > geosite，不能套用 Mihomo 的有序模型。
    assert.deepEqual(config.dns["nameserver-policy"]["+.in.th"], ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"]);
    assert.equal(config.dns["follow-rule"], true);
  }
}
function run() {
  for (const file of ["validate-config.yml", "validate-health-checks.yml"]) {
    const workflow = parse(read(".github/workflows/" + file));
    for (const event of ["push", "pull_request"]) for (const script of ["validate_service_ownership", "in_th_guard"]) assert(
      workflow.on[event].paths.includes(".github/scripts/" + script + ".cjs"),
      file + " 缺少业务归属测试变更触发器：" + event + " / " + script);
  }
  for (const environment of ["国内", "国外"]) {
    const domestic = environment === "国内";
    const stem = "防DNS泄露-" + environment + "版";
    const config = parse(read(stem + ".yaml"));
    for (const variant of [config, evaluate(read(stem + ".js"))]) {
      checkRoutes(variant, "mihomo", domestic);
      checkDns(variant, domestic);
      checkAppDnsBoundary(variant);
      checkInThBoundary(variant, "mihomo", domestic);
    }
    negativeControls(config, domestic);
    const stash = parse(read("stash-" + environment + "版.stoverride"));
    checkRoutes(stash, "stash", domestic);
    checkInThBoundary(stash, "stash", domestic);
    const keys = Object.keys(stash.dns["nameserver-policy"]);
    for (const name of ["bilibili", "biliintl", "steam@cn", "category-games-cn", "steam", "category-games-!cn", "apple"]) {
      assert(keys.indexOf("geosite:" + name) >= 0 && keys.indexOf("geosite:" + name) < keys.indexOf("geosite:cn"));
    }
    const shadow = parseShadow(read("shadowrocket-" + environment + "版.conf"));
    checkRoutes(shadow, "shadowrocket", domestic);
    checkInThBoundary(shadow, "shadowrocket", domestic);
    const badCopilot = structuredClone(shadow);
    badCopilot.rules = badCopilot.rules.filter(rule => !rule.includes("/github-copilot.list,AI"));
    assert.throws(() => checkRoutes(badCopilot, "shadowrocket", domestic));
  }
  console.log("六套入口业务归属：B站/游戏/微软苹果/AI/Telegram、共享服务边界、Copilot网页/包名/DNS、越南地域DNS后置、App与DNS交叉边界、例外及负向控制 OK");
  console.log("in.th 临时隔离：六套入口、两个集合、DNS、整应用与具体游戏优先、误分类复现负例 OK（非原生客户端实测）");
}
module.exports = { run, MEMBERS };
