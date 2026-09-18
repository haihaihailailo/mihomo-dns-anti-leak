// 为 Sub-Store 生成内联脚本，复用通用配置的别名算法，不固化订阅或入口地址。
const { applyNodeServerAliases } = require('./node_server_aliases.cjs');

function operator(proxies, targetPlatform, context) {
  // 只在单条订阅内运行，避免不同来源的同名 hosts 相互覆盖。
  if (!context || !Array.isArray(context.raw) || context.raw.length > 16) {
    throw new Error('node aliases: single-subscription raw context required');
  }
  const hosts = Object.create(null);
  for (const raw of context.raw) {
    if (typeof raw !== 'string' || raw.length > 4 * 1024 * 1024) {
      throw new Error('node aliases: invalid raw subscription');
    }
    // 非 YAML 的 URI/base64 订阅没有 hosts，沿用 Sub-Store 的节点解析。
    if (!/^hosts\s*:/m.test(raw)) continue;
    const parsed = ProxyUtils.yaml.safeLoad(raw);
    if (!parsed || !parsed.hosts || typeof parsed.hosts !== 'object' || Array.isArray(parsed.hosts)) {
      throw new Error('node aliases: invalid hosts');
    }
    for (const key of Object.keys(parsed.hosts)) {
      if (Object.prototype.hasOwnProperty.call(hosts, key) &&
          JSON.stringify(hosts[key]) !== JSON.stringify(parsed.hosts[key])) {
        throw new Error('node aliases: conflicting source mappings');
      }
      hosts[key] = parsed.hosts[key];
    }
  }
  const changed = applyNodeServerAliases({ proxies, hosts }).proxies;
  // UDP 以单条订阅已验证的能力设置为准；这里只接受 server 改名。
  return changed.map((proxy, index) => {
    const result = { ...proxy };
    if (Object.prototype.hasOwnProperty.call(proxies[index], 'udp')) result.udp = proxies[index].udp;
    else delete result.udp;
    return result;
  });
}

function buildSubstoreAliases() {
  return '// 来源内 hosts 别名适配；置于能力处理之后、来源前缀之前。\n' +
    applyNodeServerAliases.toString() + '\n' + operator.toString() + '\n';
}

module.exports = { buildSubstoreAliases };
