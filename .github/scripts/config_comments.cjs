// 公共配置的中文说明。复用锁定的 yaml AST 定位，仅插入独立注释，不重排原文。
// YAML 节点 range / 注释 API：https://eemeli.org/yaml/#content-nodes
'use strict';
const YAML = require('yaml');
const assert = require('node:assert/strict');
const MARK = '配置说明：';
const FIELDS = {
  'unified-delay': '统一节点延迟测量口径；测速结果不等于实际业务吞吐。',
  profile: '保存策略选择和 fake-ip 映射，供客户端重启后恢复。',
  'store-selected': '保存手动选择；导入新配置后仍应核对客户端已保存的选项。',
  'store-fake-ip': '持久化虚拟 IP 与域名的映射。',
  'geo-auto-update': '允许内核自动更新 GEO 数据。',
  'geo-update-interval': 'GEO 数据更新间隔，单位小时。',
  'tcp-concurrent': '并发尝试域名解析得到的目标地址，缩短连接等待。',
  'find-process-mode': '进程匹配模式；路由器设为 off，不能识别远端手机的应用进程。',
  sniffer: '从支持的协议提取域名，辅助规则匹配；下面的跳过条件优先。',
  enable: '启用或关闭当前所属功能块。',
  'parse-pure-ip': '对缺少域名的 IP 流量尝试嗅探域名。',
  'skip-domain': '这些域名跳过嗅探，保留原始目标；不是整机直连白名单。',
  'skip-dst-address': '这些目标网段跳过嗅探，减少对局域网业务的干扰。',
  sniff: '按协议指定嗅探端口和目标改写行为。',
  HTTP: '明文 HTTP 嗅探参数。', TLS: 'TLS 握手域名嗅探参数；不解密 TLS 正文。',
  QUIC: 'QUIC 流量嗅探参数；可用性取决于内核支持。',
  ports: '此协议参与嗅探的端口或端口范围。',
  'override-destination': '是否用嗅探出的域名替换连接目标。',
  tun: '虚拟网卡接管参数；开关、网卡和接管范围仍需客户端配合。',
  stack: 'TUN 网络栈实现，须与客户端和系统兼容。',
  'auto-route': '让客户端为 TUN 自动设置路由。',
  'auto-detect-interface': '自动检测用于出站的网络接口。',
  'dns-hijack': '将匹配的 DNS 请求交给内核；any:53 与 tcp://any:53 分别覆盖 UDP/TCP。',
  'strict-route': '启用严格路由；具体影响依系统和客户端实现。',
  'route-exclude-address': '这些目标网段不进入 TUN 接管；此处不是普通策略组分流。',
  dns: 'DNS 解析、缓存、fake-ip 和域名专用解析器设置。',
  listen: '内核 DNS 的监听地址与端口，不是上游解析器。',
  ipv6: '当前作用域的 IPv6 开关；DNS 与系统接管开关不能混为一谈。',
  'prefer-h3': '是否优先使用 HTTP/3 连接 DoH 服务器。',
  'respect-rules': 'DNS 上游连接遵循路由规则；节点域名须有独立解析器以避免递归。',
  'follow-rule': 'Stash 原生 DNS 跟随规则选路，不使用 Mihomo 的 #策略组语法。',
  'use-system-hosts': '是否使用系统 hosts 中的映射。',
  'cache-algorithm': 'DNS 缓存淘汰算法。',
  'enhanced-mode': '增强解析模式；fake-ip 返回虚拟地址，再由内核关联真实域名。',
  'fake-ip-range': 'IPv4 虚拟地址池，不是真实公网地址段。',
  'fake-ip-range6': 'IPv6 虚拟地址池；实际可用性还受宿主 IPv6 与客户端接管影响。',
  'fake-ip-filter-mode': 'fake-ip 过滤列表模式；blacklist 中的匹配项返回真实地址。',
  'fake-ip-filter': '按过滤模式决定是否使用 fake-ip；不直接决定连接的代理出口。',
  'default-nameserver': '启动解析器，用于解析 DNS 上游的域名。',
  nameserver: '常规解析器；更具体的 nameserver-policy 可以优先接管。',
  fallback: '备用解析器；空数组表示当前配置不启用此列表。',
  'fallback-filter': '控制主/备用解析结果的选择条件。',
  geoip: '是否按 GeoIP 条件筛选 DNS 结果。',
  'geoip-code': 'GeoIP 筛选使用的地区代码。',
  ipcidr: '参与当前 DNS 结果筛选的 IP 网段。',
  domain: '参与当前 DNS 筛选的域名条件。', geosite: '参与当前 DNS 筛选的域名集合。',
  'proxy-server-nameserver': '专门解析代理节点域名，避免解析依赖尚未建立的节点连接。',
  'direct-nameserver': '为直连目标提供解析器。',
  'direct-nameserver-follow-policy': '直连目标解析仍允许采用域名专用 nameserver-policy。',
  'nameserver-policy': '域名专用 DNS；保留顺序，专属业务应先于通用集合。',
  'proxy-groups': '策略组及其候选成员；订阅节点由客户端另行提供。',
  name: '当前策略组或覆写的显示名称。', summary: '覆写用途说明，不参与分流。',
  type: '对象类型：select 手选，url-test 自动测速，http 从远端下载规则。',
  proxies: '候选策略/节点列表；手选组首次默认取首项，已有保存选择可能优先。',
  url: '组内为测速端点，规则提供器内为下载地址；端点可达不代表业务解锁。',
  'expected-status': '测速成功所需的 HTTP 状态码。',
  timeout: 'Mihomo/Stash 此处超时单位为毫秒；超时不等于所有业务均不可用。',
  icon: '界面图标地址，不参与规则匹配。',
  'include-all': '纳入客户端提供的全部节点，再按筛选条件取候选。',
  'empty-fallback': '候选为空时使用此策略；REJECT 表示拒绝，避免静默改为直连。',
  filter: '按节点名称正则筛选候选；名称匹配不能证明节点真实出口地区。',
  'exclude-filter': '从候选中排除匹配此正则的节点。',
  interval: '定期测速或规则更新的间隔，单位秒，取决于所属对象。',
  tolerance: 'url-test 切换容差，单位毫秒；减少微小延迟波动引起的切换。',
  lazy: '懒测速；仅在组被使用时执行周期检测，具体行为依客户端。',
  hidden: '隐藏界面中的组，但仍可被其他策略引用。',
  'rule-providers': '远程规则集合的格式、下载与缓存设置。',
  behavior: '集合语义：domain 域名、ipcidr 网段、classical 完整规则。',
  format: '规则文件编码格式，须与远端内容一致。',
  'size-limit': '规则下载大小上限，单位字节。',
  proxy: '下载该规则集合时使用的出站策略。',
  path: '规则缓存相对路径；不同格式和来源应避免共用缓存。',
  rules: '自上而下匹配，首次有效命中决定策略；具体例外应放在通用兜底之前。',
  '<<': '合并 YAML 锚点模板，当前对象显式字段覆盖模板中的同名字段。',
  'bypass-system': '采用 Shadowrocket 的系统旁路行为；不等同于业务规则全部直连。',
  'skip-proxy': '这些地址或主机不经过系统代理，TUN 接管另行判断。',
  'bypass-tun': '这些目标网段绕过 Shadowrocket TUN。',
  'dns-server': 'Shadowrocket 主解析器列表。',
  'fallback-dns-server': 'Shadowrocket 备用解析器；#proxy 表示经代理建立解析连接。',
  'proxy-dns-server': 'Shadowrocket 专门解析代理节点域名的解析器。',
  'prefer-ipv6': '双栈解析结果中是否优先尝试 IPv6 地址。',
  'dns-fallback-system': '是否允许回退系统 DNS；false 禁止此项回退。',
  'update-url': '配置更新地址；留空表示本文件不指定自动更新源。',
};

function dnsComment(key) {
  const scope = key.startsWith('rule-set:') || key.startsWith('geosite:') ? '命中域名集合 ' + key
    : key.startsWith('+.') ? '域名 ' + key.slice(2) + ' 及其子域'
    : key.startsWith('.') ? '域名 ' + key.slice(1) + ' 的子域'
    : '精确域名 ' + key;
  return scope + ' 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。';
}
function fieldComment(key, parent = '') {
  if (parent === 'nameserver-policy') return dnsComment(key);
  if (parent === 'rule-providers') return '规则集合 ' + key + '；路由与 DNS 中引用该名称，下载内容随上游更新。';
  return FIELDS[key] || '';
}

function ruleComment(rule) {
  const parts = rule.split(',');
  const type = parts[0], payload = parts[1];
  const noResolve = parts.at(-1) === 'no-resolve';
  const target = parts[noResolve ? parts.length - 2 : parts.length - 1];
  const match = {
    DOMAIN: '精确域名 ' + payload, 'DOMAIN-SUFFIX': '根域名 ' + payload + ' 及其子域',
    'DOMAIN-KEYWORD': '域名包含 ' + payload, 'PROCESS-NAME': '进程名/应用包名 ' + payload,
    'PROCESS-PATH': '进程路径 ' + payload, GEOIP: '目标 IP 属于 GeoIP ' + payload,
    GEOSITE: '域名属于 geosite ' + payload, 'IP-CIDR': '目标 IPv4 网段 ' + payload,
    'IP-CIDR6': '目标 IPv6 网段 ' + payload, 'IP-ASN': '目标 IP 属于 ASN ' + payload,
    'RULE-SET': '命中规则集合 ' + payload, 'DOMAIN-SET': '命中域名集合 ' + payload,
    NETWORK: '传输协议为 ' + payload,
    'DST-PORT': '目标端口为 ' + payload,
    AND: '同时满足括号内条件（NOT 子条件须不匹配）',
    OR: '满足括号内任一条件', NOT: '不满足括号内条件',
    MATCH: '此前均未有效命中的请求', FINAL: '此前均未有效命中的请求',
  }[type];
  assert(match, '缺少规则类型注释：' + type);
  const action = target === 'DIRECT' ? '直连' : target === 'REJECT' ? '拒绝连接' : '交给「' + target + '」策略';
  return match + ' → ' + action + '。' + (noResolve ? 'no-resolve：不为本条 IP 匹配额外解析域名。' : '');
}

// 根据 AST 字节位置在原行之前插入说明，保留锚点、引号、#!replace 和原注释。
function annotateYaml(text) {
  text = text.replace(/\r\n/g, '\n');
  const doc = YAML.parseDocument(text, { merge: true, uniqueKeys: true });
  assert.equal(doc.errors.length, 0);
  const notes = new Map();
  function add(node, note) {
    if (!node?.range || !note) return;
    const start = text.lastIndexOf('\n', node.range[0] - 1) + 1;
    const list = notes.get(start) || [];
    if (!list.includes(note)) list.push(note);
    notes.set(start, list);
  }
  function walk(node, parent = '') {
    if (YAML.isMap(node)) for (const pair of node.items) {
      const key = String(pair.key.value);
      add(pair.key, fieldComment(key, parent));
      walk(pair.value, key);
    }
    else if (YAML.isSeq(node)) for (const item of node.items) {
      if (parent === 'rules' && YAML.isScalar(item)) add(item, ruleComment(String(item.value)));
      else walk(item, parent);
    }
  }
  walk(doc.contents);
  for (const [start, list] of [...notes].sort((a, b) => b[0] - a[0])) {
    const indent = text.slice(start).match(/^ */)[0];
    const previous = text.slice(0, start).trimEnd().split('\n').at(-1) || '';
    if (previous.trim().startsWith('# ' + MARK)) continue;
    text = text.slice(0, start) + indent + '# ' + MARK + list.join(' ') + '\n' + text.slice(start);
  }
  return text;
}

function groupComment(name, body) {
  const type = body.split(',')[0].trim();
  return '策略组「' + name + '」：' + (type === 'url-test' ? '按测速选择候选，interval 为秒、tolerance 为毫秒。'
    : '手动选择候选，policy-select-name 指定初始首选；保存选择可能优先。')
    + 'policy-regex-filter 按节点名称筛选；timeout 为秒，测速不证明解锁。';
}
function annotateShadow(text) {
  let section = '';
  return text.replace(/\r\n/g, '\n').split('\n').map((line, index, lines) => {
    if (/^\[.*\]$/.test(line)) section = line;
    if (!line.trim() || line.trim().startsWith('#') || line.startsWith('[')) return line;
    if (lines[index - 1]?.startsWith('# ' + MARK)) return line;
    const [key, ...rest] = line.split('=');
    const note = section === '[Rule]' ? ruleComment(line.trim())
      : section === '[Proxy Group]' ? groupComment(key.trim(), rest.join('=').trim())
      : fieldComment(key.trim());
    return note ? '# ' + MARK + note + '\n' + line : line;
  }).join('\n');
}

// 规则文本改为带行间 JS 注释的字符串数组；join 后的 RULES_TEXT 字节保持不变。
function annotateJs(text) {
  text = text.replace(/\r\n/g, '\n').replace(/const RULES_TEXT = `([\s\S]*?)`;/, (_, body) =>
    'const RULES_TEXT = [\n' + body.split('\n').map(line =>
      (line.trim() ? '  // ' + MARK + ruleComment(line.trim()) + '\n' : '') + '  ' + JSON.stringify(line) + ',').join('\n') + '\n].join("\\n");');
  return text.split('\n').map((line, index, lines) => {
    if (lines[index - 1]?.trim().startsWith('// ' + MARK)) return line;
    const group = line.match(/^(\s*)\{\s*name:\s*"([^"]+)"/);
    if (group) {
      const preferred = line.match(/proxies:\s*\["([^"]+)"/);
      const note = '策略组「' + group[2] + '」；' + (preferred ? '首次默认候选为「' + preferred[1] + '」，已保存选择可能优先。' : '按当前行正则筛选订阅候选，节点名称不证明真实出口。');
      return group[1] + '// ' + MARK + note + '\n' + line;
    }
    const functions = {
      applyEnvironment: '将所在地 DNS 和默认选项应用到共同配置，随后进行分组精简。',
      consolidateGroups: '按环境精简策略组，并同步规则与 DNS 的策略引用；保留匹配条件及顺序。',
      tuneMihomo: '添加 Mihomo 专属 AI 分组和 DNS 调优；不修改订阅节点。',
      main: '客户端覆写入口：接收现有配置并返回合并结果；后续步骤可能由客户端再次合并。',
      deepClone: '复制普通 JSON 配置对象，避免不同调用共享可变状态。',
    };
    const fn = line.match(/^function (\w+)\(/);
    if (fn && functions[fn[1]]) return '// ' + MARK + functions[fn[1]] + '\n' + line;
    if (line.startsWith('const ENVIRONMENT =')) return '// ' + MARK + '所在地差异：DNS 与默认候选；不含私人节点或订阅。\n' + line;
    const match = line.match(/^(\s*)(?:"([^"\n]+)"|([\w-]+)):\s/);
    if (!match) return line;
    const key = match[2] || match[3];
    const note = fieldComment(key) || (/^(rule-set:|geosite:)|\./.test(key) ? dnsComment(key) : '业务分类「' + key + '」的公共配置项。');
    return match[1] + '// ' + MARK + note + '\n' + line;
  }).join('\n');
}

module.exports = { MARK, FIELDS, fieldComment, ruleComment, annotateYaml, annotateShadow, annotateJs };
