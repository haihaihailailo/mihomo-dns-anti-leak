// 唯一离线验证入口间接调用。验证来源/格式契约；不下载远程数据、不改客户端。
const assert = require("node:assert/strict");
const { parse, renderProfiles } = require("./build_profiles.cjs");
const { renderNativeProfiles, parseShadow } = require("./build_native_profiles.cjs");
const { unwrapInThGuard } = require("./in_th_guard.cjs");
const AI = ["anthropic", "google-gemini", "github-copilot"];
const AI_DOMAIN_SOURCES = ["openai", ...AI];
// 多租户基础设施不应整根归 AI；保留上游的服务专属主机，不当作浏览器来源识别。
const SHARED_AI_HOSTS = ["auth0.com", "statsigapi.net", "intercom.io", "intercomcdn.com",
  "stripe.com", "sentry.io", "algolia.net", "segment.io", "launchdarkly.com", "identrust.com",
  "observeit.net", "amazonaws.com", "cloudinary.com", "akamaized.net", "azureedge.net",
  "blob.core.windows.net", "livekit.cloud"].flatMap(domain => [domain, "unrelated." + domain])
  .concat(["example-co.au.auth0.com", "api.intercom.io", "js.intercomcdn.com", "events.statsigapi.net"]);
const AI_REQUIRED_HOSTS = {
  openai: ["api.openai.com", "auth0.openai.com", "chatgpt.com"],
  anthropic: ["claude.ai", "api.anthropic.com"],
  "google-gemini": ["gemini.google.com", "generativelanguage.googleapis.com", "gemini.gstatic.com", "cdn.gemini.gstatic.com"],
  "github-copilot": ["api.githubcopilot.com", "copilot-proxy.githubusercontent.com", "copilot-workspace.githubnext.com",
    "copilotprodattachments.blob.core.windows.net", "copilot-telemetry-service.githubusercontent.com", "copilot-telemetry.githubusercontent.com"],
};
function checkAiDomainPayload(payload, name) {
  const matchers = payload.map(rule => {
    const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]*");
    return host => rule.startsWith("+.") ? host === rule.slice(2) || host.endsWith(rule.slice(1))
      : rule.startsWith(".") ? host.endsWith(rule) : new RegExp("^" + escaped + "$").test(host);
  });
  for (const host of SHARED_AI_HOSTS) assert(!matchers.some(matches => matches(host)), "AI 上游误收共享服务：" + host);
  if (name) for (const host of AI_REQUIRED_HOSTS[name]) assert(matchers.some(matches => matches(host)), name + " 上游缺少已确认专属域名：" + host);
}
const ADS = "TG-Twilight/AWAvenue-Ads-Rule";
const ADS_YAML = "Filters/AWAvenue-Ads-Rule-Clash-Classical-Only.Ads.yaml";
const ADS_LIST = "Filters/AWAvenue-Ads-Rule-Surge-RULE-SET-Only.Ads.list";

// 可用于本地已下载快照。返回规范化规则，拒绝把 HTML、纯域名文本当 classical。
function parsePayload(text, behavior, format) {
  assert.equal(typeof text, "string");
  assert(!/^\s*</.test(text), "拒绝 HTML 错误页");
  assert(Buffer.byteLength(text) <= 4194304, "规则超过 4 MiB");
  assert(["yaml", "text"].includes(format), "二进制格式必须交给内核验证");
  const payload = format === "yaml" ? parse(text)?.payload
    : text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  assert(Array.isArray(payload) && payload.length, "空或无效 payload");
  for (const rule of payload) {
    assert.equal(typeof rule, "string");
    if (behavior === "classical") {
      const parts = rule.split(",");
      assert(["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-REGEX", "DOMAIN-WILDCARD", "URL-REGEX",
        "IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "USER-AGENT", "PROCESS-NAME"].includes(parts[0]),
      "不支持的 classical 类型：" + parts[0]);
      assert(parts[1] && !/[\r\n]/.test(parts[1]), "无效规则值");
      if (!["USER-AGENT", "PROCESS-NAME", "URL-REGEX", "DOMAIN-REGEX"].includes(parts[0])) {
        assert(!/\s/.test(parts[1]), "域名/IP 规则不得含空白");
      }
      assert(parts.length === 2 || (parts.length === 3 && parts[2] === "no-resolve"), "上游不得附带出口策略");
    } else {
      assert.equal(behavior, "domain");
      assert(!/[\s,<]/.test(rule) && /^[+*.a-zA-Z0-9_-]+$/.test(rule), "无效纯域名规则：" + rule);
    }
  }
  return payload;
}

function checkProviders(config, client, foreign) {
  const providers = config["rule-providers"];
  const raw = client === "mihomo";
  const url = (repo, ref, file) => raw
    ? "https://raw.githubusercontent.com/" + repo + "/" + ref + "/" + file
    : "https://cdn.jsdelivr.net/gh/" + repo + "@" + ref + "/" + file;
  assert.equal(Object.keys(providers).length, 28, "规则集数量漂移，须审查来源清单");
  assert.equal(providers.reject.url, url(ADS, "main", ADS_YAML));
  assert.equal(providers.reject.behavior, "classical");
  assert.equal(providers.reject.format, "yaml");
  assert.equal(providers.reject.path, "./ruleset/awavenue/only-ads-classical.yaml");
  assert(providers.wechat.url.endsWith("/WeChat/WeChat_No_Resolve.yaml"));
  assert(providers.wechat.path.endsWith("/wechat-no-resolve.yaml"));
  assert(config.rules.some(rule => /^RULE-SET,wechat,(DIRECT|国内服务),no-resolve$/.test(rule)));
  const seenPaths = new Set();
  for (const [name, provider] of Object.entries(providers)) {
    assert.equal(provider.type, "http");
    assert(provider.url.startsWith("https://"), "不得降级 HTTP");
    assert.equal(provider.interval, 86400);
    assert(!seenPaths.has(provider.path), "不同 provider 不得共用缓存文件");
    seenPaths.add(provider.path);
    assert(provider.path.startsWith("./ruleset/") && !provider.path.includes("..", 2));
    assert(provider.url.endsWith("." + (provider.format === "text" ? "list" : provider.format)), "格式与 URL 后缀不符：" + name);
    if (raw) {
      assert.equal(provider["size-limit"], 4194304);
      assert.equal(provider.proxy, "节点选择");
    }
    if (!["reject", "wechat", "alipay", ...AI].includes(name)) {
      assert(provider.url.includes("MetaCubeX/meta-rules-dat"), "原有主力规则库意外替换");
      assert.equal(provider.format, "mrs", "广告模板不得污染其他 provider 格式");
      assert.equal(provider.behavior, name === "telegramcidr" ? "ipcidr" : "domain");
    }
  }
  for (const name of AI) {
    assert.equal(providers[name].url, url("MetaCubeX/meta-rules-dat", "meta", "geo/geosite/" + name + ".list"));
    assert.equal(providers[name].format, "text");
    assert.equal(providers[name].behavior, "domain");
    const at = config.rules.indexOf("RULE-SET," + name + ",AI");
    assert(at > config.rules.indexOf("RULE-SET,reject,广告过滤"));
    for (const parent of ["google", "github", "microsoft"]) {
      const parentAt = config.rules.findIndex(rule => rule.startsWith("RULE-SET," + parent + ","));
      assert(at < parentAt, "AI 专属规则被通用服务抢先匹配");
    }
    const key = (raw ? "rule-set:" : "geosite:") + name;
    const actual = config.dns["nameserver-policy"][key];
    const expected = raw ? ["https://1.1.1.1/dns-query#AI", "https://8.8.8.8/dns-query#AI"]
      : foreign ? ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"] : "https://1.1.1.1/dns-query";
    assert.deepEqual(actual, expected, "AI 新增规则必须同步 DNS");
    if (!raw) {
      const keys = Object.keys(config.dns["nameserver-policy"]);
      assert(keys.indexOf(key) < keys.indexOf("geosite:cn"), "Stash AI DNS 须优先于通用 cn");
    }
  }
}

function run() {
  for (const { config, environment } of renderProfiles()) checkProviders(config, "mihomo", environment === "国外");
  for (const { content, client, environment } of renderNativeProfiles()) {
    if (client === "stash") checkProviders(parse(content), client, environment === "国外");
    else {
      const rules = parseShadow(content).rules.map(unwrapInThGuard);
      const ads = "RULE-SET,https://raw.githubusercontent.com/" + ADS + "/main/" + ADS_LIST + ",广告过滤";
      assert.equal(rules.filter(rule => rule === ads).length, 1);
      const domestic = environment === "国内" ? "DIRECT" : "国内服务";
      const china = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list";
      assert(rules.includes("DOMAIN-SET," + china + "," + domestic));
      assert(!rules.some(rule => rule.startsWith("RULE-SET," + china)), "纯域名集不能当 classical 调用");
      assert(!content.includes("/Advertising/Advertising.list"), "不得叠加旧全量广告集");
      for (const name of AI_DOMAIN_SOURCES) assert(rules.includes("DOMAIN-SET,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/" + name + ".list,AI"),
        "Shadowrocket AI 必须使用同源纯域名集：" + name);
      assert(!rules.some(rule => rule.startsWith("RULE-SET,") && rule.endsWith(",AI")), "AI 不应回退到含共享 ASN/根域的 classical 集合");
    }
  }
  assert.deepEqual(parsePayload("payload:\n  - DOMAIN,ads.example.test\n", "classical", "yaml"), ["DOMAIN,ads.example.test"]);
  assert.deepEqual(parsePayload("# fixture\n+.example.test\n", "domain", "text"), ["+.example.test"]);
  for (const text of ["<html>403</html>", ".example.test", "DOMAIN,example.test,DIRECT"]) {
    assert.throws(() => parsePayload(text, "classical", "text"));
  }
  checkAiDomainPayload(["+.openai.com", "o33249.ingest.sentry.io", "ppl-ai-file-upload.s3.amazonaws.com"]);
  for (const rule of ["+.auth0.com", "intercom.io", ".statsigapi.net", "*.sentry.io", "+.stripe.com"]) {
    assert.throws(() => checkAiDomainPayload(["+.openai.com", rule]), /AI 上游误收共享服务/);
  }
  for (const name of AI_DOMAIN_SOURCES) assert.throws(() => checkAiDomainPayload(["unrelated.example.test"], name), /上游缺少已确认专属域名/);
  assert.throws(() => checkAiDomainPayload(["copilot.microsoft.com"], "github-copilot"), /github-copilot 上游缺少/);
  console.log("规则来源、格式/缓存隔离、AI 优先级与 DNS、纯广告模式、Shadowrocket DOMAIN-SET 契约 OK");
}
if (require.main === module) run();
module.exports = { parsePayload, run, AI_DOMAIN_SOURCES, SHARED_AI_HOSTS, checkAiDomainPayload };
