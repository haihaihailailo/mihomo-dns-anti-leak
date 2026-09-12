// 唯一离线验证入口间接调用。验证来源/格式契约；不下载远程数据、不改客户端。
const assert = require("node:assert/strict");
const { parse, renderProfiles } = require("./build_profiles.cjs");
const { renderNativeProfiles, parseShadow } = require("./build_native_profiles.cjs");
const AI = ["anthropic", "google-gemini", "github-copilot"];
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
      assert(["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-REGEX",
        "IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "USER-AGENT", "PROCESS-NAME"].includes(parts[0]),
      "不支持的 classical 类型：" + parts[0]);
      assert(parts[1] && !/\s/.test(parts[1]), "无效规则值");
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
  assert.equal(Object.keys(providers).length, 27, "规则集数量漂移，须审查来源清单");
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
    const expected = raw ? ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"].map(server => server + (foreign ? "#AI" : "#节点选择"))
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
      const { rules } = parseShadow(content);
      const ads = "RULE-SET,https://raw.githubusercontent.com/" + ADS + "/main/" + ADS_LIST + ",广告过滤";
      assert.equal(rules.filter(rule => rule === ads).length, 1);
      const domestic = environment === "国内" ? "DIRECT" : "国内服务";
      const china = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list";
      assert(rules.includes("DOMAIN-SET," + china + "," + domestic));
      assert(!rules.some(rule => rule.startsWith("RULE-SET," + china)), "纯域名集不能当 classical 调用");
      assert(!content.includes("/Advertising/Advertising.list"), "不得叠加旧全量广告集");
    }
  }
  assert.deepEqual(parsePayload("payload:\n  - DOMAIN,ads.example.test\n", "classical", "yaml"), ["DOMAIN,ads.example.test"]);
  assert.deepEqual(parsePayload("# fixture\n+.example.test\n", "domain", "text"), ["+.example.test"]);
  for (const text of ["<html>403</html>", ".example.test", "DOMAIN,example.test,DIRECT"]) {
    assert.throws(() => parsePayload(text, "classical", "text"));
  }
  console.log("规则来源、格式/缓存隔离、AI 优先级与 DNS、纯广告模式、Shadowrocket DOMAIN-SET 契约 OK");
}
run();
module.exports = { parsePayload };
