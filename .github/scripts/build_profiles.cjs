// 唯一环境差异来源；主 YAML / JS 仍负责共同分流，不手改生成的国内版 / 国外版。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const YAML = require("yaml");

const ROOT = path.resolve(__dirname, "../..");
const clone = value => JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const parse = text => YAML.parse(text, { merge: true, uniqueKeys: true, maxAliasCount: 1000 });
const evaluate = (code, input = {}) => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 5000 });
  sandbox.input = clone(input);
  return clone(vm.runInContext("main(input)", sandbox, { timeout: 5000 }));
};
function normalize(value, key = "") {
  if (Array.isArray(value)) return value.map(item => key === "ports" ? String(item) : normalize(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
  return key === "expected-status" ? String(value) : value;
}

const CN_DNS = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
const GLOBAL_DNS = ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"];
const via = (servers, policy) => servers.map(server => `${server}#${policy}`);

function environmentSettings(base, environment) {
  if (environment === "国内") return {
    dns: {
      "default-nameserver": [CN_DNS[0]],
      "proxy-server-nameserver": via(CN_DNS, "DIRECT"),
      "direct-nameserver": CN_DNS,
      "direct-nameserver-follow-policy": true,
    },
    defaults: {},
  };
  assert.equal(environment, "国外");
  const policies = {};
  const domesticKeys = new Set([
    "rule-set:cn", "rule-set:steam-cn", "rule-set:category-games-cn",
    "rule-set:wechat", "rule-set:alipay", "aliapp.org", ".aliapp.org", "yhglobal.com", ".yhglobal.com",
  ]);
  const externalKeys = {
    "rule-set:private": "DIRECT",
    "rule-set:geolocation-!cn": "节点选择",
    "rule-set:google": "谷歌服务", "googleapis.cn": "谷歌服务", ".googleapis.cn": "谷歌服务",
    "rule-set:youtube": "YouTube", "rule-set:github": "GitHub", "rule-set:openai": "AI",
    "rule-set:microsoft": "微软服务",
    "download.nvidia.com": "DIRECT", ".download.nvidia.com": "DIRECT",
    "download.nvidia.cn": "DIRECT", ".download.nvidia.cn": "DIRECT",
    "ota.nvidia.com": "DIRECT", "gfwsl.geforce.cn": "DIRECT",
  };
  for (const key of Object.keys(base.dns["nameserver-policy"])) {
    if (domesticKeys.has(key)) policies[key] = via(CN_DNS, "国内服务");
    else if (externalKeys[key]) policies[key] = via(GLOBAL_DNS, externalKeys[key]);
    else if (/^\.?((download\.)?windowsupdate\.com|((dl\.)?delivery\.)?mp\.microsoft\.com)$/.test(key)) {
      policies[key] = via(GLOBAL_DNS, "微软服务");
    } else throw new Error(`新增 DNS 策略须明确国外语义：${key}`);
  }
  // 主规则已明确归入 AI 的域名也使用 AI 出口解析，避免只覆盖 openai 规则集。
  // 未识别的第三方域名、仅凭进程命中的流量，不能据此保证 DNS 与业务出口相同。
  for (const rule of base.rules) {
    const [type, domain, policy] = rule.split(",");
    if (policy !== "AI" || !["DOMAIN", "DOMAIN-SUFFIX"].includes(type)) continue;
    policies[domain] = via(GLOBAL_DNS, "AI");
    if (type === "DOMAIN-SUFFIX") policies[`.${domain}`] = via(GLOBAL_DNS, "AI");
  }
  return {
    dns: {
      "default-nameserver": GLOBAL_DNS,
      "proxy-server-nameserver": via(GLOBAL_DNS, "DIRECT"),
      "nameserver": via(GLOBAL_DNS, "节点选择"),
      // 显式清空旧 fallback，避免客户端合并时遗留国内 geoip-code: CN 判断。
      "fallback": [],
      "fallback-filter": { geoip: false, ipcidr: [], domain: [], geosite: [] },
      "direct-nameserver": via(GLOBAL_DNS, "DIRECT"),
      "direct-nameserver-follow-policy": true,
      "nameserver-policy": policies,
    },
    // 其他普通业务组原本跟随节点选择；AI 保持原有美国自动首选。
    defaults: { "节点选择": "DIRECT", "GitHub": "DIRECT", "电报消息": "DIRECT" },
    lazyAutomatic: true,
  };
}

// 此函数同时用于生成 YAML 和生成的 JS 入口，不引用外部变量。
function applyEnvironment(config, settings) {
  Object.assign(config.dns, JSON.parse(JSON.stringify(settings.dns)));
  for (const [name, preferred] of Object.entries(settings.defaults)) {
    const group = config["proxy-groups"].find(item => item.name === name);
    if (!group || group.type !== "select" || !group.proxies.includes(preferred)) {
      throw new Error(`环境首选策略不存在：${name} / ${preferred}`);
    }
    group.proxies = [preferred, ...group.proxies.filter(item => item !== preferred)];
  }
  if (settings.lazyAutomatic) config["proxy-groups"].find(item => item.name === "自动选择").lazy = true;
  return config;
}

function renderProfiles() {
  const yamlSource = read("防DNS泄露.yaml");
  const jsSource = read("防DNS泄露.js");
  const base = parse(yamlSource);
  assert.deepEqual(normalize(base), normalize(evaluate(jsSource)), "主 YAML/JS 必须先全配置同步");
  return ["国内", "国外"].map(environment => {
    const settings = environmentSettings(base, environment);
    const config = applyEnvironment(clone(base), settings);
    const stem = `防DNS泄露-${environment}版`;
    const note = `${environment}使用入口；由 .github/scripts/build_profiles.cjs 生成，请勿手改。\n与主覆写二选一；不要叠加旧国内补充层。TUN / IPv6 / 运行模式由客户端决定。`;
    // 输出完整配置供单次导入，保留共有规则与 provider；不要复制本机订阅和手选状态。
    const yaml = note.split("\n").map(line => `# ${line}\n`).join("") + YAML.stringify(config, { lineWidth: 0, aliasDuplicateObjects: false });
    const js = `// ${note.replace(/\n/g, "\n// ")}\nconst applySharedConfig = (() => {\n${jsSource}\nreturn main;\n})();\n\nconst ENVIRONMENT = ${JSON.stringify(settings, null, 2)};\n\n${applyEnvironment.toString()}\n\nfunction main(config) {\n  return applyEnvironment(applySharedConfig(config), ENVIRONMENT);\n}\n`;
    assert.deepEqual(normalize(parse(yaml)), normalize(evaluate(js)), `${stem} YAML/JS 不同步`);
    return { environment, stem, yaml, js, config, settings, base };
  });
}

if (require.main === module) {
  const check = process.argv.includes("--check");
  for (const result of renderProfiles()) {
    for (const ext of ["yaml", "js"]) {
      const file = `${result.stem}.${ext}`;
      if (check) assert.equal(read(file), result[ext], `${file} 已过期；运行 npm run build:profiles`);
      else fs.writeFileSync(path.join(ROOT, file), result[ext]);
      console.log(`${check ? "CHECK" : "GENERATED"} ${file}`);
    }
  }
}

module.exports = { ROOT, read, parse, evaluate, normalize, renderProfiles };
