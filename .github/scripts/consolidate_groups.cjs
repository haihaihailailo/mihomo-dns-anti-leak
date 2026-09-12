// 详细共同源码保留规则分类；公开地区入口统一投影为精简组。
// 函数必须自包含：同一实现嵌入 Mihomo JS 覆写，不能依赖 require 或本机状态。
function consolidateGroups(config, domestic) {
  const aliases = {
    "漏网之鱼": "节点选择", "GitHub": "节点选择", "YouTube": "节点选择",
    "Netflix": "节点选择", "谷歌服务": "节点选择", "电报消息": "节点选择",
    "Meta / X": "节点选择", "TikTok": "节点选择", "Spotify": "节点选择",
    "微软服务": "微软/苹果服务", "苹果服务": "微软/苹果服务", "全局直连": "DIRECT",
  };
  if (domestic) aliases["国内服务"] = "DIRECT";
  const removed = new Set(["韩国节点", "韩国-自动",
    ...(domestic ? ["中国节点", "中国-自动"] : [])]);
  const target = name => Object.hasOwn(aliases, name) ? aliases[name] : name;
  const original = config["proxy-groups"];
  const systems = original.find(group => group.name === "微软服务")
    || original.find(group => group.name === "微软/苹果服务");
  if (!systems) throw new Error("缺少微软/苹果服务来源");
  const apple = original.find(group => group.name === "苹果服务");
  config["proxy-groups"] = original.flatMap(group => {
    if (removed.has(group.name)) return [];
    if (Object.hasOwn(aliases, group.name) && group !== systems) return [];
    const result = { ...group, name: target(group.name) };
    if (group.proxies) {
      const members = group === systems
        ? [...group.proxies, ...(apple?.proxies || [])] : group.proxies;
      result.proxies = [...new Set(members.filter(name => !removed.has(name)).map(target))];
      if (result.proxies.includes(result.name)) throw new Error("合并产生自引用：" + result.name);
    }
    if (result["policy-select-name"]) {
      const preferred = target(result["policy-select-name"]);
      if (removed.has(preferred)) throw new Error("已删除首选组：" + preferred);
      result["policy-select-name"] = preferred;
    }
    return [result];
  });
  // 不做域名/包名的文本替换，不删除规则，不改变 no-resolve 或匹配优先级。
  config.rules = config.rules.map(rule => {
    const parts = rule.split(",");
    const index = ["MATCH", "FINAL"].includes(parts[0]) ? 1 : 2;
    if (!parts[index]) throw new Error("无法识别策略规则：" + rule);
    if (removed.has(parts[index])) throw new Error("规则直接引用已删除地区：" + rule);
    parts[index] = target(parts[index]);
    return parts.join(",");
  });
  // 只变更 DNS 地址的策略片段，不触碰解析器地址、策略键或其他配置值。
  function dnsPolicies(value) {
    if (Array.isArray(value)) return value.map(dnsPolicies);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, dnsPolicies(item)]));
    }
    if (typeof value !== "string") return value;
    return value.replace(/#([^&]+)/g, (_, name) => {
      if (removed.has(name)) throw new Error("DNS 引用已删除地区：" + name);
      return "#" + target(name);
    });
  }
  if (config.dns) config.dns = dnsPolicies(config.dns);
  return config;
}

module.exports = { consolidateGroups };
