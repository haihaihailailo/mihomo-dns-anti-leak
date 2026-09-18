// Mihomo 公开入口的共同调优；嵌入 JS 覆写时不能依赖 require 或设备状态。
// 苹果客户端保留自身测速/DNS 语义，不调用此投影。
function tuneMihomo(config) {
  const groups = config["proxy-groups"];
  const ai = groups.find(group => group.name === "AI");
  if (!ai || ai.type !== "select") throw new Error("缺少 AI 手选入口");
  const regions = ["美国", "日本", "新加坡"];
  const aiNames = new Set(regions.map(region => region + "-AI-自动"));
  // Sub-Store 的来源前缀用于分配流量；无前缀的普通订阅保持原来的候选范围。
  // 手动列表允许任一来源；回国组不改。越南目前只有花云供给，避免专属服务空组。
  const dailyExclude = "^【花云】";
  const aiExclude = "^【(?!花云】)[^】]+】";
  function originalExclude(value) {
    if (!value) return "";
    for (const marker of [dailyExclude, aiExclude]) {
      if (value === "(?i)(?:" + marker + ")") return "";
      const tail = "|" + marker + ")";
      if (value.startsWith("(?i)(?:") && value.endsWith(tail)) {
        return "(?i)" + value.slice("(?i)(?:".length, -tail.length);
      }
    }
    return value;
  }
  function sourceExclude(value, marker) {
    const base = originalExclude(value).replace(/^\(\?i\)/, "");
    return "(?i)(?:" + (base ? base + "|" : "") + marker + ")";
  }
  // 闲置时减少探测；只提高切换容差，保留既有间隔、超时和测速 URL。
  for (const group of groups) if (group.type === "url-test") {
    group.lazy = true;
    group.tolerance = 100;
  }
  const automatic = regions.map(region => {
    const source = groups.find(group => group.name === region + "-自动");
    if (!source || !source["include-all"] || !source.filter) {
      throw new Error("缺少地区节点筛选来源：" + region);
    }
    // 直接筛选地区叶节点，不能 proxies: [地区-自动]，否则仍由普通端点选路。
    return { ...source, name: region + "-AI-自动", hidden: true,
      url: ai.url, "expected-status": ai["expected-status"], timeout: ai.timeout };
  });
  // 普通香港组保留，但不作为 AI 的直接候选；兼容重复处理曾生成的四地区版本。
  ai.proxies = ai.proxies.filter(name => !["香港节点", "香港-自动", "香港-AI-自动"].includes(name))
    .map(name => regions.some(region => name === region + "-自动")
      ? name.replace(/-自动$/, "-AI-自动") : name);
  config["proxy-groups"] = [...groups.filter(group => !aiNames.has(group.name)
    && group.name !== "香港-AI-自动"), ...automatic];
  for (const group of config["proxy-groups"]) {
    if (group.type !== "url-test" || !group["include-all"]) continue;
    if (["中国-自动", "越南-自动"].includes(group.name)) {
      // 允许已带来源过滤的旧输入重复应用时撤销这一项，不留下空组。
      if (group["exclude-filter"]) group["exclude-filter"] = originalExclude(group["exclude-filter"]);
      continue;
    }
    group["exclude-filter"] = sourceExclude(group["exclude-filter"],
      aiNames.has(group.name) ? aiExclude : dailyExclude);
  }

  // 已知 AI 域名解析与业务连接都跟随 AI；节点域名解析仍独立 DIRECT，避免递归。
  const servers = ["https://1.1.1.1/dns-query#AI", "https://8.8.8.8/dns-query#AI"];
  const policies = config.dns["nameserver-policy"];
  for (const name of ["openai", "anthropic", "google-gemini", "github-copilot"]) {
    const key = "rule-set:" + name;
    // 与分组投影保持一致，避免手机端缺少 Object.hasOwn 时在此处再次报错。
    if (!Object.prototype.hasOwnProperty.call(policies, key)) throw new Error("缺少 AI DNS 来源：" + key);
    policies[key] = [...servers];
  }
  const explicit = {};
  // Gemini 集合含专属静态资源，但通用 .gstatic.com 显式 DNS 在集合前。
  // 仅补专属子域，不能把整个共享 gstatic.com 改为 AI，也不改变其他策略顺序。
  for (const key of ["gemini.gstatic.com", ".gemini.gstatic.com"]) explicit[key] = [...servers];
  for (const rule of config.rules) {
    const [type, domain, target] = rule.split(",");
    if (target !== "AI" || !["DOMAIN", "DOMAIN-SUFFIX"].includes(type)) continue;
    explicit[domain] = [...servers];
    if (type === "DOMAIN-SUFFIX") explicit["." + domain] = [...servers];
  }
  config.dns["nameserver-policy"] = Object.fromEntries([
    ...Object.entries(policies).filter(([key]) => key === "rule-set:private"),
    ...Object.entries(explicit),
    ...Object.entries(policies).filter(([key]) => key !== "rule-set:private" && !Object.prototype.hasOwnProperty.call(explicit, key)),
  ]);
  return config;
}

module.exports = { tuneMihomo };
