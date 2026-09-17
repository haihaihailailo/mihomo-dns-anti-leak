// OpenClash 公共模板：复用已完成环境投影/精简/调优的 Mihomo 配置。
const YAML = require('yaml');

const CLIENT_KEYS = [
  'tun', 'ipv6', 'mode', 'log-level', 'port', 'socks-port', 'mixed-port',
  'redir-port', 'tproxy-port', 'allow-lan', 'bind-address', 'interface-name',
  'routing-mark', 'external-controller', 'external-controller-tls',
  'external-controller-unix', 'external-controller-pipe', 'external-ui',
  'external-ui-url', 'external-controller-cors', 'secret', 'authentication',
  'skip-auth-prefixes', 'lan-allowed-ips', 'lan-disallowed-ips', 'listeners',
  'proxies', 'proxy-providers',
];
const isProcessRule = rule => /(?:^|[,(])\s*PROCESS-[A-Z-]+,/.test(rule);

function routerConfig(source) {
  const config = JSON.parse(JSON.stringify(source));
  for (const key of CLIENT_KEYS) delete config[key];
  config['find-process-mode'] = 'off';
  config.rules = config.rules.filter(rule => !isProcessRule(rule));
  // 本地 OpenClash 负责 DNS 监听和 IPv6 接管，不能沿用桌面双栈地址池。
  for (const key of ['listen', 'ipv6', 'fake-ip-range6']) delete config.dns[key];
  return config;
}

function renderRouterProfiles(profiles) {
  return profiles.map(({ environment, config: source }) => {
    const config = routerConfig(source);
    const document = new YAML.Document(config);
    document.get('find-process-mode', true).type = YAML.Scalar.QUOTE_DOUBLE;
    const note = [
      `OpenClash 路由器${environment}版公共模板；由 build_profiles.cjs 生成，请勿手改。`,
      '不含订阅/节点，须在路由器本地接入；不能单独提供代理。不要与桌面版叠加。',
      'TUN、端口、运行模式、IPv6、认证及接管范围由 OpenClash 管理；不识别远端 App 包名。',
      '仅保留域名/IP 分流；开启 IPv6 前须同时配置接管和 DNS，详见 README 路由器章节。',
    ].map(line => `# ${line}\n`).join('');
    return { environment, file: `防DNS泄露-路由器-${environment}版.yaml`,
      content: note + document.toString({ lineWidth: 0, aliasDuplicateObjects: false }), config };
  });
}

function renderRouterOverrides(profiles) {
  return profiles.map(({ environment, config: source }) => {
    const config = routerConfig(source);
    // OpenClash v0.47.156 [Overwrite] + ruby_edit. Avoid its [YAML] eval/echo
    // interpolation: encode public JSON data, never executable/private input.
    const lines = Object.entries(config).map(([key, value]) => {
      if (!/^[a-z-]+$/.test(key)) throw new Error(`Unsafe overwrite key: ${key}`);
      const encoded = Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
      const decoded = `YAML.safe_load('${encoded}'.unpack1('m0').force_encoding('UTF-8'), aliases: true)`;
      const expression = key === 'dns'
        ? `(Value.fetch('dns', {}).select { |k, _| ['listen', 'ipv6', 'fake-ip-range6'].include?(k) }).merge(${decoded})`
        : decoded;
      return `ruby_edit "$CONFIG_FILE" "['${key}']" "${expression}"`;
    });
    const content = [
      `# OpenClash 路由器${environment}版远程覆写；自动生成，请勿手改。`,
      '# 节点来自本地订阅；仅替换公共分流。端口、认证、TUN、IPv6 由 OpenClash 管理。',
      '# Base64 是公开 JSON 的转义载体，不是加密；勿向本文件添加订阅或凭据。',
      '[Overwrite]', ...lines, '',
    ].join('\n');
    // OpenClash assembles Ruby in a single command argument; retain ample headroom.
    if (Buffer.byteLength(content) > 110000) throw new Error('OpenClash module exceeds command budget');
    return { environment, file: `防DNS泄露-路由器-${environment}版.conf`, content, config };
  });
}

module.exports = { routerConfig, renderRouterProfiles, renderRouterOverrides };
