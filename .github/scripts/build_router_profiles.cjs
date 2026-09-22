// OpenClash 公共模板：复用已完成环境投影/精简/调优的 Mihomo 配置。
const YAML = require('yaml');
const fs = require('node:fs');
const path = require('node:path');
const { MARK, fieldComment, annotateYaml } = require('./config_comments.cjs');

const CLIENT_KEYS = [
  'tun', 'unified-delay', 'ipv6', 'mode', 'log-level', 'port', 'socks-port', 'mixed-port',
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
  // GEO 数据更新由 OpenClash 管理，避免插件与内核重复调度。
  config['geo-auto-update'] = false;
  config.rules = config.rules.filter(rule => !isProcessRule(rule));
  // CN Lite MMDB 不含越南；使用独立的小型 IP 规则集，不要求替换设备数据库。
  if (config.rules.some(rule => /^(GEOIP,VN,|RULE-SET,geoip-vn,)/.test(rule))) {
    config['rule-providers'] ||= {};
    config['rule-providers']['geoip-vn'] = {
      type: 'http', behavior: 'ipcidr', format: 'mrs', interval: 86400,
      'size-limit': 4194304, proxy: '节点选择',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/vn.mrs',
      path: './ruleset/metacubex/geoip-vn.mrs',
    };
    config.rules = config.rules.map(rule => rule.replace(/^GEOIP,VN,/, 'RULE-SET,geoip-vn,'));
  }
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
      'TUN、统一延迟、端口、运行模式、IPv6、认证及接管范围由 OpenClash 管理；不识别远端 App 包名。',
      '仅保留域名/IP 分流；开启 IPv6 前须同时配置接管和 DNS，详见 README 路由器章节。',
    ].map(line => `# ${line}\n`).join('');
    return { environment, file: `防DNS泄露-路由器-${environment}版.yaml`,
      content: annotateYaml(note + document.toString({ lineWidth: 0, aliasDuplicateObjects: false })), config };
  });
}

function renderRouterOverrides(profiles) {
  // 只嵌入仓库内经回归验证的固定 Ruby 源码，绝不把订阅字符串当代码执行。
  // 独立 Module 避免与设备旧本地库重名；一次赋值保留其他节点字段和功能开关。
  const nodeLibrary = fs.readFileSync(path.join(__dirname, 'openclash_node_aliases.rb'), 'utf8').replace(/\r\n/g, '\n');
  const code = Buffer.from(nodeLibrary, 'utf8').toString('base64');
  const adaptNodes = `(lambda { |scope| scope.module_eval('${code}'.unpack1('m0').force_encoding('UTF-8')); scope.const_get(:OpenClashNodeAliases).rewrite(Value.fetch('proxies', []), Value.fetch('hosts', {})) }).call(Module.new)`;
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
      const note = fieldComment(key) + (key === 'dns' ? '保留设备 DNS 监听/IPv6 字段后合并公共 DNS。' : '整段赋值替换该公共字段。');
      return `# ${MARK}${note}\nruby_edit "$CONFIG_FILE" "['${key}']" "${expression}"`;
    });
    const content = [
      `# OpenClash 路由器${environment}版远程覆写；自动生成，请勿手改。`,
      '# 节点来自本地订阅；仅替换公共分流。端口、认证、TUN、统一延迟、IPv6 由 OpenClash 管理。',
      '# Base64 承载公开 JSON 和仓库内固定 Ruby 适配源码，不是加密；勿添加订阅或凭据。',
      `# 各字段、策略组和逐条规则的明文说明见同目录 防DNS泄露-路由器-${environment}版.yaml。`,
      '# 下方每条命令只写入一个公共字段；不要手动编辑编码正文。',
      '[Overwrite]', ...lines,
      `# ${MARK}使用内置适配库处理当前订阅的 SS 精确别名及限定花云 UDP；保留 TFO/MPTCP/UOT/smux，源码见 .github/scripts/openclash_node_aliases.rb。`,
      `ruby_edit "$CONFIG_FILE" "['proxies']" "${adaptNodes}"`, '',
    ].join('\n');
    // OpenClash assembles Ruby in a single command argument; retain ample headroom.
    if (Buffer.byteLength(content) > 110000) throw new Error('OpenClash module exceeds command budget');
    return { environment, file: `防DNS泄露-路由器-${environment}版.conf`, content, config };
  });
}

module.exports = { routerConfig, renderRouterProfiles, renderRouterOverrides };
