// 与 OpenClash Ruby 适配库共用转换边界；函数整体嵌入公开 JS，手机无需 Node.js。
// 不查 DNS、不下载订阅、不写文件；转换 server，并对已确认的花云 SS 开启 UDP。
function applyNodeServerAliases(config) {
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const fail = message => { throw new Error("node aliases: " + message); };
  if (!record(config)) fail("config must be a map");
  // provider 内的节点由内核另行加载；没有内联节点或 hosts 时不凭空添加字段。
  if (!own(config, "proxies") || !own(config, "hosts")) return config;
  if (!Array.isArray(config.proxies)) fail("proxies must be an array");
  if (!record(config.hosts)) fail("hosts must be a map");
  const keys = Object.keys(config.hosts);
  if (config.proxies.length > 4096 || keys.length > 4096) fail("input limit exceeded");

  // IP 及以 IP 结束的别名链由 Mihomo 原生 hosts 处理，不把动态域名固定成 IP。
  const ip = value => typeof value === "string" && value.trim() === value &&
    (/^\d+(?:\.\d+){3}$/.test(value) ||
      ((value.match(/:/g) || []).length >= 2 && /^[0-9a-f:.]+$/i.test(value)));
  function domain(value) {
    // JS 的 $ 可匹配末尾换行之前；先限制字符，防止非法尾字符混入节点地址。
    if (typeof value !== "string" || /[^a-z0-9.-]/i.test(value)) return null;
    const name = value.toLowerCase().replace(/\.$/, "");
    if (name.length > 253 || ip(name)) return null;
    const labels = name.split(".");
    return labels.length >= 2 && labels.every(label => label.length >= 1 && label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ? name : null;
  }
  // 无原型映射表，只读取自有键；通配符/URL/端口不解释为精确域名。
  const mappings = Object.create(null);
  for (const key of keys) {
    const name = domain(key);
    if (!name) continue;
    if (own(mappings, name)) fail("duplicate normalized host");
    mappings[name] = config.hosts[key];
  }
  // 花云直订阅曾把全部节点标成 udp:false。仅识别已核对的入口域名关系，
  // 不按节点名称猜服务商，也不强制开启其他机场或其他协议的 UDP。
  const flowerServers = Object.create(null);
  for (const source of Object.keys(mappings)) {
    const destination = domain(mappings[source]);
    if (source.endsWith(".aws-agent.com") && destination && destination.endsWith(".apt-agent.dev")) {
      flowerServers[source] = true;
      flowerServers[destination] = true; // 兼容重复运行时已经替换的入口。
    }
  }
  function target(start) {
    let current = start;
    const visited = Object.create(null);
    for (let step = 0; step < 32; step++) {
      if (!own(mappings, current)) return current;
      if (own(visited, current)) fail("cyclic mapping");
      visited[current] = true;
      const value = mappings[current];
      if (ip(value) || (Array.isArray(value) && value.length > 0 && value.every(ip))) return start;
      current = domain(value);
      if (!current) fail("invalid domain target");
    }
    fail("chain exceeds 32 entries");
  }
  function supported(proxy) {
    if (proxy.type !== "ss" || proxy.tls) return false;
    if (proxy.plugin == null || proxy.plugin === "") return true;
    const opts = proxy["plugin-opts"];
    // 仅支持独立指定混淆 host 的 simple-obfs HTTP；TLS/SNI 及其他插件不改。
    return proxy.plugin === "obfs" && record(opts) && opts.mode === "http" && !!domain(opts.host);
  }
  // 先完整计算再赋值：任何循环/非法目标都抛错，不留下半批转换的节点。
  const proxies = config.proxies.map(proxy => {
    if (!record(proxy)) fail("invalid proxy entry");
    if (!supported(proxy)) return proxy;
    const original = domain(proxy.server);
    if (!original) return proxy;
    const destination = own(mappings, original) ? target(original) : original;
    let next = destination === original ? proxy : { ...proxy, server: destination };
    // 限定花云当前 obfs/http 类型；只放开 UDP，不启用 UOT、TFO、MPTCP 或 smux。
    if (proxy.plugin === "obfs" && own(flowerServers, original) && proxy.udp !== true) {
      next = { ...next, udp: true };
    }
    return next;
  });
  config.proxies = proxies;
  return config;
}

module.exports = { applyNodeServerAliases };
