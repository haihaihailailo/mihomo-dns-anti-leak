// Stash / Shadowrocket 的两地生成器。仅使用各自已有原生语法，不注入 Mihomo 字段。
// https://stash.wiki/en/features/dns-server
// https://stash.wiki/en/configuration/override
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const YAML = require("yaml");
const { consolidateGroups } = require("./consolidate_groups.cjs");
const ROOT = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const parse = text => YAML.parse(text, { merge: true, uniqueKeys: true, maxAliasCount: 1000 });
const CN = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
const GLOBAL = ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"];
const FOREIGN_DIRECT = ["节点选择", "GitHub", "电报消息"];

function replaceOnce(text, pattern, replacement) {
  let count = 0;
  const result = text.replace(pattern, (...args) => {
    count++;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  assert.equal(count, 1, "模板位置缺失或重复：" + pattern);
  return result;
}

// 只替换 DNS 子段的值，保留 #!replace 和其余源码文本、别名与规则顺序。
function dnsBlock(text, key, value) {
  const body = YAML.stringify(value, { lineWidth: 0, aliasDuplicateObjects: false }).trimEnd()
    .split("\n").map(line => "    " + line).join("\n");
  return replaceOnce(text, new RegExp(
    "^  " + key + ": #!replace\\n(?:^    .*\\n)*", "gm"),
  "  " + key + ": #!replace\n" + body + "\n");
}

function stashProfile(source, environment) {
  const foreign = environment === "国外";
  const base = parse(source);
  let text = replaceOnce(source, /^name: .*$/gm, "name: DNS 防泄露 Stash " + environment + "版");
  text = replaceOnce(text, /^summary: .*$/gm,
    "summary: " + environment + "使用入口；只选一套，不叠加旧通用版；主订阅提供节点，IPv6 由客户端管理。");
  text = dnsBlock(text, "default-nameserver", foreign ? GLOBAL : [CN[0]]);
  text = dnsBlock(text, "proxy-server-nameserver", foreign ? GLOBAL : CN);
  text = dnsBlock(text, "nameserver", foreign ? GLOBAL : CN);
  if (foreign) {
    const policies = {};
    // 专属 geosite 必须先于 cn；Stash 在多个 geosite 命中时采用配置中的第一个。
    const serviceKeys = ["geosite:anthropic", "geosite:google-gemini", "geosite:github-copilot", "geosite:microsoft", "geosite:google", "geosite:youtube", "geosite:openai", "geosite:github"];
    const entries = Object.entries(base.dns["nameserver-policy"]);
    for (const key of ["geosite:private", ...serviceKeys]) {
      assert(Object.hasOwn(base.dns["nameserver-policy"], key), "缺少 Stash DNS 策略：" + key);
      policies[key] = GLOBAL;
    }
    for (const [key, value] of entries) {
      if (Object.hasOwn(policies, key)) continue;
      const domestic = ["geosite:cn", "+.alipaylog.com", "+.aliapp.org"].includes(key);
      policies[key] = domestic ? value : GLOBAL;
    }
    text = dnsBlock(text, "nameserver-policy", policies);
    for (const name of FOREIGN_DIRECT) {
      text = replaceOnce(text,
        new RegExp("(^  - name: " + name + "\\n(?:(?!^  - name: )[\\s\\S])*?^    proxies: )\\[([^\\n]*)\\]", "gm"),
        (_, prefix, members) => {
          const values = members.split(",").map(item => item.trim());
          assert.equal(values.filter(item => item === "DIRECT").length, 1);
          return prefix + "[" + ["DIRECT", ...values.filter(item => item !== "DIRECT")].join(", ") + "]";
        });
    }
    text = replaceOnce(text, /(^  - name: 自动选择\n(?:(?!^  - name: )[\s\S])*?^    lazy: )false$/gm, (_, prefix) => prefix + "true");
  }
  return "# 由 .github/scripts/build_profiles.cjs 生成，请勿手改；内部源码不是导入入口。\n" + text;
}

// 离线结构解析器，不冒充 Shadowrocket 内核；保留完整规则行，不执行远端规则。
function parseShadow(text) {
  const sections = {};
  let current;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^\[.+\]$/.test(line)) {
      const key = line.slice(1, -1);
      assert(!sections[key], "重复 Shadowrocket 段：" + key);
      current = sections[key] = [];
    } else {
      assert(current, "Shadowrocket 内容不在任何段内");
      current.push(line);
    }
  }
  for (const key of ["General", "Proxy", "Proxy Group", "Rule"]) assert(sections[key], "缺少段：" + key);
  function assignments(lines) {
    const result = {};
    for (const line of lines) {
      const match = line.match(/^([^=]+?)\s*=\s*(.*)$/);
      assert(match, "非赋值项：" + line);
      assert(!Object.hasOwn(result, match[1]), "重复字段或组：" + match[1]);
      result[match[1]] = match[2];
    }
    return result;
  }
  return { sections, general: assignments(sections.General), groups: assignments(sections["Proxy Group"]), rules: sections.Rule };
}

function shadowProfile(source, environment) {
  const foreign = environment === "国外";
  let text = replaceOnce(source, /^# Shadowrocket 两地版内部共同源码（非导入入口）$/gm, "# Shadowrocket " + environment + "使用配置");
  text = replaceOnce(text, /^update-url = *$/gm, "update-url =");
  const settings = {
    "dns-server": foreign ? GLOBAL : CN,
    "fallback-dns-server": foreign ? GLOBAL : ["https://1.1.1.1/dns-query#proxy", "https://dns.google/dns-query#proxy"],
    "proxy-dns-server": foreign ? GLOBAL : [CN[0]],
  };
  for (const [key, value] of Object.entries(settings)) {
    text = replaceOnce(text, new RegExp("^" + key + " = .*", "gm"), key + " = " + value.join(", "));
  }
  if (foreign) {
    text = replaceOnce(text, /^# 主 DNS .*$/gm, "# 国外版主/备用 DNS 使用境外 DoH，不强制依赖默认代理；节点域名独立解析。");
    for (const name of FOREIGN_DIRECT) {
      text = replaceOnce(text, new RegExp("^" + name + " = (.*)$", "gm"), (_, body) => {
        const parts = body.split(",").map(item => item.trim());
        assert.equal(parts.shift(), "select");
        const members = parts.filter(item => !item.includes("="));
        assert.equal(members.filter(item => item === "DIRECT").length, 1);
        const options = parts.filter(item => item.includes("=") && !item.startsWith("policy-select-name="));
        return name + " = " + ["select", "DIRECT", ...members.filter(item => item !== "DIRECT"), "policy-select-name=DIRECT", ...options].join(",");
      });
    }
  }
  return "# Shadowrocket " + environment + "版；由 .github/scripts/build_profiles.cjs 生成，请勿手改。\n"
    + "# 只选一套；保留已导入的订阅节点，切换后核对已保存策略。\n" + text;
}

function compactStash(text, domestic) {
  const config = consolidateGroups(parse(text), domestic);
  for (const key of ["proxy-groups", "rules"]) {
    const body = YAML.stringify(config[key], { lineWidth: 0, aliasDuplicateObjects: false })
      .trimEnd().split("\n").map(line => "  " + line).join("\n");
    text = replaceOnce(text, new RegExp("^" + key + ": #!replace\\n[\\s\\S]*?(?=^[a-z][\\w-]*:|$(?![\\s\\S]))", "gm"),
      key + ": #!replace\n" + body + "\n\n");
  }
  return text.trimEnd() + "\n";
}

function compactShadow(text, domestic) {
  const parsed = parseShadow(text);
  const config = {
    rules: parsed.rules,
    "proxy-groups": Object.entries(parsed.groups).map(([name, body]) => {
      const parts = body.split(",").map(item => item.trim());
      const group = { name, type: parts.shift(), proxies: [] };
      for (const part of parts) {
        const index = part.indexOf("=");
        if (index < 0) group.proxies.push(part);
        else {
          const key = part.slice(0, index);
          assert(!Object.hasOwn(group, key), "重复 Shadowrocket 选项：" + key);
          group[key] = part.slice(index + 1);
        }
      }
      return group;
    }),
  };
  consolidateGroups(config, domestic);
  const groups = config["proxy-groups"].map(({ name, type, proxies, ...options }) =>
    name + " = " + [type, ...proxies, ...Object.entries(options).map(([key, value]) => key + "=" + value)].join(","));
  text = replaceOnce(text, /^\[Proxy Group\]\n[\s\S]*?(?=^\[)/gm, "[Proxy Group]\n" + groups.join("\n") + "\n\n");
  return replaceOnce(text, /^\[Rule\]\n[\s\S]*$/gm, "[Rule]\n" + config.rules.join("\n") + "\n");
}

function renderNativeProfiles({ compact = true } = {}) {
  const stashSource = read(".github/config/shared.stoverride");
  const shadowSource = read(".github/config/shared.conf");
  const detailed = ["国内", "国外"].flatMap(environment => [
    { environment, client: "stash", file: "stash-" + environment + "版.stoverride", content: stashProfile(stashSource, environment) },
    { environment, client: "shadowrocket", file: "shadowrocket-" + environment + "版.conf", content: shadowProfile(shadowSource, environment) },
  ]);
  return detailed.map(item => ({
    ...item,
    detailedContent: item.content,
    content: !compact ? item.content : (item.client === "stash" ? compactStash : compactShadow)(item.content, item.environment === "国内"),
  }));
}

module.exports = { renderNativeProfiles, parseShadow };
