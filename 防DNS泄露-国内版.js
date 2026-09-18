// 国内使用入口；由 .github/scripts/build_profiles.cjs 生成，请勿手改。
// 国内版 / 国外版只选一套、一个格式；不要叠加旧国内补充层或内部共同源码。TUN / 顶层 IPv6 / 运行模式由客户端决定；DNS 双栈 fake-ip 由本配置提供。
const applySharedConfig = (() => {
/**
 * 文件说明：国内版 / 国外版 JavaScript 覆写的内部共同源码，非独立导入入口。
 * 维护口径：本文件必须与 .github/config/shared.yaml 的关键配置保持同步，CI 会自动比对。
 * 注释只解释结构，不改变实际覆写逻辑。
 */

/**
 * Shared JavaScript source for generated regional overrides.
 * Synchronized with .github/config/shared.yaml.
 * Entry point: main(config) must return the modified config.
 */

// 远程 domain rule-provider 的通用模板。
const META_DOMAIN_PROVIDER = {
  // 配置说明：对象类型：select 手选，url-test 自动测速，http 从远端下载规则。
  type: "http",
  // 配置说明：集合语义：domain 域名、ipcidr 网段、classical 完整规则。
  behavior: "domain",
  // 配置说明：规则文件编码格式，须与远端内容一致。
  format: "mrs",
  // 配置说明：定期测速或规则更新的间隔，单位秒，取决于所属对象。
  interval: 86400,
  // 配置说明：规则下载大小上限，单位字节。
  "size-limit": 4194304,
  // 配置说明：下载该规则集合时使用的出站策略。
  proxy: "节点选择",
};


// 自动测速组通用模板：全局使用中立端点，地区组覆盖为对应地区端点。
const URLTEST_BASE = {
  // 配置说明：对象类型：select 手选，url-test 自动测速，http 从远端下载规则。
  type: "url-test",
  // 配置说明：定期测速或规则更新的间隔，单位秒，取决于所属对象。
  interval: 300,
  // 配置说明：url-test 切换容差，单位毫秒；减少微小延迟波动引起的切换。
  tolerance: 50,
  // 配置说明：组内为测速端点，规则提供器内为下载地址；端点可达不代表业务解锁。
  url: "https://cp.cloudflare.com/generate_204",
  // 配置说明：测速成功所需的 HTTP 状态码。
  "expected-status": 204,
  // 配置说明：懒测速；仅在组被使用时执行周期检测，具体行为依客户端。
  lazy: false,
  // 配置说明：隐藏界面中的组，但仍可被其他策略引用。
  hidden: true,
  // 配置说明：纳入客户端提供的全部节点，再按筛选条件取候选。
  "include-all": true,
  // 配置说明：候选为空时使用此策略；REJECT 表示拒绝，避免静默改为直连。
  "empty-fallback": "REJECT",
  // 配置说明：Mihomo/Stash 此处超时单位为毫秒；超时不等于所有业务均不可用。
  timeout: 10000,
  // 配置说明：按节点名称正则筛选候选；名称匹配不能证明节点真实出口地区。
  filter: "(?i)^(?![ ]*(?:Traffic|Expire|Expiry|Expiration)[ ]*[:：])(?!.*(?:官网|套餐|流量|异常|剩余|到期|过期|更新|联系|群))(?!(?:.*(?:回国|港广|港沪|港深|沪港|深港|广中)|(?!.*(?:广港|香港|Hong ?Kong|🇭🇰|(^|[^A-Z])HK([^A-Z]|$)|(^|[^A-Z])HKG([^A-Z]|$)|广台|台湾|台灣|Tai ?Wan|Taiwan|🇹🇼|(^|[^A-Z])TW([^A-Z]|$)|(^|[^A-Z])TWN([^A-Z]|$)|(^|[^A-Z])TPE([^A-Z]|$)|广日|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|Japan|🇯🇵|(^|[^A-Z])JP([^A-Z]|$)|(^|[^A-Z])NRT([^A-Z]|$)|(^|[^A-Z])HND([^A-Z]|$)|(^|[^A-Z])KIX([^A-Z]|$)|广新|新加坡|坡县|狮城|Singapore|🇸🇬|(^|[^A-Z])SG([^A-Z]|$)|(^|[^A-Z])SGP([^A-Z]|$)|(^|[^A-Z])SIN([^A-Z]|$)|广美|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|United ?States|🇺🇸|(^|[^A-Z])US([^A-Z]|$)|(^|[^A-Z])USA([^A-Z]|$)|广韩|韩国|韓國|首尔|春川|Korea|🇰🇷|(^|[^A-Z])KR([^A-Z]|$)|(^|[^A-Z])ICN([^A-Z]|$)|(^|[^A-Z])SEL([^A-Z]|$)|越南|Vietnam|Ho ?Chi ?Minh|胡志明|河内|Hanoi|🇻🇳|(^|[^A-Z])VN([^A-Z]|$)|(^|[^A-Z])HCM([^A-Z]|$)|(^|[^A-Z])HCMC([^A-Z]|$)|(^|[^A-Z])SGN([^A-Z]|$)|(^|[^A-Z])HAN([^A-Z]|$)|澳门|澳門|Macao|Macau|🇲🇴|(^|[^A-Z])MO([^A-Z]|$)|(^|[^A-Z])MFM([^A-Z]|$))).*(?:中国|上海|北京|广州|深圳|江苏|浙江|🇨🇳|(^|[^A-Z])China([^A-Z]|$)|(^|[^A-Z])CN(?!2(?:[^0-9]|$))([^A-Z]|$)))).*$",
  // 配置说明：界面图标地址，不参与规则匹配。
  icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/speed.svg",
};


// 主覆写对象：包含全局、sniffer、TUN、DNS 等基础配置。
const OVERRIDE = {
  // 配置说明：统一节点延迟测量口径；测速结果不等于实际业务吞吐。
  "unified-delay": true,
  // 配置说明：保存策略选择和 fake-ip 映射，供客户端重启后恢复。
  profile: {
    // 配置说明：保存手动选择；导入新配置后仍应核对客户端已保存的选项。
    "store-selected": true,
    // 配置说明：持久化虚拟 IP 与域名的映射。
    "store-fake-ip": true,
  },
  // 配置说明：允许内核自动更新 GEO 数据。
  "geo-auto-update": true,
  // 配置说明：GEO 数据更新间隔，单位小时。
  "geo-update-interval": 24,
  // 配置说明：并发尝试域名解析得到的目标地址，缩短连接等待。
  "tcp-concurrent": true,
  // 配置说明：从支持的协议提取域名，辅助规则匹配；下面的跳过条件优先。
  sniffer: {
    // 配置说明：启用或关闭当前所属功能块。
    enable: true,
    // 配置说明：对缺少域名的 IP 流量尝试嗅探域名。
    "parse-pure-ip": true,
    // 这些域名依赖真实 DNS / 局域网 / 推送 / 时间服务，跳过嗅探避免目标被误改写。
    // 配置说明：这些域名跳过嗅探，保留原始目标；不是整机直连白名单。
    "skip-domain": [
      "+.lan",
      "+.local",
      "+.home.arpa",
      "+.localdomain",
      "router.asus.com",
      "tplogin.cn",
      "miwifi.com",
      "tendawifi.com",
      "time.*.com",
      "time.*.gov",
      "time.windows.com",
      "pool.ntp.org",
      "+.ntp.org",
      "+.push.apple.com",
      "courier.push.apple.com",
      "localhost.ptlogin2.qq.com",
      "localhost.sec.qq.com",
      "localhost.work.weixin.qq.com",
    ],
    // 配置说明：这些目标网段跳过嗅探，减少对局域网业务的干扰。
    "skip-dst-address": [
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "100.64.0.0/10",
      "169.254.0.0/16",
      "fc00::/7",
      "fe80::/10",
    ],
    // 配置说明：按协议指定嗅探端口和目标改写行为。
    sniff: {
      // 配置说明：明文 HTTP 嗅探参数。
      HTTP: {
        // 配置说明：此协议参与嗅探的端口或端口范围。
        ports: ["80", "8080-8880"],
        // 配置说明：是否用嗅探出的域名替换连接目标。
        "override-destination": true,
      },
      // 配置说明：TLS 握手域名嗅探参数；不解密 TLS 正文。
      TLS: {
        // 配置说明：此协议参与嗅探的端口或端口范围。
        ports: [443, 8443],
      },
      // 配置说明：QUIC 流量嗅探参数；可用性取决于内核支持。
      QUIC: {
        // 配置说明：此协议参与嗅探的端口或端口范围。
        ports: [443, 8443],
      },
    },
  },
  // 配置说明：虚拟网卡接管参数；开关、网卡和接管范围仍需客户端配合。
  tun: {
    // 配置说明：TUN 网络栈实现，须与客户端和系统兼容。
    stack: "mixed",
    // 配置说明：让客户端为 TUN 自动设置路由。
    "auto-route": true,
    // 配置说明：自动检测用于出站的网络接口。
    "auto-detect-interface": true,
    // 配置说明：将匹配的 DNS 请求交给内核；any:53 与 tcp://any:53 分别覆盖 UDP/TCP。
    "dns-hijack": ["any:53", "tcp://any:53"],
    // 配置说明：启用严格路由；具体影响依系统和客户端实现。
    "strict-route": true,
    // 配置说明：这些目标网段不进入 TUN 接管；此处不是普通策略组分流。
    "route-exclude-address": [
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "100.64.0.0/10",
      "169.254.0.0/16",
      "fc00::/7",
      "fe80::/10",
    ],
  },
  // 配置说明：DNS 解析、缓存、fake-ip 和域名专用解析器设置。
  dns: {
    // 配置说明：启用或关闭当前所属功能块。
    enable: true,
    // 配置说明：内核 DNS 的监听地址与端口，不是上游解析器。
    listen: "127.0.0.1:1053",
    // 两地共用双栈 fake-ip；顶层 IPv6 / TUN 开关仍由客户端决定。
    // 配置说明：当前作用域的 IPv6 开关；DNS 与系统接管开关不能混为一谈。
    ipv6: true,
    // 配置说明：是否优先使用 HTTP/3 连接 DoH 服务器。
    "prefer-h3": false,
    // 配置说明：DNS 上游连接遵循路由规则；节点域名须有独立解析器以避免递归。
    "respect-rules": true,
    // 配置说明：是否使用系统 hosts 中的映射。
    "use-system-hosts": false,
    // 配置说明：DNS 缓存淘汰算法。
    "cache-algorithm": "arc",
    // 配置说明：增强解析模式；fake-ip 返回虚拟地址，再由内核关联真实域名。
    "enhanced-mode": "fake-ip",
    // 配置说明：IPv4 虚拟地址池，不是真实公网地址段。
    "fake-ip-range": "198.18.0.1/16",
    // 配置说明：IPv6 虚拟地址池；实际可用性还受宿主 IPv6 与客户端接管影响。
    "fake-ip-range6": "fdfe:dcba:9876::1/64",
    // blacklist：匹配 fake-ip-filter 的域名返回真实 IP，其余域名返回 fake-ip。
    // 配置说明：fake-ip 过滤列表模式；blacklist 中的匹配项返回真实地址。
    "fake-ip-filter-mode": "blacklist",
    // 配置说明：按过滤模式决定是否使用 fake-ip；不直接决定连接的代理出口。
    "fake-ip-filter": [
      "+.lan",
      "+.local",
      "+.home.arpa",
      "+.localdomain",
      "router.asus.com",
      "tplogin.cn",
      "miwifi.com",
      "tendawifi.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "+.push.apple.com",
      "courier.push.apple.com",
      "localhost.ptlogin2.qq.com",
      "localhost.sec.qq.com",
      "+.in-addr.arpa",
      "+.ip6.arpa",
      "time.*.com",
      "time.*.gov",
      "time.windows.com",
      "pool.ntp.org",
      "+.ntp.org",
      "+.stun.*",
      "stun.*.*",
      "localhost.work.weixin.qq.com",
    ],
    // 配置说明：启动解析器，用于解析 DNS 上游的域名。
    "default-nameserver": [
      "https://223.5.5.5/dns-query",
      "https://1.1.1.1/dns-query",
    ],
    // 配置说明：常规解析器；更具体的 nameserver-policy 可以优先接管。
    nameserver: [
      "https://223.5.5.5/dns-query",
      "https://doh.pub/dns-query",
    ],
    // 配置说明：备用解析器；空数组表示当前配置不启用此列表。
    fallback: [
      "https://1.1.1.1/dns-query#节点选择",
      "https://8.8.8.8/dns-query#节点选择",
    ],
    // 配置说明：控制主/备用解析结果的选择条件。
    "fallback-filter": {
      // 配置说明：是否按 GeoIP 条件筛选 DNS 结果。
      geoip: true,
      // 配置说明：GeoIP 筛选使用的地区代码。
      "geoip-code": "CN",
      // 配置说明：参与当前 DNS 结果筛选的 IP 网段。
      ipcidr: ["240.0.0.0/4"],
    },
    // 配置说明：专门解析代理节点域名，避免解析依赖尚未建立的节点连接。
    "proxy-server-nameserver": [
      "https://1.1.1.1/dns-query#DIRECT",
      "https://223.5.5.5/dns-query#DIRECT",
    ],
    // 配置说明：为直连目标提供解析器。
    "direct-nameserver": [
      "https://1.1.1.1/dns-query",
      "https://8.8.8.8/dns-query",
    ],
    // 配置说明：直连目标解析仍允许采用域名专用 nameserver-policy。
    "direct-nameserver-follow-policy": true,
    // 配置说明：域名专用 DNS；保留顺序，专属业务应先于通用集合。
    "nameserver-policy": {
      // 根域名与子域名分开写，与 Sparkle YAML 覆写兼容。
      // 配置说明：命中域名集合 rule-set:private 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:private": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 jspoo.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "jspoo.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 jspoo.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".jspoo.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 tampermonkey.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "tampermonkey.net": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 tampermonkey.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".tampermonkey.net": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 aweme.snssdk.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "aweme.snssdk.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 is.snssdk.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "is.snssdk.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 getui.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "getui.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 getui.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".getui.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 getui.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "getui.net": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 getui.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".getui.net": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 gepush.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gepush.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 gepush.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gepush.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 igexin.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "igexin.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 igexin.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".igexin.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 aliapp.org 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "aliapp.org": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 aliapp.org 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".aliapp.org": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 yhglobal.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "yhglobal.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 yhglobal.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".yhglobal.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 download.nvidia.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "download.nvidia.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 download.nvidia.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".download.nvidia.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 download.nvidia.cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "download.nvidia.cn": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 download.nvidia.cn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".download.nvidia.cn": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 ota.nvidia.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ota.nvidia.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 gfwsl.geforce.cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gfwsl.geforce.cn": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 windowsupdate.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "windowsupdate.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 windowsupdate.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".windowsupdate.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 download.windowsupdate.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "download.windowsupdate.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 download.windowsupdate.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".download.windowsupdate.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "mp.microsoft.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".mp.microsoft.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 delivery.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "delivery.mp.microsoft.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 delivery.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".delivery.mp.microsoft.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 dl.delivery.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "dl.delivery.mp.microsoft.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：域名 dl.delivery.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".dl.delivery.mp.microsoft.com": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：精确域名 googleapis.cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "googleapis.cn": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：域名 googleapis.cn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".googleapis.cn": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 临时隔离上游误收的公共后缀；不强制业务直连，具体服务 DNS 仍优先。
      // 配置说明：精确域名 in.th 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "in.th": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：域名 in.th 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".in.th": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:openai 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:openai": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:anthropic 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:anthropic": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:google-gemini 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:google-gemini": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:github-copilot 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:github-copilot": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:steam-cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:steam-cn": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：命中域名集合 rule-set:category-games-cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:category-games-cn": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：命中域名集合 rule-set:wechat 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:wechat": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：命中域名集合 rule-set:alipay 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:alipay": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // Microsoft 集合包含普通 GitHub 域名；GitHub 须先匹配，Copilot 仍由前面的 AI 策略接管。
      // 配置说明：命中域名集合 rule-set:github 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:github": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:microsoft 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:microsoft": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：命中域名集合 rule-set:google 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:google": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:youtube 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:youtube": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
      // 配置说明：命中域名集合 rule-set:cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:cn": ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"],
      // 配置说明：命中域名集合 rule-set:geolocation-!cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:geolocation-!cn": ["https://1.1.1.1/dns-query#节点选择", "https://8.8.8.8/dns-query#节点选择"],
    },
  },
  // 配置说明：策略组及其候选成员；订阅节点由客户端另行提供。
  "proxy-groups": [],
  // 配置说明：远程规则集合的格式、下载与缓存设置。
  "rule-providers": {},
  // 配置说明：自上而下匹配，首次有效命中决定策略；具体例外应放在通用兜底之前。
  rules: [],
};


// 策略组：与 YAML 的 proxy-groups 保持同步；select 组只提供按需测速地址。
OVERRIDE["proxy-groups"] = [
  // 配置说明：策略组「节点选择」；首次默认候选为「自动选择」，已保存选择可能优先。
  { name: "节点选择", type: "select", proxies: ["自动选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "中国-自动", "中国节点", "全部节点", "DIRECT"], url: "https://cp.cloudflare.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/adjust.svg" },
  // 配置说明：策略组「漏网之鱼」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "漏网之鱼", type: "select", proxies: ["节点选择", "自动选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "中国-自动", "中国节点", "DIRECT", "全部节点"], url: "https://www.gstatic.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/fish.svg" },
  // 配置说明：策略组「越南服务」；首次默认候选为「DIRECT」，已保存选择可能优先。
  { name: "越南服务", type: "select", proxies: ["DIRECT", "越南-自动", "越南节点", "新加坡-自动", "新加坡节点", "香港-自动", "香港节点", "节点选择"], url: "https://www.google.com.vn/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/vn.png" },
  // 配置说明：策略组「国内服务」；首次默认候选为「DIRECT」，已保存选择可能优先。
  { name: "国内服务", type: "select", proxies: ["DIRECT", "中国-自动", "中国节点", "香港-自动", "香港节点", "节点选择"], url: "https://connectivitycheck.platform.hicloud.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/cn.png" },
  // 配置说明：策略组「GitHub」；首次默认候选为「香港-自动」，已保存选择可能优先。
  { name: "GitHub", type: "select", proxies: ["香港-自动", "新加坡-自动", "日本-自动", "美国-自动", "香港节点", "新加坡节点", "日本节点", "美国节点", "节点选择", "DIRECT"], url: "https://github.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://github.githubassets.com/favicons/favicon.svg" },
  // 配置说明：策略组「YouTube」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "YouTube", type: "select", proxies: ["节点选择", "自动选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "DIRECT"], url: "https://www.youtube.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/youtube.svg" },
  // 配置说明：策略组「Netflix」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "Netflix", type: "select", proxies: ["节点选择", "自动选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "DIRECT"], url: "https://assets.nflxext.com/ffe/siteui/common/icons/nficon2016.ico", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/xiaolin-007/clash@main/icon/netflix.svg" },
  // 配置说明：策略组「AI」；首次默认候选为「美国-自动」，已保存选择可能优先。
  { name: "AI", type: "select", proxies: ["美国-自动", "日本-自动", "新加坡-自动", "香港-自动", "美国节点", "日本节点", "新加坡节点", "香港节点", "节点选择", "DIRECT"], url: "https://auth.openai.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/chatgpt.svg" },
  // 配置说明：策略组「谷歌服务」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "谷歌服务", type: "select", proxies: ["节点选择", "新加坡节点", "日本节点", "香港节点", "美国节点", "新加坡-自动", "日本-自动", "香港-自动", "美国-自动", "自动选择", "DIRECT"], url: "https://www.google.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/google.svg" },
  // 配置说明：策略组「电报消息」；首次默认候选为「新加坡-自动」，已保存选择可能优先。
  { name: "电报消息", type: "select", proxies: ["新加坡-自动", "自动选择", "节点选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "中国-自动", "中国节点", "DIRECT"], url: "https://telegram.org/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/telegram.svg" },
  // 配置说明：策略组「Meta / X」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "Meta / X", type: "select", proxies: ["节点选择", "自动选择", "新加坡-自动", "新加坡节点", "香港-自动", "香港节点", "日本-自动", "日本节点", "美国-自动", "美国节点", "台湾-自动", "台湾节点", "DIRECT"], url: "https://www.facebook.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://www.facebook.com/favicon.ico" },
  // 配置说明：策略组「游戏平台」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "游戏平台", type: "select", proxies: ["节点选择", "DIRECT", "自动选择", "香港-自动", "香港节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点"], url: "https://cdn.cloudflare.steamstatic.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://store.steampowered.com/favicon.ico" },
  // 配置说明：策略组「微软服务」；首次默认候选为「DIRECT」，已保存选择可能优先。
  { name: "微软服务", type: "select", proxies: ["DIRECT", "香港-自动", "新加坡-自动", "中国-自动", "香港节点", "新加坡节点", "中国节点", "美国-自动", "美国节点", "节点选择"], url: "https://www.microsoft.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/microsoft.svg" },
  // 配置说明：策略组「TikTok」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "TikTok", type: "select", proxies: ["节点选择", "自动选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "DIRECT"], url: "https://www.tiktok.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/xiaolin-007/clash@main/icon/tiktok.svg" },
  // 配置说明：策略组「苹果服务」；首次默认候选为「DIRECT」，已保存选择可能优先。
  { name: "苹果服务", type: "select", proxies: ["DIRECT", "自动选择", "节点选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "中国-自动", "中国节点"], url: "https://captive.apple.com/hotspot-detect.html", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/apple.svg" },
  // 配置说明：策略组「Spotify」；首次默认候选为「节点选择」，已保存选择可能优先。
  { name: "Spotify", type: "select", proxies: ["节点选择", "自动选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "DIRECT"], url: "https://open.spotify.com/favicon.ico", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/xiaolin-007/clash@main/icon/spotify.svg" },
  // 配置说明：策略组「哔哩哔哩港澳台」；首次默认候选为「DIRECT」，已保存选择可能优先。
  { name: "哔哩哔哩港澳台", type: "select", proxies: ["DIRECT", "自动选择", "节点选择", "香港-自动", "香港节点", "台湾-自动", "台湾节点", "日本-自动", "日本节点", "新加坡-自动", "新加坡节点", "美国-自动", "美国节点", "韩国-自动", "韩国节点", "越南-自动", "越南节点", "中国-自动", "中国节点"], url: "https://p.bstarstatic.com/fe-static/deps/bilibili_tv.ico?v=1", "expected-status": 200, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/xiaolin-007/clash@main/icon/bilibili.svg" },
  // 配置说明：策略组「广告过滤」；首次默认候选为「REJECT」，已保存选择可能优先。
  { name: "广告过滤", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/bug.svg" },
  // 配置说明：策略组「全部节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "全部节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)^(?![ ]*(?:Traffic|Expire|Expiry|Expiration)[ ]*[:：])(?!.*(官网|套餐|流量|异常|剩余|到期|过期|更新|联系|群)).*$", url: "https://connectivitycheck.gstatic.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/adjust.svg" },
  { ...URLTEST_BASE, name: "自动选择" },
  // 配置说明：策略组「香港节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "香港节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(广港|香港|Hong ?Kong|🇭🇰|(^|[^A-Z])HK([^A-Z]|$)|(^|[^A-Z])HKG([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.com.hk/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/hk.png" },
  { ...URLTEST_BASE, name: "香港-自动", url: "https://www.google.com.hk/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(广港|香港|Hong ?Kong|🇭🇰|(^|[^A-Z])HK([^A-Z]|$)|(^|[^A-Z])HKG([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/hk.png" },
  // 配置说明：策略组「台湾节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "台湾节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(广台|台湾|台灣|Tai ?Wan|Taiwan|🇹🇼|(^|[^A-Z])TW([^A-Z]|$)|(^|[^A-Z])TWN([^A-Z]|$)|(^|[^A-Z])TPE([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.com.tw/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/tw.png" },
  { ...URLTEST_BASE, name: "台湾-自动", url: "https://www.google.com.tw/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(广台|台湾|台灣|Tai ?Wan|Taiwan|🇹🇼|(^|[^A-Z])TW([^A-Z]|$)|(^|[^A-Z])TWN([^A-Z]|$)|(^|[^A-Z])TPE([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/tw.png" },
  // 配置说明：策略组「日本节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "日本节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(广日|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|Japan|🇯🇵|(^|[^A-Z])JP([^A-Z]|$)|(^|[^A-Z])NRT([^A-Z]|$)|(^|[^A-Z])HND([^A-Z]|$)|(^|[^A-Z])KIX([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.co.jp/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/jp.png" },
  { ...URLTEST_BASE, name: "日本-自动", url: "https://www.google.co.jp/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(广日|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|Japan|🇯🇵|(^|[^A-Z])JP([^A-Z]|$)|(^|[^A-Z])NRT([^A-Z]|$)|(^|[^A-Z])HND([^A-Z]|$)|(^|[^A-Z])KIX([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/jp.png" },
  // 配置说明：策略组「新加坡节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "新加坡节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(广新|新加坡|坡县|狮城|Singapore|🇸🇬|(^|[^A-Z])SG([^A-Z]|$)|(^|[^A-Z])SGP([^A-Z]|$)|(^|[^A-Z])SIN([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.com.sg/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/sg.png" },
  { ...URLTEST_BASE, name: "新加坡-自动", url: "https://www.google.com.sg/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(广新|新加坡|坡县|狮城|Singapore|🇸🇬|(^|[^A-Z])SG([^A-Z]|$)|(^|[^A-Z])SGP([^A-Z]|$)|(^|[^A-Z])SIN([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/sg.png" },
  // 配置说明：策略组「美国节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "美国节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(广美|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|United ?States|🇺🇸|(^|[^A-Z])US([^A-Z]|$)|(^|[^A-Z])USA([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.com/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/us.png" },
  { ...URLTEST_BASE, name: "美国-自动", url: "https://www.google.com/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(广美|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|United ?States|🇺🇸|(^|[^A-Z])US([^A-Z]|$)|(^|[^A-Z])USA([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/us.png" },
  // 配置说明：策略组「韩国节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "韩国节点", type: "select", hidden: true, "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(广韩|韩国|韓國|首尔|春川|Korea|🇰🇷|(^|[^A-Z])KR([^A-Z]|$)|(^|[^A-Z])ICN([^A-Z]|$)|(^|[^A-Z])SEL([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.co.kr/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/kr.png" },
  { ...URLTEST_BASE, name: "韩国-自动", url: "https://www.google.co.kr/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(广韩|韩国|韓國|首尔|春川|Korea|🇰🇷|(^|[^A-Z])KR([^A-Z]|$)|(^|[^A-Z])ICN([^A-Z]|$)|(^|[^A-Z])SEL([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/kr.png" },
  // 配置说明：策略组「越南节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "越南节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)(越南|Vietnam|Ho ?Chi ?Minh|胡志明|河内|Hanoi|🇻🇳|(^|[^A-Z])VN([^A-Z]|$)|(^|[^A-Z])HCM([^A-Z]|$)|(^|[^A-Z])HCMC([^A-Z]|$)|(^|[^A-Z])SGN([^A-Z]|$)|(^|[^A-Z])HAN([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", url: "https://www.google.com.vn/generate_204", "expected-status": 204, timeout: 10000, icon: "https://flagcdn.com/w320/vn.png" },
  { ...URLTEST_BASE, name: "越南-自动", url: "https://www.google.com.vn/generate_204", "expected-status": 204, lazy: true, filter: "(?i)(越南|Vietnam|Ho ?Chi ?Minh|胡志明|河内|Hanoi|🇻🇳|(^|[^A-Z])VN([^A-Z]|$)|(^|[^A-Z])HCM([^A-Z]|$)|(^|[^A-Z])HCMC([^A-Z]|$)|(^|[^A-Z])SGN([^A-Z]|$)|(^|[^A-Z])HAN([^A-Z]|$))", "exclude-filter": "(?i)(回国|港广|港沪|港深|沪港|深港|广中)", icon: "https://flagcdn.com/w320/vn.png" },
  // 配置说明：策略组「中国节点」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "中国节点", type: "select", "include-all": true, "empty-fallback": "REJECT", filter: "(?i)^(?:.*(?:回国|港广|港沪|港深|沪港|深港|广中)|(?!.*(?:广港|香港|Hong ?Kong|🇭🇰|(^|[^A-Z])HK([^A-Z]|$)|(^|[^A-Z])HKG([^A-Z]|$)|广台|台湾|台灣|Tai ?Wan|Taiwan|🇹🇼|(^|[^A-Z])TW([^A-Z]|$)|(^|[^A-Z])TWN([^A-Z]|$)|(^|[^A-Z])TPE([^A-Z]|$)|广日|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|Japan|🇯🇵|(^|[^A-Z])JP([^A-Z]|$)|(^|[^A-Z])NRT([^A-Z]|$)|(^|[^A-Z])HND([^A-Z]|$)|(^|[^A-Z])KIX([^A-Z]|$)|广新|新加坡|坡县|狮城|Singapore|🇸🇬|(^|[^A-Z])SG([^A-Z]|$)|(^|[^A-Z])SGP([^A-Z]|$)|(^|[^A-Z])SIN([^A-Z]|$)|广美|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|United ?States|🇺🇸|(^|[^A-Z])US([^A-Z]|$)|(^|[^A-Z])USA([^A-Z]|$)|广韩|韩国|韓國|首尔|春川|Korea|🇰🇷|(^|[^A-Z])KR([^A-Z]|$)|(^|[^A-Z])ICN([^A-Z]|$)|(^|[^A-Z])SEL([^A-Z]|$)|越南|Vietnam|Ho ?Chi ?Minh|胡志明|河内|Hanoi|🇻🇳|(^|[^A-Z])VN([^A-Z]|$)|(^|[^A-Z])HCM([^A-Z]|$)|(^|[^A-Z])HCMC([^A-Z]|$)|(^|[^A-Z])SGN([^A-Z]|$)|(^|[^A-Z])HAN([^A-Z]|$)|澳门|澳門|Macao|Macau|🇲🇴|(^|[^A-Z])MO([^A-Z]|$)|(^|[^A-Z])MFM([^A-Z]|$))).*(?:中国|上海|北京|广州|深圳|江苏|浙江|🇨🇳|(^|[^A-Z])China([^A-Z]|$)|(^|[^A-Z])CN(?!2(?:[^0-9]|$))([^A-Z]|$))).*$", url: "https://www.baidu.com", "expected-status": 200, timeout: 10000, icon: "https://flagcdn.com/w320/cn.png" },
  // 配置说明：策略组「中国-自动」；按当前行正则筛选订阅候选，节点名称不证明真实出口。
  { name: "中国-自动", type: "url-test", interval: 300, tolerance: 50, url: "https://www.baidu.com", "expected-status": 200, lazy: true, hidden: true, "include-all": true, "empty-fallback": "REJECT", timeout: 10000, filter: "(?i)^(?:.*(?:回国|港广|港沪|港深|沪港|深港|广中)|(?!.*(?:广港|香港|Hong ?Kong|🇭🇰|(^|[^A-Z])HK([^A-Z]|$)|(^|[^A-Z])HKG([^A-Z]|$)|广台|台湾|台灣|Tai ?Wan|Taiwan|🇹🇼|(^|[^A-Z])TW([^A-Z]|$)|(^|[^A-Z])TWN([^A-Z]|$)|(^|[^A-Z])TPE([^A-Z]|$)|广日|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|Japan|🇯🇵|(^|[^A-Z])JP([^A-Z]|$)|(^|[^A-Z])NRT([^A-Z]|$)|(^|[^A-Z])HND([^A-Z]|$)|(^|[^A-Z])KIX([^A-Z]|$)|广新|新加坡|坡县|狮城|Singapore|🇸🇬|(^|[^A-Z])SG([^A-Z]|$)|(^|[^A-Z])SGP([^A-Z]|$)|(^|[^A-Z])SIN([^A-Z]|$)|广美|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|United ?States|🇺🇸|(^|[^A-Z])US([^A-Z]|$)|(^|[^A-Z])USA([^A-Z]|$)|广韩|韩国|韓國|首尔|春川|Korea|🇰🇷|(^|[^A-Z])KR([^A-Z]|$)|(^|[^A-Z])ICN([^A-Z]|$)|(^|[^A-Z])SEL([^A-Z]|$)|越南|Vietnam|Ho ?Chi ?Minh|胡志明|河内|Hanoi|🇻🇳|(^|[^A-Z])VN([^A-Z]|$)|(^|[^A-Z])HCM([^A-Z]|$)|(^|[^A-Z])HCMC([^A-Z]|$)|(^|[^A-Z])SGN([^A-Z]|$)|(^|[^A-Z])HAN([^A-Z]|$)|澳门|澳門|Macao|Macau|🇲🇴|(^|[^A-Z])MO([^A-Z]|$)|(^|[^A-Z])MFM([^A-Z]|$))).*(?:中国|上海|北京|广州|深圳|江苏|浙江|🇨🇳|(^|[^A-Z])China([^A-Z]|$)|(^|[^A-Z])CN(?!2(?:[^0-9]|$))([^A-Z]|$))).*$", icon: "https://flagcdn.com/w320/cn.png" },
];


// 远程规则集：与 YAML 的 rule-providers 保持同步。
OVERRIDE["rule-providers"] = {
  // 配置说明：业务分类「reject」的公共配置项。
  reject: { ...META_DOMAIN_PROVIDER, behavior: "classical", format: "yaml", url: "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Clash-Classical-Only.Ads.yaml", path: "./ruleset/awavenue/only-ads-classical.yaml" },
  // 配置说明：业务分类「private」的公共配置项。
  private: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs", path: "./ruleset/metacubex/private.mrs" },
  // 配置说明：业务分类「cn」的公共配置项。
  cn: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs", path: "./ruleset/metacubex/cn.mrs" },
  // 配置说明：业务分类「wechat」的公共配置项。
  wechat: { type: "http", behavior: "classical", format: "yaml", interval: 86400, "size-limit": 4194304, proxy: "节点选择", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/WeChat/WeChat_No_Resolve.yaml", path: "./ruleset/blackmatrix7/wechat-no-resolve.yaml" },
  // 配置说明：业务分类「alipay」的公共配置项。
  alipay: { type: "http", behavior: "classical", format: "yaml", interval: 86400, "size-limit": 4194304, proxy: "节点选择", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AliPay/AliPay.yaml", path: "./ruleset/blackmatrix7/alipay.yaml" },
  // 配置说明：业务分类「geolocation-!cn」的公共配置项。
  "geolocation-!cn": { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs", path: "./ruleset/metacubex/geolocation-!cn.mrs" },
  // 配置说明：业务分类「google」的公共配置项。
  google: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs", path: "./ruleset/metacubex/google.mrs" },
  // 配置说明：业务分类「youtube」的公共配置项。
  youtube: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs", path: "./ruleset/metacubex/youtube.mrs" },
  // 配置说明：业务分类「github」的公共配置项。
  github: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs", path: "./ruleset/metacubex/github.mrs" },
  // 配置说明：业务分类「microsoft」的公共配置项。
  microsoft: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs", path: "./ruleset/metacubex/microsoft.mrs" },
  // 配置说明：业务分类「openai」的公共配置项。
  openai: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs", path: "./ruleset/metacubex/openai.mrs" },
  // 配置说明：业务分类「anthropic」的公共配置项。
  anthropic: { ...META_DOMAIN_PROVIDER, format: "text", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/anthropic.list", path: "./ruleset/metacubex/anthropic.list" },
  // 配置说明：业务分类「google-gemini」的公共配置项。
  "google-gemini": { ...META_DOMAIN_PROVIDER, format: "text", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-gemini.list", path: "./ruleset/metacubex/google-gemini.list" },
  // 配置说明：业务分类「github-copilot」的公共配置项。
  "github-copilot": { ...META_DOMAIN_PROVIDER, format: "text", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github-copilot.list", path: "./ruleset/metacubex/github-copilot.list" },
  // 配置说明：业务分类「telegram」的公共配置项。
  telegram: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs", path: "./ruleset/metacubex/telegram.mrs" },
  // 配置说明：业务分类「netflix」的公共配置项。
  netflix: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs", path: "./ruleset/metacubex/netflix.mrs" },
  // 配置说明：业务分类「tiktok」的公共配置项。
  tiktok: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs", path: "./ruleset/metacubex/tiktok.mrs" },
  // 配置说明：业务分类「spotify」的公共配置项。
  spotify: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs", path: "./ruleset/metacubex/spotify.mrs" },
  // 配置说明：业务分类「apple」的公共配置项。
  apple: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs", path: "./ruleset/metacubex/apple.mrs" },
  // 配置说明：业务分类「bilibili」的公共配置项。
  bilibili: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/bilibili.mrs", path: "./ruleset/metacubex/bilibili.mrs" },
  // 配置说明：业务分类「biliintl」的公共配置项。
  biliintl: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/biliintl.mrs", path: "./ruleset/metacubex/biliintl.mrs" },
// 配置说明：业务分类「twitter」的公共配置项。
twitter: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/twitter.mrs", path: "./ruleset/metacubex/twitter.mrs" },
  // 配置说明：业务分类「facebook」的公共配置项。
  facebook: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/facebook.mrs", path: "./ruleset/metacubex/facebook.mrs" },
  // 配置说明：业务分类「steam」的公共配置项。
  steam: { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/steam.mrs", path: "./ruleset/metacubex/steam.mrs" },
  // 配置说明：业务分类「steam-cn」的公共配置项。
  "steam-cn": { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/steam@cn.mrs", path: "./ruleset/metacubex/steam-cn.mrs" },
  // 配置说明：业务分类「category-games-cn」的公共配置项。
  "category-games-cn": { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games-cn.mrs", path: "./ruleset/metacubex/category-games-cn.mrs" },
  // 配置说明：业务分类「category-games-global」的公共配置项。
  "category-games-global": { ...META_DOMAIN_PROVIDER, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games-!cn.mrs", path: "./ruleset/metacubex/category-games-global.mrs" },
  // 配置说明：业务分类「telegramcidr」的公共配置项。
  telegramcidr: { type: "http", behavior: "ipcidr", format: "mrs", interval: 86400, "size-limit": 4194304, proxy: "节点选择", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs", path: "./ruleset/metacubex/telegramcidr.mrs" },
};


// 分流规则文本：与 YAML 的 rules 顺序和内容保持同步。
const RULES_TEXT = [
  "",
  // 配置说明：目标 IPv4 网段 0.0.0.0/8 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,0.0.0.0/8,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 10.0.0.0/8 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 100.64.0.0/10 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 127.0.0.0/8 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 169.254.0.0/16 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 172.16.0.0/12 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 192.168.0.0/16 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 224.0.0.0/4 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
  // 配置说明：目标 IPv4 网段 255.255.255.255/32 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR,255.255.255.255/32,DIRECT,no-resolve",
  // 配置说明：目标 IPv6 网段 ::1/128 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR6,::1/128,DIRECT,no-resolve",
  // 配置说明：目标 IPv6 网段 fc00::/7 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
  // 配置说明：目标 IPv6 网段 fe80::/10 → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
  // 配置说明：根域名 local 及其子域 → 直连。
  "DOMAIN-SUFFIX,local,DIRECT",
  // 配置说明：根域名 lan 及其子域 → 直连。
  "DOMAIN-SUFFIX,lan,DIRECT",
  // 配置说明：命中规则集合 private → 直连。
  "RULE-SET,private,DIRECT",
  // 配置说明：目标 IP 属于 GeoIP LAN → 直连。no-resolve：不为本条 IP 匹配额外解析域名。
  "GEOIP,LAN,DIRECT,no-resolve",
  // 配置说明：命中规则集合 reject → 交给「广告过滤」策略。
  "RULE-SET,reject,广告过滤",
  // 配置说明：根域名 jspoo.com 及其子域 → 直连。
  "DOMAIN-SUFFIX,jspoo.com,DIRECT",
  // 配置说明：根域名 tampermonkey.net 及其子域 → 直连。
  "DOMAIN-SUFFIX,tampermonkey.net,DIRECT",
  // 配置说明：精确域名 aweme.snssdk.com → 交给「国内服务」策略。
  "DOMAIN,aweme.snssdk.com,国内服务",
  // 配置说明：精确域名 is.snssdk.com → 交给「国内服务」策略。
  "DOMAIN,is.snssdk.com,国内服务",
  // 配置说明：根域名 getui.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,getui.com,国内服务",
  // 配置说明：根域名 getui.net 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,getui.net,国内服务",
  // 配置说明：根域名 gepush.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,gepush.com,国内服务",
  // 配置说明：根域名 igexin.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,igexin.com,国内服务",
  // 配置说明：同时满足括号内条件（NOT 子条件须不匹配） → 直连。
  "AND,((IP-CIDR,47.81.15.184/32,no-resolve),(DST-PORT,22),(NETWORK,TCP)),DIRECT",
  // 配置说明：根域名 yhglobal.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,yhglobal.com,国内服务",
  // 配置说明：根域名 download.nvidia.com 及其子域 → 直连。
  "DOMAIN-SUFFIX,download.nvidia.com,DIRECT",
  // 配置说明：根域名 download.nvidia.cn 及其子域 → 直连。
  "DOMAIN-SUFFIX,download.nvidia.cn,DIRECT",
  // 配置说明：精确域名 ota.nvidia.com → 直连。
  "DOMAIN,ota.nvidia.com,DIRECT",
  // 配置说明：精确域名 gfwsl.geforce.cn → 直连。
  "DOMAIN,gfwsl.geforce.cn,DIRECT",
  // 配置说明：进程名/应用包名 NVIDIA App.exe → 直连。
  "PROCESS-NAME,NVIDIA App.exe,DIRECT",
  // 配置说明：进程名/应用包名 NVIDIA GeForce Experience.exe → 直连。
  "PROCESS-NAME,NVIDIA GeForce Experience.exe,DIRECT",
  // 配置说明：进程名/应用包名 NvContainer.exe → 直连。
  "PROCESS-NAME,NvContainer.exe,DIRECT",
  // 配置说明：进程名/应用包名 NVDisplay.Container.exe → 直连。
  "PROCESS-NAME,NVDisplay.Container.exe,DIRECT",
  // 配置说明：进程名/应用包名 nvngx_update.exe → 直连。
  "PROCESS-NAME,nvngx_update.exe,DIRECT",
  // 配置说明：进程名/应用包名 AMDSoftware.exe → 直连。
  "PROCESS-NAME,AMDSoftware.exe,DIRECT",
  // 配置说明：进程名/应用包名 AMDRSServ.exe → 直连。
  "PROCESS-NAME,AMDRSServ.exe,DIRECT",
  // 配置说明：进程名/应用包名 AMDInstallManager.exe → 直连。
  "PROCESS-NAME,AMDInstallManager.exe,DIRECT",
  // 配置说明：进程名/应用包名 com.openai.chatgpt → 交给「AI」策略。
  "PROCESS-NAME,com.openai.chatgpt,AI",
  // 配置说明：进程名/应用包名 com.google.android.apps.bard → 交给「AI」策略。
  "PROCESS-NAME,com.google.android.apps.bard,AI",
  // 配置说明：进程名/应用包名 com.anthropic.claude → 交给「AI」策略。
  "PROCESS-NAME,com.anthropic.claude,AI",
  // 配置说明：进程名/应用包名 ai.perplexity.app.android → 交给「AI」策略。
  "PROCESS-NAME,ai.perplexity.app.android,AI",
  // 配置说明：进程名/应用包名 com.microsoft.copilot → 交给「AI」策略。
  "PROCESS-NAME,com.microsoft.copilot,AI",
  // 配置说明：进程名/应用包名 com.twitter.android → 交给「Meta / X」策略。
  "PROCESS-NAME,com.twitter.android,Meta / X",
  // 配置说明：进程名/应用包名 com.facebook.katana → 交给「Meta / X」策略。
  "PROCESS-NAME,com.facebook.katana,Meta / X",
  // 配置说明：进程名/应用包名 com.facebook.orca → 交给「Meta / X」策略。
  "PROCESS-NAME,com.facebook.orca,Meta / X",
  // 配置说明：进程名/应用包名 com.instagram.android → 交给「Meta / X」策略。
  "PROCESS-NAME,com.instagram.android,Meta / X",
  // 配置说明：进程名/应用包名 com.instagram.barcelona → 交给「Meta / X」策略。
  "PROCESS-NAME,com.instagram.barcelona,Meta / X",
  // 配置说明：进程名/应用包名 org.telegram.messenger → 交给「电报消息」策略。
  "PROCESS-NAME,org.telegram.messenger,电报消息",
  // 配置说明：进程名/应用包名 org.telegram.group → 交给「电报消息」策略。
  "PROCESS-NAME,org.telegram.group,电报消息",
  // 配置说明：进程名/应用包名 com.whatsapp → 交给「Meta / X」策略。
  "PROCESS-NAME,com.whatsapp,Meta / X",
  // 配置说明：进程名/应用包名 com.reddit.frontpage → 交给「节点选择」策略。
  "PROCESS-NAME,com.reddit.frontpage,节点选择",
  // 配置说明：进程名/应用包名 com.discord → 交给「节点选择」策略。
  "PROCESS-NAME,com.discord,节点选择",
  // 配置说明：进程名/应用包名 org.thoughtcrime.securesms → 交给「节点选择」策略。
  "PROCESS-NAME,org.thoughtcrime.securesms,节点选择",
  // 配置说明：进程名/应用包名 jp.naver.line.android → 交给「节点选择」策略。
  "PROCESS-NAME,jp.naver.line.android,节点选择",
  // 配置说明：进程名/应用包名 com.snapchat.android → 交给「节点选择」策略。
  "PROCESS-NAME,com.snapchat.android,节点选择",
  // 配置说明：进程名/应用包名 com.pinterest → 交给「节点选择」策略。
  "PROCESS-NAME,com.pinterest,节点选择",
  // 配置说明：进程名/应用包名 com.linkedin.android → 交给「节点选择」策略。
  "PROCESS-NAME,com.linkedin.android,节点选择",
  // 配置说明：进程名/应用包名 com.duolingo → 交给「节点选择」策略。
  "PROCESS-NAME,com.duolingo,节点选择",
  // 配置说明：进程名/应用包名 com.google.android.googlequicksearchbox → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.googlequicksearchbox,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.apps.maps → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.apps.maps,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.gm → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.gm,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.apps.docs → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.apps.docs,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.apps.translate → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.apps.translate,谷歌服务",
  // 配置说明：进程名/应用包名 com.android.vending → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.android.vending,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.gms → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.gms,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.gsf → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.gsf,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.gsf.login → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.gsf.login,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.partnersetup → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.partnersetup,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.configupdater → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.configupdater,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.onetimeinitializer → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.onetimeinitializer,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.as.oss → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.as.oss,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.contactkeys → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.contactkeys,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.inputmethod.latin → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.inputmethod.latin,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.apps.authenticator2 → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.apps.authenticator2,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.ar.core → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.ar.core,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.marvin.talkback → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.marvin.talkback,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.accessibility.switchaccess → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.accessibility.switchaccess,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.printservice.recommendation → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.printservice.recommendation,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.apps.photos → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.apps.photos,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.calendar → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.calendar,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.android.projection.gearhead → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.android.projection.gearhead,谷歌服务",
  // 配置说明：进程名/应用包名 com.google.earth → 交给「谷歌服务」策略。
  "PROCESS-NAME,com.google.earth,谷歌服务",
  // 配置说明：进程名/应用包名 com.microsoft.office.outlook → 交给「微软服务」策略。
  "PROCESS-NAME,com.microsoft.office.outlook,微软服务",
  // 配置说明：进程名/应用包名 com.microsoft.skydrive → 交给「微软服务」策略。
  "PROCESS-NAME,com.microsoft.skydrive,微软服务",
  // 配置说明：进程名/应用包名 com.microsoft.teams → 交给「微软服务」策略。
  "PROCESS-NAME,com.microsoft.teams,微软服务",
  // 配置说明：进程名/应用包名 com.apple.android.music → 交给「苹果服务」策略。
  "PROCESS-NAME,com.apple.android.music,苹果服务",
  // 配置说明：进程名/应用包名 com.microsoft.appmanager → 交给「微软服务」策略。
  "PROCESS-NAME,com.microsoft.appmanager,微软服务",
  // 配置说明：进程名/应用包名 com.microsoft.deviceintegrationservice → 交给「微软服务」策略。
  "PROCESS-NAME,com.microsoft.deviceintegrationservice,微软服务",
  // 配置说明：进程名/应用包名 com.microsoftsdk.crossdeviceservicebroker → 交给「微软服务」策略。
  "PROCESS-NAME,com.microsoftsdk.crossdeviceservicebroker,微软服务",
  // 配置说明：进程名/应用包名 com.tencent.mm → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.mm,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.mobileqq → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.mobileqq,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.tim → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.tim,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.soter.soterserver → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.soter.soterserver,国内服务",
  // 配置说明：进程名/应用包名 com.sina.weibo → 交给「国内服务」策略。
  "PROCESS-NAME,com.sina.weibo,国内服务",
  // 配置说明：进程名/应用包名 com.zhihu.android → 交给「国内服务」策略。
  "PROCESS-NAME,com.zhihu.android,国内服务",
  // 配置说明：进程名/应用包名 com.eg.android.AlipayGphone → 交给「国内服务」策略。
  "PROCESS-NAME,com.eg.android.AlipayGphone,国内服务",
  // 配置说明：进程名/应用包名 com.taobao.taobao → 交给「国内服务」策略。
  "PROCESS-NAME,com.taobao.taobao,国内服务",
  // 配置说明：进程名/应用包名 com.tmall.wireless → 交给「国内服务」策略。
  "PROCESS-NAME,com.tmall.wireless,国内服务",
  // 配置说明：进程名/应用包名 com.jingdong.app.mall → 交给「国内服务」策略。
  "PROCESS-NAME,com.jingdong.app.mall,国内服务",
  // 配置说明：进程名/应用包名 com.xunmeng.pinduoduo → 交给「国内服务」策略。
  "PROCESS-NAME,com.xunmeng.pinduoduo,国内服务",
  // 配置说明：进程名/应用包名 me.ele → 交给「国内服务」策略。
  "PROCESS-NAME,me.ele,国内服务",
  // 配置说明：进程名/应用包名 com.sankuai.meituan → 交给「国内服务」策略。
  "PROCESS-NAME,com.sankuai.meituan,国内服务",
  // 配置说明：进程名/应用包名 com.sankuai.meituan.takeoutnew → 交给「国内服务」策略。
  "PROCESS-NAME,com.sankuai.meituan.takeoutnew,国内服务",
  // 配置说明：进程名/应用包名 com.dianping.v1 → 交给「国内服务」策略。
  "PROCESS-NAME,com.dianping.v1,国内服务",
  // 配置说明：进程名/应用包名 ctrip.android.view → 交给「国内服务」策略。
  "PROCESS-NAME,ctrip.android.view,国内服务",
  // 配置说明：进程名/应用包名 com.Qunar → 交给「国内服务」策略。
  "PROCESS-NAME,com.Qunar,国内服务",
  // 配置说明：进程名/应用包名 com.autonavi.minimap → 交给「国内服务」策略。
  "PROCESS-NAME,com.autonavi.minimap,国内服务",
  // 配置说明：进程名/应用包名 com.baidu.BaiduMap → 交给「国内服务」策略。
  "PROCESS-NAME,com.baidu.BaiduMap,国内服务",
  // 配置说明：进程名/应用包名 com.sdu.didi.psnger → 交给「国内服务」策略。
  "PROCESS-NAME,com.sdu.didi.psnger,国内服务",
  // 配置说明：进程名/应用包名 com.MobileTicket → 交给「国内服务」策略。
  "PROCESS-NAME,com.MobileTicket,国内服务",
  // 配置说明：进程名/应用包名 com.unionpay → 交给「国内服务」策略。
  "PROCESS-NAME,com.unionpay,国内服务",
  // 配置说明：进程名/应用包名 com.ss.android.ugc.aweme → 交给「国内服务」策略。
  "PROCESS-NAME,com.ss.android.ugc.aweme,国内服务",
  // 配置说明：进程名/应用包名 com.ss.android.ugc.aweme.mobile → 交给「国内服务」策略。
  "PROCESS-NAME,com.ss.android.ugc.aweme.mobile,国内服务",
  // 配置说明：进程名/应用包名 com.ss.android.ugc.aweme.lite → 交给「国内服务」策略。
  "PROCESS-NAME,com.ss.android.ugc.aweme.lite,国内服务",
  // 配置说明：进程名/应用包名 com.smile.gifmaker → 交给「国内服务」策略。
  "PROCESS-NAME,com.smile.gifmaker,国内服务",
  // 配置说明：进程名/应用包名 com.kuaishou.nebula → 交给「国内服务」策略。
  "PROCESS-NAME,com.kuaishou.nebula,国内服务",
  // 配置说明：进程名/应用包名 com.xingin.xhs → 交给「国内服务」策略。
  "PROCESS-NAME,com.xingin.xhs,国内服务",
  // 配置说明：进程名/应用包名 com.youku.phone → 交给「国内服务」策略。
  "PROCESS-NAME,com.youku.phone,国内服务",
  // 配置说明：进程名/应用包名 com.qiyi.video → 交给「国内服务」策略。
  "PROCESS-NAME,com.qiyi.video,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.qqlive → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.qqlive,国内服务",
  // 配置说明：进程名/应用包名 com.ss.android.article.news → 交给「国内服务」策略。
  "PROCESS-NAME,com.ss.android.article.news,国内服务",
  // 配置说明：进程名/应用包名 com.netease.cloudmusic → 交给「国内服务」策略。
  "PROCESS-NAME,com.netease.cloudmusic,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.qqmusic → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.qqmusic,国内服务",
  // 配置说明：进程名/应用包名 com.kugou.android → 交给「国内服务」策略。
  "PROCESS-NAME,com.kugou.android,国内服务",
  // 配置说明：进程名/应用包名 com.icbc → 交给「国内服务」策略。
  "PROCESS-NAME,com.icbc,国内服务",
  // 配置说明：进程名/应用包名 com.chinamworld.main → 交给「国内服务」策略。
  "PROCESS-NAME,com.chinamworld.main,国内服务",
  // 配置说明：进程名/应用包名 com.cmbchina.ccd.pluto.cmbActivity → 交给「国内服务」策略。
  "PROCESS-NAME,com.cmbchina.ccd.pluto.cmbActivity,国内服务",
  // 配置说明：进程名/应用包名 com.greenpoint.android.mc10086.activity → 交给「国内服务」策略。
  "PROCESS-NAME,com.greenpoint.android.mc10086.activity,国内服务",
  // 配置说明：进程名/应用包名 com.sinovatech.unicom.ui → 交给「国内服务」策略。
  "PROCESS-NAME,com.sinovatech.unicom.ui,国内服务",
  // 配置说明：进程名/应用包名 com.ct.client → 交给「国内服务」策略。
  "PROCESS-NAME,com.ct.client,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.wework → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.wework,国内服务",
  // 配置说明：进程名/应用包名 com.alibaba.android.rimet → 交给「国内服务」策略。
  "PROCESS-NAME,com.alibaba.android.rimet,国内服务",
  // 配置说明：进程名/应用包名 com.ss.android.lark → 交给「国内服务」策略。
  "PROCESS-NAME,com.ss.android.lark,国内服务",
  // 配置说明：进程名/应用包名 com.baidu.netdisk → 交给「国内服务」策略。
  "PROCESS-NAME,com.baidu.netdisk,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.weiyun → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.weiyun,国内服务",
  // 配置说明：进程名/应用包名 cn.wps.moffice_eng → 交给「国内服务」策略。
  "PROCESS-NAME,cn.wps.moffice_eng,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.androidqqmail → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.androidqqmail,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.wemeet.app → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.wemeet.app,国内服务",
  // 配置说明：进程名/应用包名 com.taobao.idlefish → 交给「国内服务」策略。
  "PROCESS-NAME,com.taobao.idlefish,国内服务",
  // 配置说明：进程名/应用包名 com.achievo.vipshop → 交给「国内服务」策略。
  "PROCESS-NAME,com.achievo.vipshop,国内服务",
  // 配置说明：进程名/应用包名 com.alibaba.wireless → 交给「国内服务」策略。
  "PROCESS-NAME,com.alibaba.wireless,国内服务",
  // 配置说明：进程名/应用包名 com.cainiao.wireless → 交给「国内服务」策略。
  "PROCESS-NAME,com.cainiao.wireless,国内服务",
  // 配置说明：进程名/应用包名 com.fcbox.hiveconsumer → 交给「国内服务」策略。
  "PROCESS-NAME,com.fcbox.hiveconsumer,国内服务",
  // 配置说明：进程名/应用包名 com.intsig.camscanner → 交给「国内服务」策略。
  "PROCESS-NAME,com.intsig.camscanner,国内服务",
  // 配置说明：进程名/应用包名 com.manmanbuy.bijia → 交给「国内服务」策略。
  "PROCESS-NAME,com.manmanbuy.bijia,国内服务",
  // 配置说明：进程名/应用包名 com.max.xiaoheihe → 交给「国内服务」策略。
  "PROCESS-NAME,com.max.xiaoheihe,国内服务",
  // 配置说明：进程名/应用包名 com.umetrip.android.msky.app → 交给「国内服务」策略。
  "PROCESS-NAME,com.umetrip.android.msky.app,国内服务",
  // 配置说明：进程名/应用包名 com.oneplus.bbs → 交给「国内服务」策略。
  "PROCESS-NAME,com.oneplus.bbs,国内服务",
  // 配置说明：进程名/应用包名 com.oneplus.member → 交给「国内服务」策略。
  "PROCESS-NAME,com.oneplus.member,国内服务",
  // 配置说明：进程名/应用包名 com.oppo.store → 交给「国内服务」策略。
  "PROCESS-NAME,com.oppo.store,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.market → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.market,国内服务",
  // 配置说明：进程名/应用包名 com.nearme.instant.platform → 交给「国内服务」策略。
  "PROCESS-NAME,com.nearme.instant.platform,国内服务",
  // 配置说明：进程名/应用包名 com.netease.uuremote → 交给「国内服务」策略。
  "PROCESS-NAME,com.netease.uuremote,国内服务",
  // 配置说明：进程名/应用包名 com.lptiyu.tanke → 交给「国内服务」策略。
  "PROCESS-NAME,com.lptiyu.tanke,国内服务",
  // 配置说明：进程名/应用包名 com.deepseek.chat → 交给「国内服务」策略。
  "PROCESS-NAME,com.deepseek.chat,国内服务",
  // 配置说明：进程名/应用包名 com.larus.nova → 交给「国内服务」策略。
  "PROCESS-NAME,com.larus.nova,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.tmgp.cf → 交给「游戏平台」策略。
  "PROCESS-NAME,com.tencent.tmgp.cf,游戏平台",
  // 配置说明：进程名/应用包名 com.x7890.shortcutcreator → 交给「国内服务」策略。
  "PROCESS-NAME,com.x7890.shortcutcreator,国内服务",
  // 配置说明：进程名/应用包名 com.tryfun.intelligent → 交给「国内服务」策略。
  "PROCESS-NAME,com.tryfun.intelligent,国内服务",
  // 配置说明：进程名/应用包名 com.ktls.fileinfo → 交给「国内服务」策略。
  "PROCESS-NAME,com.ktls.fileinfo,国内服务",
  // 配置说明：进程名/应用包名 com.jingcai.apps.qualitydev → 交给「国内服务」策略。
  "PROCESS-NAME,com.jingcai.apps.qualitydev,国内服务",
  // 配置说明：进程名/应用包名 com.dragon.read → 交给「国内服务」策略。
  "PROCESS-NAME,com.dragon.read,国内服务",
  // 配置说明：进程名/应用包名 com.example.gxcs_app → 交给「国内服务」策略。
  "PROCESS-NAME,com.example.gxcs_app,国内服务",
  // 配置说明：进程名/应用包名 com.jingyao.easybike → 交给「国内服务」策略。
  "PROCESS-NAME,com.jingyao.easybike,国内服务",
  // 配置说明：进程名/应用包名 com.cmic.heduohao → 交给「国内服务」策略。
  "PROCESS-NAME,com.cmic.heduohao,国内服务",
  // 配置说明：进程名/应用包名 com.lemon.lv → 交给「国内服务」策略。
  "PROCESS-NAME,com.lemon.lv,国内服务",
  // 配置说明：进程名/应用包名 com.ksjhaoka.a → 交给「国内服务」策略。
  "PROCESS-NAME,com.ksjhaoka.a,国内服务",
  // 配置说明：进程名/应用包名 com.coolapk.market → 交给「国内服务」策略。
  "PROCESS-NAME,com.coolapk.market,国内服务",
  // 配置说明：进程名/应用包名 com.taou.maimai → 交给「国内服务」策略。
  "PROCESS-NAME,com.taou.maimai,国内服务",
  // 配置说明：进程名/应用包名 com.eusoft.ting.en → 交给「国内服务」策略。
  "PROCESS-NAME,com.eusoft.ting.en,国内服务",
  // 配置说明：进程名/应用包名 com.mt.mtxx.mtxx → 交给「国内服务」策略。
  "PROCESS-NAME,com.mt.mtxx.mtxx,国内服务",
  // 配置说明：进程名/应用包名 com.midea.connect → 交给「国内服务」策略。
  "PROCESS-NAME,com.midea.connect,国内服务",
  // 配置说明：进程名/应用包名 com.job.android → 交给「国内服务」策略。
  "PROCESS-NAME,com.job.android,国内服务",
  // 配置说明：进程名/应用包名 com.redteamobile.roaming → 交给「国内服务」策略。
  "PROCESS-NAME,com.redteamobile.roaming,国内服务",
  // 配置说明：进程名/应用包名 com.tianyancha.skyeye → 交给「国内服务」策略。
  "PROCESS-NAME,com.tianyancha.skyeye,国内服务",
  // 配置说明：进程名/应用包名 com.newcapec.mobile.ncp → 交给「国内服务」策略。
  "PROCESS-NAME,com.newcapec.mobile.ncp,国内服务",
  // 配置说明：进程名/应用包名 com.tencent.weread → 交给「国内服务」策略。
  "PROCESS-NAME,com.tencent.weread,国内服务",
  // 配置说明：进程名/应用包名 com.mi.health → 交给「国内服务」策略。
  "PROCESS-NAME,com.mi.health,国内服务",
  // 配置说明：进程名/应用包名 com.xt.retouch → 交给「国内服务」策略。
  "PROCESS-NAME,com.xt.retouch,国内服务",
  // 配置说明：进程名/应用包名 com.iflytek.inputmethod → 交给「国内服务」策略。
  "PROCESS-NAME,com.iflytek.inputmethod,国内服务",
  // 配置说明：进程名/应用包名 com.chaoxing.mobile → 交给「国内服务」策略。
  "PROCESS-NAME,com.chaoxing.mobile,国内服务",
  // 配置说明：进程名/应用包名 cn.com.chsi.chsiapp → 交给「国内服务」策略。
  "PROCESS-NAME,cn.com.chsi.chsiapp,国内服务",
  // 配置说明：进程名/应用包名 com.youdao.dict → 交给「国内服务」策略。
  "PROCESS-NAME,com.youdao.dict,国内服务",
  // 配置说明：进程名/应用包名 com.maxframing.mipad → 交给「国内服务」策略。
  "PROCESS-NAME,com.maxframing.mipad,国内服务",
  // 配置说明：进程名/应用包名 com.able.wisdomtree → 交给「国内服务」策略。
  "PROCESS-NAME,com.able.wisdomtree,国内服务",
  // 配置说明：进程名/应用包名 com.fifedu.fifiplat → 交给「国内服务」策略。
  "PROCESS-NAME,com.fifedu.fifiplat,国内服务",
  // 配置说明：进程名/应用包名 com.zte.smarthome → 交给「国内服务」策略。
  "PROCESS-NAME,com.zte.smarthome,国内服务",
  // 配置说明：进程名/应用包名 com.netease.mail → 交给「国内服务」策略。
  "PROCESS-NAME,com.netease.mail,国内服务",
  // 配置说明：进程名/应用包名 com.jd.jrapp → 交给「国内服务」策略。
  "PROCESS-NAME,com.jd.jrapp,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.smarthome → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.smarthome,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.shop → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.shop,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.market → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.market,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.vipaccount → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.vipaccount,国内服务",
  // 配置说明：进程名/应用包名 cn.wps.moffice_eng.xiaomi.lite → 交给「国内服务」策略。
  "PROCESS-NAME,cn.wps.moffice_eng.xiaomi.lite,国内服务",
  // 配置说明：进程名/应用包名 com.iflytek.inputmethod.miui → 交给「国内服务」策略。
  "PROCESS-NAME,com.iflytek.inputmethod.miui,国内服务",
  // 配置说明：进程名/应用包名 com.sohu.inputmethod.sogou.xiaomi → 交给「国内服务」策略。
  "PROCESS-NAME,com.sohu.inputmethod.sogou.xiaomi,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.health → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.health,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.themestore → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.themestore,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.member → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.member,国内服务",
  // 配置说明：进程名/应用包名 com.cnspeedtest.globalspeed → 交给「国内服务」策略。
  "PROCESS-NAME,com.cnspeedtest.globalspeed,国内服务",
  // 配置说明：进程名/应用包名 com.chinamworld.bocmbci → 交给「国内服务」策略。
  "PROCESS-NAME,com.chinamworld.bocmbci,国内服务",
  // 配置说明：进程名/应用包名 com.bankcomm.Bankcomm → 交给「国内服务」策略。
  "PROCESS-NAME,com.bankcomm.Bankcomm,国内服务",
  // 配置说明：进程名/应用包名 cn.com.spdb.mobilebank.per → 交给「国内服务」策略。
  "PROCESS-NAME,cn.com.spdb.mobilebank.per,国内服务",
  // 配置说明：进程名/应用包名 cmb.pb → 交给「国内服务」策略。
  "PROCESS-NAME,cmb.pb,国内服务",
  // 配置说明：进程名/应用包名 com.kingpoint.gmcchh → 交给「国内服务」策略。
  "PROCESS-NAME,com.kingpoint.gmcchh,国内服务",
  // 配置说明：进程名/应用包名 cn.gov.pbc.dcep → 交给「国内服务」策略。
  "PROCESS-NAME,cn.gov.pbc.dcep,国内服务",
  // 配置说明：进程名/应用包名 cn.gov.tax.its → 交给「国内服务」策略。
  "PROCESS-NAME,cn.gov.tax.its,国内服务",
  // 配置说明：进程名/应用包名 com.cdb.sla → 交给「国内服务」策略。
  "PROCESS-NAME,com.cdb.sla,国内服务",
  // 配置说明：进程名/应用包名 cn.cyberIdentity.certification → 交给「国内服务」策略。
  "PROCESS-NAME,cn.cyberIdentity.certification,国内服务",
  // 配置说明：进程名/应用包名 com.sohu.inputmethod.sogouoem → 交给「国内服务」策略。
  "PROCESS-NAME,com.sohu.inputmethod.sogouoem,国内服务",
  // 配置说明：进程名/应用包名 com.finshell.wallet → 交给「国内服务」策略。
  "PROCESS-NAME,com.finshell.wallet,国内服务",
  // 配置说明：进程名/应用包名 com.unionpay.tsmservice → 交给「国内服务」策略。
  "PROCESS-NAME,com.unionpay.tsmservice,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.cloud → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.cloud,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.mcs → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.mcs,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.openid → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.openid,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.vip → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.vip,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.htms → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.htms,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.tas → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.tas,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.accessory → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.accessory,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.mydevices → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.mydevices,国内服务",
  // 配置说明：进程名/应用包名 com.heytap.opluscarlink → 交给「国内服务」策略。
  "PROCESS-NAME,com.heytap.opluscarlink,国内服务",
  // 配置说明：进程名/应用包名 andes.oplus.documentsreader → 交给「国内服务」策略。
  "PROCESS-NAME,andes.oplus.documentsreader,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.findmyphone → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.findmyphone,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.oshare → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.oshare,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.phonemanager → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.phonemanager,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.filemanager → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.filemanager,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.gallery3d → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.gallery3d,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.weather2 → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.weather2,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.weather.service → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.weather.service,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.note → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.note,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.calendar → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.calendar,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.video → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.video,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.backuprestore → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.backuprestore,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.remoteguardservice → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.remoteguardservice,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.operationManual → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.operationManual,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.assistantscreen → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.assistantscreen,国内服务",
  // 配置说明：进程名/应用包名 com.coloros.translate → 交给「国内服务」策略。
  "PROCESS-NAME,com.coloros.translate,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.account → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.account,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.vip → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.vip,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.ota → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.ota,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.romupdate → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.romupdate,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.sau → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.sau,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.cota → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.cota,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.apprecover → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.apprecover,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.pay → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.pay,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.safecenter → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.safecenter,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.games → 交给「游戏平台」策略。
  "PROCESS-NAME,com.oplus.games,游戏平台",
  // 配置说明：进程名/应用包名 com.oplus.ocar → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.ocar,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.linker → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.linker,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.cast → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.cast,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.remotecontrol → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.remotecontrol,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.dfs → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.dfs,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.melody → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.melody,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.location → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.location,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.acc.gac → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.acc.gac,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.networksense → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.networksense,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.nas → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.nas,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.nhs → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.nhs,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.beaconlink → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.beaconlink,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.healthservice → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.healthservice,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.aiwriter → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.aiwriter,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.aiunit → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.aiunit,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.aicall → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.aicall,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.aimemory → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.aimemory,国内服务",
  // 配置说明：进程名/应用包名 com.oplus.owork → 交给「国内服务」策略。
  "PROCESS-NAME,com.oplus.owork,国内服务",
  // 配置说明：进程名/应用包名 com.newcall → 交给「国内服务」策略。
  "PROCESS-NAME,com.newcall,国内服务",
  // 配置说明：进程名/应用包名 com.ted.number → 交给「国内服务」策略。
  "PROCESS-NAME,com.ted.number,国内服务",
  // 配置说明：进程名/应用包名 com.opos.ads → 交给「国内服务」策略。
  "PROCESS-NAME,com.opos.ads,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.xmsf → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.xmsf,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.account → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.account,国内服务",
  // 配置说明：进程名/应用包名 com.miui.cloudservice → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.cloudservice,国内服务",
  // 配置说明：进程名/应用包名 com.miui.cloudbackup → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.cloudbackup,国内服务",
  // 配置说明：进程名/应用包名 com.miui.micloudsync → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.micloudsync,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.micloud.sdk → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.micloud.sdk,国内服务",
  // 配置说明：进程名/应用包名 com.miui.newmidrive → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.newmidrive,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.finddevice → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.finddevice,国内服务",
  // 配置说明：进程名/应用包名 com.miui.findmy → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.findmy,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.mi_connect_service → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.mi_connect_service,国内服务",
  // 配置说明：进程名/应用包名 com.miui.mishare.connectivity → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.mishare.connectivity,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.mirror → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.mirror,国内服务",
  // 配置说明：进程名/应用包名 com.milink.service → 交给「国内服务」策略。
  "PROCESS-NAME,com.milink.service,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.payment → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.payment,国内服务",
  // 配置说明：进程名/应用包名 com.miui.weather2 → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.weather2,国内服务",
  // 配置说明：进程名/应用包名 com.miui.gallery → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.gallery,国内服务",
  // 配置说明：进程名/应用包名 com.miui.notes → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.notes,国内服务",
  // 配置说明：进程名/应用包名 com.miui.securitycenter → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.securitycenter,国内服务",
  // 配置说明：进程名/应用包名 com.miui.securitymanager → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.securitymanager,国内服务",
  // 配置说明：进程名/应用包名 com.miui.packageinstaller → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.packageinstaller,国内服务",
  // 配置说明：进程名/应用包名 com.miui.hybrid → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.hybrid,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.gamecenter.sdk.service → 交给「游戏平台」策略。
  "PROCESS-NAME,com.xiaomi.gamecenter.sdk.service,游戏平台",
  // 配置说明：进程名/应用包名 com.xiaomi.migameservice → 交给「游戏平台」策略。
  "PROCESS-NAME,com.xiaomi.migameservice,游戏平台",
  // 配置说明：进程名/应用包名 com.xiaomi.minigame → 交给「游戏平台」策略。
  "PROCESS-NAME,com.xiaomi.minigame,游戏平台",
  // 配置说明：进程名/应用包名 com.miui.yellowpage → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.yellowpage,国内服务",
  // 配置说明：进程名/应用包名 com.miui.bugreport → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.bugreport,国内服务",
  // 配置说明：进程名/应用包名 com.miui.personalassistant → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.personalassistant,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.mibrain.speech → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.mibrain.speech,国内服务",
  // 配置说明：进程名/应用包名 com.miui.voiceassist → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.voiceassist,国内服务",
  // 配置说明：进程名/应用包名 com.miui.voiceassistProxy → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.voiceassistProxy,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.scanner → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.scanner,国内服务",
  // 配置说明：进程名/应用包名 com.miui.cleanmaster → 交给「国内服务」策略。
  "PROCESS-NAME,com.miui.cleanmaster,国内服务",
  // 配置说明：进程名/应用包名 com.xiaomi.ugd → 交给「国内服务」策略。
  "PROCESS-NAME,com.xiaomi.ugd,国内服务",
  // 配置说明：进程名/应用包名 com.android.updater → 交给「国内服务」策略。
  "PROCESS-NAME,com.android.updater,国内服务",
  // 配置说明：进程名/应用包名 com.lbe.security.miui → 交给「国内服务」策略。
  "PROCESS-NAME,com.lbe.security.miui,国内服务",
  // 配置说明：进程名/应用包名 com.miuix.editor → 交给「国内服务」策略。
  "PROCESS-NAME,com.miuix.editor,国内服务",
  // 配置说明：进程名/应用包名 com.mobiletools.systemhelper → 交给「国内服务」策略。
  "PROCESS-NAME,com.mobiletools.systemhelper,国内服务",
  // 配置说明：进程名/应用包名 com.google.android.youtube → 交给「YouTube」策略。
  "PROCESS-NAME,com.google.android.youtube,YouTube",
  // 配置说明：进程名/应用包名 com.google.android.apps.youtube.music → 交给「YouTube」策略。
  "PROCESS-NAME,com.google.android.apps.youtube.music,YouTube",
  // 配置说明：进程名/应用包名 com.google.android.apps.youtube.kids → 交给「YouTube」策略。
  "PROCESS-NAME,com.google.android.apps.youtube.kids,YouTube",
  // 配置说明：进程名/应用包名 com.netflix.mediaclient → 交给「Netflix」策略。
  "PROCESS-NAME,com.netflix.mediaclient,Netflix",
  // 配置说明：进程名/应用包名 com.spotify.music → 交给「Spotify」策略。
  "PROCESS-NAME,com.spotify.music,Spotify",
  // 配置说明：进程名/应用包名 com.zhiliaoapp.musically → 交给「TikTok」策略。
  "PROCESS-NAME,com.zhiliaoapp.musically,TikTok",
  // 配置说明：进程名/应用包名 tv.twitch.android.app → 交给「节点选择」策略。
  "PROCESS-NAME,tv.twitch.android.app,节点选择",
  // 配置说明：进程名/应用包名 tv.danmaku.bili → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,tv.danmaku.bili,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 com.bilibili.app.blue → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,com.bilibili.app.blue,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 com.bilibili.app.in → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,com.bilibili.app.in,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 com.bilibili.comic → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,com.bilibili.comic,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 com.bilibili.comic.intl → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,com.bilibili.comic.intl,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 tv.danmaku.bilibilihd → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,tv.danmaku.bilibilihd,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 com.bstar.intl → 交给「哔哩哔哩港澳台」策略。
  "PROCESS-NAME,com.bstar.intl,哔哩哔哩港澳台",
  // 配置说明：进程名/应用包名 com.github.android → 交给「GitHub」策略。
  "PROCESS-NAME,com.github.android,GitHub",
  // 配置说明：进程名/应用包名 zed.rainxch.githubstore → 交给「GitHub」策略。
  "PROCESS-NAME,zed.rainxch.githubstore,GitHub",
  // 配置说明：进程名/应用包名 com.zing.zalo → 交给「越南服务」策略。
  "PROCESS-NAME,com.zing.zalo,越南服务",
  // 配置说明：进程名/应用包名 com.shopee.vn → 交给「越南服务」策略。
  "PROCESS-NAME,com.shopee.vn,越南服务",
  // 配置说明：进程名/应用包名 com.grabtaxi.passenger → 交给「越南服务」策略。
  "PROCESS-NAME,com.grabtaxi.passenger,越南服务",
  // 配置说明：进程名/应用包名 xyz.be.customer → 交给「越南服务」策略。
  "PROCESS-NAME,xyz.be.customer,越南服务",
  // 配置说明：进程名/应用包名 com.jtexpress.customer.vn → 交给「越南服务」策略。
  "PROCESS-NAME,com.jtexpress.customer.vn,越南服务",
  // 配置说明：进程名/应用包名 com.viettel.ViettelPost → 交给「越南服务」策略。
  "PROCESS-NAME,com.viettel.ViettelPost,越南服务",
  // 配置说明：进程名/应用包名 com.vnp.myvinaphone → 交给「越南服务」策略。
  "PROCESS-NAME,com.vnp.myvinaphone,越南服务",
  // 配置说明：进程名/应用包名 vn.com.vng.zalopay → 交给「越南服务」策略。
  "PROCESS-NAME,vn.com.vng.zalopay,越南服务",
  // 配置说明：进程名/应用包名 com.mservice.momotransfer → 交给「越南服务」策略。
  "PROCESS-NAME,com.mservice.momotransfer,越南服务",
  // 配置说明：进程名/应用包名 com.VCB → 交给「越南服务」策略。
  "PROCESS-NAME,com.VCB,越南服务",
  // 配置说明：进程名/应用包名 vn.com.techcombank.bb.app → 交给「越南服务」策略。
  "PROCESS-NAME,vn.com.techcombank.bb.app,越南服务",
  // 配置说明：进程名/应用包名 com.vnpay.bidv → 交给「越南服务」策略。
  "PROCESS-NAME,com.vnpay.bidv,越南服务",
  // 配置说明：进程名/应用包名 com.mbmobile → 交给「越南服务」策略。
  "PROCESS-NAME,com.mbmobile,越南服务",
  // 配置说明：进程名/应用包名 com.vietinbank.ipay → 交给「越南服务」策略。
  "PROCESS-NAME,com.vietinbank.ipay,越南服务",
  // 配置说明：进程名/应用包名 vn.tiki.app.tikiandroid → 交给「越南服务」策略。
  "PROCESS-NAME,vn.tiki.app.tikiandroid,越南服务",
  // 配置说明：进程名/应用包名 com.lazada.android → 交给「越南服务」策略。
  "PROCESS-NAME,com.lazada.android,越南服务",
  // 配置说明：进程名/应用包名 com.deliverynow → 交给「越南服务」策略。
  "PROCESS-NAME,com.deliverynow,越南服务",
  // 配置说明：进程名/应用包名 org.zwanoo.android.speedtest → 交给「节点选择」策略。
  "PROCESS-NAME,org.zwanoo.android.speedtest,节点选择",
  // 配置说明：进程名/应用包名 com.mynat.android → 交给「节点选择」策略。
  "PROCESS-NAME,com.mynat.android,节点选择",
  // 配置说明：进程名/应用包名 com.eup.hanzii → 交给「节点选择」策略。
  "PROCESS-NAME,com.eup.hanzii,节点选择",
  // 配置说明：进程名/应用包名 ChatGPT.exe → 交给「AI」策略。
  "PROCESS-NAME,ChatGPT.exe,AI",
  // 配置说明：进程名/应用包名 Claude.exe → 交给「AI」策略。
  "PROCESS-NAME,Claude.exe,AI",
  // 配置说明：进程名/应用包名 Perplexity.exe → 交给「AI」策略。
  "PROCESS-NAME,Perplexity.exe,AI",
  // 配置说明：进程名/应用包名 Copilot.exe → 交给「AI」策略。
  "PROCESS-NAME,Copilot.exe,AI",
  // 配置说明：进程名/应用包名 Codex.exe → 交给「AI」策略。
  "PROCESS-NAME,Codex.exe,AI",
  // 配置说明：进程名/应用包名 codex.exe → 交给「AI」策略。
  "PROCESS-NAME,codex.exe,AI",
  // 配置说明：进程名/应用包名 codex → 交给「AI」策略。
  "PROCESS-NAME,codex,AI",
  // 配置说明：进程名/应用包名 Telegram.exe → 交给「电报消息」策略。
  "PROCESS-NAME,Telegram.exe,电报消息",
  // 配置说明：进程名/应用包名 Discord.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Discord.exe,节点选择",
  // 配置说明：进程名/应用包名 WhatsApp.exe → 交给「Meta / X」策略。
  "PROCESS-NAME,WhatsApp.exe,Meta / X",
  // 配置说明：进程名/应用包名 Signal.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Signal.exe,节点选择",
  // 配置说明：进程名/应用包名 LINE.exe → 交给「节点选择」策略。
  "PROCESS-NAME,LINE.exe,节点选择",
  // 配置说明：进程名/应用包名 Messenger.exe → 交给「Meta / X」策略。
  "PROCESS-NAME,Messenger.exe,Meta / X",
  // 配置说明：进程名/应用包名 Zalo.exe → 交给「越南服务」策略。
  "PROCESS-NAME,Zalo.exe,越南服务",
  // 配置说明：进程名/应用包名 Zalo → 交给「越南服务」策略。
  "PROCESS-NAME,Zalo,越南服务",
  // 配置说明：进程名/应用包名 WeChat.exe → 交给「国内服务」策略。
  "PROCESS-NAME,WeChat.exe,国内服务",
  // 配置说明：进程名/应用包名 WeChatAppEx.exe → 交给「国内服务」策略。
  "PROCESS-NAME,WeChatAppEx.exe,国内服务",
  // 配置说明：进程名/应用包名 Weixin.exe → 交给「国内服务」策略。
  "PROCESS-NAME,Weixin.exe,国内服务",
  // 配置说明：进程名/应用包名 QQ.exe → 交给「国内服务」策略。
  "PROCESS-NAME,QQ.exe,国内服务",
  // 配置说明：进程名/应用包名 TIM.exe → 交给「国内服务」策略。
  "PROCESS-NAME,TIM.exe,国内服务",
  // 配置说明：进程名/应用包名 DingTalk.exe → 交给「国内服务」策略。
  "PROCESS-NAME,DingTalk.exe,国内服务",
  // 配置说明：进程名/应用包名 WXWork.exe → 交给「国内服务」策略。
  "PROCESS-NAME,WXWork.exe,国内服务",
  // 配置说明：进程名/应用包名 Feishu.exe → 交给「国内服务」策略。
  "PROCESS-NAME,Feishu.exe,国内服务",
  // 配置说明：进程名/应用包名 Lark.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Lark.exe,节点选择",
  // 配置说明：进程名/应用包名 wps.exe → 交给「国内服务」策略。
  "PROCESS-NAME,wps.exe,国内服务",
  // 配置说明：进程名/应用包名 et.exe → 交给「国内服务」策略。
  "PROCESS-NAME,et.exe,国内服务",
  // 配置说明：进程名/应用包名 wpp.exe → 交给「国内服务」策略。
  "PROCESS-NAME,wpp.exe,国内服务",
  // 配置说明：进程名/应用包名 baidunetdisk.exe → 交给「国内服务」策略。
  "PROCESS-NAME,baidunetdisk.exe,国内服务",
  // 配置说明：进程名/应用包名 BaiduNetdisk.exe → 交给「国内服务」策略。
  "PROCESS-NAME,BaiduNetdisk.exe,国内服务",
  // 配置说明：进程名/应用包名 AliYunDrive.exe → 交给「国内服务」策略。
  "PROCESS-NAME,AliYunDrive.exe,国内服务",
  // 配置说明：进程名/应用包名 QuarkCloudDrive.exe → 交给「国内服务」策略。
  "PROCESS-NAME,QuarkCloudDrive.exe,国内服务",
  // 配置说明：进程名/应用包名 TencentMeeting.exe → 交给「国内服务」策略。
  "PROCESS-NAME,TencentMeeting.exe,国内服务",
  // 配置说明：进程名/应用包名 WeMeetApp.exe → 交给「国内服务」策略。
  "PROCESS-NAME,WeMeetApp.exe,国内服务",
  // 配置说明：进程名/应用包名 NeteaseMailMaster.exe → 交给「国内服务」策略。
  "PROCESS-NAME,NeteaseMailMaster.exe,国内服务",
  // 配置说明：进程名/应用包名 QQMail.exe → 交给「国内服务」策略。
  "PROCESS-NAME,QQMail.exe,国内服务",
  // 配置说明：进程名/应用包名 cloudmusic.exe → 交给「国内服务」策略。
  "PROCESS-NAME,cloudmusic.exe,国内服务",
  // 配置说明：进程名/应用包名 QQMusic.exe → 交给「国内服务」策略。
  "PROCESS-NAME,QQMusic.exe,国内服务",
  // 配置说明：进程名/应用包名 KuGou.exe → 交给「国内服务」策略。
  "PROCESS-NAME,KuGou.exe,国内服务",
  // 配置说明：进程名/应用包名 KuwoMusic.exe → 交给「国内服务」策略。
  "PROCESS-NAME,KuwoMusic.exe,国内服务",
  // 配置说明：进程名/应用包名 iQIYI.exe → 交给「国内服务」策略。
  "PROCESS-NAME,iQIYI.exe,国内服务",
  // 配置说明：进程名/应用包名 Youku.exe → 交给「国内服务」策略。
  "PROCESS-NAME,Youku.exe,国内服务",
  // 配置说明：进程名/应用包名 QQLive.exe → 交给「国内服务」策略。
  "PROCESS-NAME,QQLive.exe,国内服务",
  // 配置说明：进程名/应用包名 Douyin.exe → 交给「国内服务」策略。
  "PROCESS-NAME,Douyin.exe,国内服务",
  // 配置说明：进程名/应用包名 JianyingPro.exe → 交给「国内服务」策略。
  "PROCESS-NAME,JianyingPro.exe,国内服务",
  // 配置说明：进程名/应用包名 CapCut.exe → 交给「节点选择」策略。
  "PROCESS-NAME,CapCut.exe,节点选择",
  // 配置说明：进程名/应用包名 SogouInput.exe → 交给「国内服务」策略。
  "PROCESS-NAME,SogouInput.exe,国内服务",
  // 配置说明：进程名/应用包名 SogouImeBroker.exe → 交给「国内服务」策略。
  "PROCESS-NAME,SogouImeBroker.exe,国内服务",
  // 配置说明：进程名/应用包名 iFlyIME.exe → 交给「国内服务」策略。
  "PROCESS-NAME,iFlyIME.exe,国内服务",
  // 配置说明：进程名/应用包名 iFlyInput.exe → 交给「国内服务」策略。
  "PROCESS-NAME,iFlyInput.exe,国内服务",
  // 配置说明：进程名/应用包名 iFlyPlatform.exe → 交给「国内服务」策略。
  "PROCESS-NAME,iFlyPlatform.exe,国内服务",
  // 配置说明：进程名/应用包名 LenovoVantage.exe → 交给「国内服务」策略。
  "PROCESS-NAME,LenovoVantage.exe,国内服务",
  // 配置说明：进程名/应用包名 Lenovo.Modern.ImController.exe → 交给「国内服务」策略。
  "PROCESS-NAME,Lenovo.Modern.ImController.exe,国内服务",
  // 配置说明：进程名/应用包名 HuaweiPCManager.exe → 交给「国内服务」策略。
  "PROCESS-NAME,HuaweiPCManager.exe,国内服务",
  // 配置说明：进程名/应用包名 MiService.exe → 交给「国内服务」策略。
  "PROCESS-NAME,MiService.exe,国内服务",
  // 配置说明：进程名/应用包名 MiPhoneManager.exe → 交给「国内服务」策略。
  "PROCESS-NAME,MiPhoneManager.exe,国内服务",
  // 配置说明：进程名/应用包名 OPPOPCSuite.exe → 交给「国内服务」策略。
  "PROCESS-NAME,OPPOPCSuite.exe,国内服务",
  // 配置说明：进程名/应用包名 OnePlusPCSuite.exe → 交给「国内服务」策略。
  "PROCESS-NAME,OnePlusPCSuite.exe,国内服务",
  // 配置说明：进程名/应用包名 Spotify.exe → 交给「Spotify」策略。
  "PROCESS-NAME,Spotify.exe,Spotify",
  // 配置说明：进程名/应用包名 GitHubDesktop.exe → 交给「GitHub」策略。
  "PROCESS-NAME,GitHubDesktop.exe,GitHub",
  // 配置说明：进程名/应用包名 Cursor.exe → 交给「AI」策略。
  "PROCESS-NAME,Cursor.exe,AI",
  // 配置说明：进程名/应用包名 Windsurf.exe → 交给「AI」策略。
  "PROCESS-NAME,Windsurf.exe,AI",
  // 配置说明：进程名/应用包名 com.valvesoftware.android.steam.community → 交给「游戏平台」策略。
  "PROCESS-NAME,com.valvesoftware.android.steam.community,游戏平台",
  // 配置说明：进程名/应用包名 steam.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,steam.exe,游戏平台",
  // 配置说明：进程名/应用包名 steamwebhelper.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,steamwebhelper.exe,游戏平台",
  // 配置说明：进程名/应用包名 EpicGamesLauncher.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,EpicGamesLauncher.exe,游戏平台",
  // 配置说明：进程名/应用包名 EpicWebHelper.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,EpicWebHelper.exe,游戏平台",
  // 配置说明：进程名/应用包名 Battle.net.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,Battle.net.exe,游戏平台",
  // 配置说明：进程名/应用包名 RiotClientServices.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,RiotClientServices.exe,游戏平台",
  // 配置说明：进程名/应用包名 UbisoftConnect.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,UbisoftConnect.exe,游戏平台",
  // 配置说明：进程名/应用包名 EA app.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,EA app.exe,游戏平台",
  // 配置说明：进程名/应用包名 EADesktop.exe → 交给「游戏平台」策略。
  "PROCESS-NAME,EADesktop.exe,游戏平台",
  // 配置说明：进程名/应用包名 ms-teams.exe → 交给「微软服务」策略。
  "PROCESS-NAME,ms-teams.exe,微软服务",
  // 配置说明：进程名/应用包名 Teams.exe → 交给「微软服务」策略。
  "PROCESS-NAME,Teams.exe,微软服务",
  // 配置说明：进程名/应用包名 Zoom.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Zoom.exe,节点选择",
  // 配置说明：进程名/应用包名 slack.exe → 交给「节点选择」策略。
  "PROCESS-NAME,slack.exe,节点选择",
  // 配置说明：进程名/应用包名 Intel Driver & Support Assistant.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Intel Driver & Support Assistant.exe,节点选择",
  // 配置说明：进程名/应用包名 aria2c → 直连。
  "PROCESS-NAME,aria2c,DIRECT",
  // 配置说明：进程名/应用包名 aria2c.exe → 直连。
  "PROCESS-NAME,aria2c.exe,DIRECT",
  // 配置说明：进程名/应用包名 BitComet → 直连。
  "PROCESS-NAME,BitComet,DIRECT",
  // 配置说明：进程名/应用包名 BitComet.exe → 直连。
  "PROCESS-NAME,BitComet.exe,DIRECT",
  // 配置说明：进程名/应用包名 qBittorrent → 直连。
  "PROCESS-NAME,qBittorrent,DIRECT",
  // 配置说明：进程名/应用包名 qbittorrent.exe → 直连。
  "PROCESS-NAME,qbittorrent.exe,DIRECT",
  // 配置说明：进程名/应用包名 Transmission → 直连。
  "PROCESS-NAME,Transmission,DIRECT",
  // 配置说明：进程名/应用包名 transmission-daemon → 直连。
  "PROCESS-NAME,transmission-daemon,DIRECT",
  // 配置说明：进程名/应用包名 utorrent → 直连。
  "PROCESS-NAME,utorrent,DIRECT",
  // 配置说明：进程名/应用包名 uTorrent.exe → 直连。
  "PROCESS-NAME,uTorrent.exe,DIRECT",
  // 配置说明：进程名/应用包名 Thunder → 直连。
  "PROCESS-NAME,Thunder,DIRECT",
  // 配置说明：进程名/应用包名 Xunlei → 直连。
  "PROCESS-NAME,Xunlei,DIRECT",
  // 配置说明：根域名 perplexity.ai 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,perplexity.ai,AI",
  // 配置说明：根域名 perplexity.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,perplexity.com,AI",
  // 配置说明：根域名 pplx.ai 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,pplx.ai,AI",
  // 配置说明：精确域名 ppl-ai-file-upload.s3.amazonaws.com → 交给「AI」策略。
  "DOMAIN,ppl-ai-file-upload.s3.amazonaws.com,AI",
  // 配置说明：精确域名 pplx-res.cloudinary.com → 交给「AI」策略。
  "DOMAIN,pplx-res.cloudinary.com,AI",
  // 配置说明：根域名 cursor-cdn.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,cursor-cdn.com,AI",
  // 配置说明：根域名 cursor.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,cursor.com,AI",
  // 配置说明：根域名 cursor.sh 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,cursor.sh,AI",
  // 配置说明：根域名 cursorapi.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,cursorapi.com,AI",
  // 配置说明：根域名 codeium.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,codeium.com,AI",
  // 配置说明：根域名 codeiumdata.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,codeiumdata.com,AI",
  // 配置说明：根域名 windsurf.build 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,windsurf.build,AI",
  // 配置说明：根域名 windsurf.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,windsurf.com,AI",
  // 配置说明：根域名 chatgpt.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,chatgpt.com,AI",
  // 配置说明：根域名 openai.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,openai.com,AI",
  // 配置说明：根域名 oaistatic.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,oaistatic.com,AI",
  // 配置说明：根域名 oaiusercontent.com 及其子域 → 交给「AI」策略。
  "DOMAIN-SUFFIX,oaiusercontent.com,AI",
  // 配置说明：精确域名 copilot.microsoft.com → 交给「AI」策略。
  "DOMAIN,copilot.microsoft.com,AI",
  // 配置说明：命中规则集合 openai → 交给「AI」策略。
  "RULE-SET,openai,AI",
  // 配置说明：命中规则集合 anthropic → 交给「AI」策略。
  "RULE-SET,anthropic,AI",
  // 配置说明：命中规则集合 google-gemini → 交给「AI」策略。
  "RULE-SET,google-gemini,AI",
  // 配置说明：命中规则集合 github-copilot → 交给「AI」策略。
  "RULE-SET,github-copilot,AI",
  // 配置说明：命中规则集合 bilibili → 交给「哔哩哔哩港澳台」策略。
  "RULE-SET,bilibili,哔哩哔哩港澳台",
  // 配置说明：命中规则集合 biliintl → 交给「哔哩哔哩港澳台」策略。
  "RULE-SET,biliintl,哔哩哔哩港澳台",
  // 配置说明：命中规则集合 steam-cn → 交给「游戏平台」策略。
  "RULE-SET,steam-cn,游戏平台",
  // 配置说明：同时满足括号内条件（NOT 子条件须不匹配） → 交给「游戏平台」策略。
  "AND,((NOT,((DOMAIN-SUFFIX,in.th))),(RULE-SET,category-games-cn)),游戏平台",
  // 配置说明：根域名 steampowered.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,steampowered.com,游戏平台",
  // 配置说明：根域名 steamcommunity.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,steamcommunity.com,游戏平台",
  // 配置说明：根域名 steamstatic.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,steamstatic.com,游戏平台",
  // 配置说明：根域名 steamcontent.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,steamcontent.com,游戏平台",
  // 配置说明：根域名 epicgames.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,epicgames.com,游戏平台",
  // 配置说明：根域名 epicgamescdn.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,epicgamescdn.com,游戏平台",
  // 配置说明：根域名 battle.net 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,battle.net,游戏平台",
  // 配置说明：根域名 blizzard.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,blizzard.com,游戏平台",
  // 配置说明：根域名 riotgames.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,riotgames.com,游戏平台",
  // 配置说明：根域名 ubisoft.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,ubisoft.com,游戏平台",
  // 配置说明：根域名 ea.com 及其子域 → 交给「游戏平台」策略。
  "DOMAIN-SUFFIX,ea.com,游戏平台",
  // 配置说明：命中规则集合 steam → 交给「游戏平台」策略。
  "RULE-SET,steam,游戏平台",
  // 配置说明：命中规则集合 category-games-global → 交给「游戏平台」策略。
  "RULE-SET,category-games-global,游戏平台",
  // 配置说明：精确域名 accounts.google.com → 交给「谷歌服务」策略。
  "DOMAIN,accounts.google.com,谷歌服务",
  // 配置说明：根域名 accounts.google.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,accounts.google.com,谷歌服务",
  // 配置说明：根域名 accounts.youtube.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,accounts.youtube.com,谷歌服务",
  // 配置说明：精确域名 play.google.com → 交给「谷歌服务」策略。
  "DOMAIN,play.google.com,谷歌服务",
  // 配置说明：精确域名 dl.google.com → 交给「谷歌服务」策略。
  "DOMAIN,dl.google.com,谷歌服务",
  // 配置说明：精确域名 dl-ssl.google.com → 交给「谷歌服务」策略。
  "DOMAIN,dl-ssl.google.com,谷歌服务",
  // 配置说明：精确域名 android.apis.google.com → 交给「谷歌服务」策略。
  "DOMAIN,android.apis.google.com,谷歌服务",
  // 配置说明：精确域名 android.clients.google.com → 交给「谷歌服务」策略。
  "DOMAIN,android.clients.google.com,谷歌服务",
  // 配置说明：精确域名 android.googleapis.com → 交给「谷歌服务」策略。
  "DOMAIN,android.googleapis.com,谷歌服务",
  // 配置说明：根域名 googleapis.cn 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,googleapis.cn,谷歌服务",
  // 配置说明：根域名 gstatic.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,gstatic.com,谷歌服务",
  // 配置说明：根域名 googleusercontent.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,googleusercontent.com,谷歌服务",
  // 配置说明：根域名 gvt1.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,gvt1.com,谷歌服务",
  // 配置说明：根域名 gvt2.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,gvt2.com,谷歌服务",
  // 配置说明：根域名 gvt3.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,gvt3.com,谷歌服务",
  // 配置说明：根域名 ggpht.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,ggpht.com,谷歌服务",
  // 配置说明：根域名 xn--ngstr-lra8j.com 及其子域 → 交给「谷歌服务」策略。
  "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,谷歌服务",
  // 配置说明：精确域名 mtalk.google.com → 交给「谷歌服务」策略。
  "DOMAIN,mtalk.google.com,谷歌服务",
  // 配置说明：命中规则集合 youtube → 交给「YouTube」策略。
  "RULE-SET,youtube,YouTube",
  // 配置说明：命中规则集合 google → 交给「谷歌服务」策略。
  "RULE-SET,google,谷歌服务",
  // 配置说明：根域名 github.io 及其子域 → 交给「GitHub」策略。
  "DOMAIN-SUFFIX,github.io,GitHub",
  // 配置说明：精确域名 v2rayse.com → 交给「GitHub」策略。
  "DOMAIN,v2rayse.com,GitHub",
  // 配置说明：命中规则集合 github → 交给「GitHub」策略。
  "RULE-SET,github,GitHub",
  // 配置说明：根域名 displaycatalog.mp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,displaycatalog.mp.microsoft.com,微软服务",
  // 配置说明：根域名 delivery.mp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,delivery.mp.microsoft.com,微软服务",
  // 配置说明：根域名 dl.delivery.mp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,dl.delivery.mp.microsoft.com,微软服务",
  // 配置说明：根域名 prod.do.dsp.mp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,prod.do.dsp.mp.microsoft.com,微软服务",
  // 配置说明：根域名 do.dsp.mp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,do.dsp.mp.microsoft.com,微软服务",
  // 配置说明：根域名 windowsupdate.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,windowsupdate.com,微软服务",
  // 配置说明：根域名 update.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,update.microsoft.com,微软服务",
  // 配置说明：根域名 download.windowsupdate.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,download.windowsupdate.com,微软服务",
  // 配置说明：根域名 mp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,mp.microsoft.com,微软服务",
  // 配置说明：根域名 wns.windows.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,wns.windows.com,微软服务",
  // 配置说明：根域名 windows.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,windows.com,微软服务",
  // 配置说明：根域名 msedge.net 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,msedge.net,微软服务",
  // 配置说明：根域名 microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,microsoft.com,微软服务",
  // 配置说明：根域名 microsoftonline.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,microsoftonline.com,微软服务",
  // 配置说明：根域名 msauth.net 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,msauth.net,微软服务",
  // 配置说明：根域名 live.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,live.com,微软服务",
  // 配置说明：根域名 storecatalogrevocation.storequality.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,storecatalogrevocation.storequality.microsoft.com,微软服务",
  // 配置说明：根域名 img-prod-cms-rt-microsoft-com.akamaized.net 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,img-prod-cms-rt-microsoft-com.akamaized.net,微软服务",
  // 配置说明：根域名 img-s-msn-com.akamaized.net 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,img-s-msn-com.akamaized.net,微软服务",
  // 配置说明：根域名 manage.devcenter.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,manage.devcenter.microsoft.com,微软服务",
  // 配置说明：根域名 share.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,share.microsoft.com,微软服务",
  // 配置说明：根域名 pipe.aria.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,pipe.aria.microsoft.com,微软服务",
  // 配置说明：根域名 api.cdp.microsoft.com 及其子域 → 交给「微软服务」策略。
  "DOMAIN-SUFFIX,api.cdp.microsoft.com,微软服务",
  // 配置说明：精确域名 storeedgefd.dsx.mp.microsoft.com → 交给「微软服务」策略。
  "DOMAIN,storeedgefd.dsx.mp.microsoft.com,微软服务",
  // 配置说明：精确域名 livetileedge.dsx.mp.microsoft.com → 交给「微软服务」策略。
  "DOMAIN,livetileedge.dsx.mp.microsoft.com,微软服务",
  // 配置说明：精确域名 licensing.mp.microsoft.com → 交给「微软服务」策略。
  "DOMAIN,licensing.mp.microsoft.com,微软服务",
  // 配置说明：精确域名 tsfe.trafficshaping.dsp.mp.microsoft.com → 交给「微软服务」策略。
  "DOMAIN,tsfe.trafficshaping.dsp.mp.microsoft.com,微软服务",
  // 配置说明：精确域名 adl.windows.com → 交给「微软服务」策略。
  "DOMAIN,adl.windows.com,微软服务",
  // 配置说明：精确域名 ctldl.windowsupdate.com → 交给「微软服务」策略。
  "DOMAIN,ctldl.windowsupdate.com,微软服务",
  // 配置说明：精确域名 definitionupdates.microsoft.com → 交给「微软服务」策略。
  "DOMAIN,definitionupdates.microsoft.com,微软服务",
  // 配置说明：精确域名 msedge.api.cdp.microsoft.com → 交给「微软服务」策略。
  "DOMAIN,msedge.api.cdp.microsoft.com,微软服务",
  // 配置说明：命中规则集合 microsoft → 交给「微软服务」策略。
  "RULE-SET,microsoft,微软服务",
  // 配置说明：命中规则集合 telegram → 交给「电报消息」策略。
  "RULE-SET,telegram,电报消息",
  // 配置说明：命中规则集合 telegramcidr → 交给「电报消息」策略。no-resolve：不为本条 IP 匹配额外解析域名。
  "RULE-SET,telegramcidr,电报消息,no-resolve",
  // 配置说明：根域名 x.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,x.com,Meta / X",
  // 配置说明：根域名 twitter.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,twitter.com,Meta / X",
  // 配置说明：根域名 t.co 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,t.co,Meta / X",
  // 配置说明：根域名 twimg.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,twimg.com,Meta / X",
  // 配置说明：根域名 facebook.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,facebook.com,Meta / X",
  // 配置说明：根域名 facebook.net 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,facebook.net,Meta / X",
  // 配置说明：根域名 fbcdn.net 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,fbcdn.net,Meta / X",
  // 配置说明：根域名 messenger.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,messenger.com,Meta / X",
  // 配置说明：根域名 instagram.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,instagram.com,Meta / X",
  // 配置说明：根域名 cdninstagram.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,cdninstagram.com,Meta / X",
  // 配置说明：根域名 threads.net 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,threads.net,Meta / X",
  // 配置说明：根域名 whatsapp.com 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,whatsapp.com,Meta / X",
  // 配置说明：根域名 whatsapp.net 及其子域 → 交给「Meta / X」策略。
  "DOMAIN-SUFFIX,whatsapp.net,Meta / X",
  // 配置说明：命中规则集合 twitter → 交给「Meta / X」策略。
  "RULE-SET,twitter,Meta / X",
  // 配置说明：命中规则集合 facebook → 交给「Meta / X」策略。
  "RULE-SET,facebook,Meta / X",
  // 配置说明：命中规则集合 netflix → 交给「Netflix」策略。
  "RULE-SET,netflix,Netflix",
  // 配置说明：命中规则集合 tiktok → 交给「TikTok」策略。
  "RULE-SET,tiktok,TikTok",
  // 配置说明：命中规则集合 spotify → 交给「Spotify」策略。
  "RULE-SET,spotify,Spotify",
  // 配置说明：命中规则集合 apple → 交给「苹果服务」策略。
  "RULE-SET,apple,苹果服务",
  // 配置说明：域名包含 midea → 直连。
  "DOMAIN-KEYWORD,midea,DIRECT",
  // 配置说明：根域名 zalo.me 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,zalo.me,越南服务",
  // 配置说明：根域名 zaloapp.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,zaloapp.com,越南服务",
  // 配置说明：根域名 grab.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,grab.com,越南服务",
  // 配置说明：根域名 gojek.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,gojek.com,越南服务",
  // 配置说明：根域名 nhaccuatui.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,nhaccuatui.com,越南服务",
  // 配置说明：根域名 vnexpress.net 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,vnexpress.net,越南服务",
  // 配置说明：根域名 zalopay.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,zalopay.vn,越南服务",
  // 配置说明：根域名 shopeefood.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,shopeefood.vn,越南服务",
  // 配置说明：根域名 techcombank.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,techcombank.com,越南服务",
  // 配置说明：根域名 vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,vn,越南服务",
  // 配置说明：根域名 com.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,com.vn,越南服务",
  // 配置说明：根域名 net.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,net.vn,越南服务",
  // 配置说明：根域名 org.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,org.vn,越南服务",
  // 配置说明：根域名 edu.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,edu.vn,越南服务",
  // 配置说明：根域名 gov.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,gov.vn,越南服务",
  // 配置说明：根域名 biz.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,biz.vn,越南服务",
  // 配置说明：根域名 info.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,info.vn,越南服务",
  // 配置说明：根域名 name.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,name.vn,越南服务",
  // 配置说明：根域名 pro.vn 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,pro.vn,越南服务",
  // 配置说明：根域名 baomoi.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,baomoi.com,越南服务",
  // 配置说明：根域名 thegioididong.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,thegioididong.com,越南服务",
  // 配置说明：根域名 dienmayxanh.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,dienmayxanh.com,越南服务",
  // 配置说明：根域名 bachhoaxanh.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,bachhoaxanh.com,越南服务",
  // 配置说明：根域名 gearvn.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,gearvn.com,越南服务",
  // 配置说明：根域名 nguyenkim.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,nguyenkim.com,越南服务",
  // 配置说明：根域名 hoanghamobile.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,hoanghamobile.com,越南服务",
  // 配置说明：根域名 ahamove.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,ahamove.com,越南服务",
  // 配置说明：根域名 fpt.net 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,fpt.net,越南服务",
  // 配置说明：根域名 ghnexpress.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,ghnexpress.com,越南服务",
  // 配置说明：根域名 vietnamairlines.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,vietnamairlines.com,越南服务",
  // 配置说明：根域名 vietjetair.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,vietjetair.com,越南服务",
  // 配置说明：根域名 bambooairways.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,bambooairways.com,越南服务",
  // 配置说明：根域名 vexere.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,vexere.com,越南服务",
  // 配置说明：根域名 traveloka.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,traveloka.com,越南服务",
  // 配置说明：根域名 chotot.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,chotot.com,越南服务",
  // 配置说明：根域名 muaban.net 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,muaban.net,越南服务",
  // 配置说明：根域名 vietnamworks.com 及其子域 → 交给「越南服务」策略。
  "DOMAIN-SUFFIX,vietnamworks.com,越南服务",
  // 配置说明：目标 IP 属于 GeoIP VN → 交给「越南服务」策略。no-resolve：不为本条 IP 匹配额外解析域名。
  "GEOIP,VN,越南服务,no-resolve",
  // 配置说明：根域名 coolapk.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,coolapk.com,国内服务",
  // 配置说明：根域名 www.coolapk.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,www.coolapk.com,国内服务",
  // 配置说明：根域名 m.coolapk.com 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,m.coolapk.com,国内服务",
  // 配置说明：域名包含 coolapk → 交给「国内服务」策略。
  "DOMAIN-KEYWORD,coolapk,国内服务",
  // 配置说明：根域名 aliapp.org 及其子域 → 交给「国内服务」策略。
  "DOMAIN-SUFFIX,aliapp.org,国内服务",
  // 配置说明：命中规则集合 wechat → 交给「国内服务」策略。no-resolve：不为本条 IP 匹配额外解析域名。
  "RULE-SET,wechat,国内服务,no-resolve",
  // 配置说明：命中规则集合 alipay → 交给「国内服务」策略。
  "RULE-SET,alipay,国内服务",
  // 配置说明：进程名/应用包名 Code.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Code.exe,节点选择",
  // 配置说明：进程名/应用包名 code.exe → 交给「节点选择」策略。
  "PROCESS-NAME,code.exe,节点选择",
  // 配置说明：进程名/应用包名 Postman.exe → 交给「节点选择」策略。
  "PROCESS-NAME,Postman.exe,节点选择",
  // 配置说明：进程名/应用包名 JetBrains Toolbox.exe → 交给「节点选择」策略。
  "PROCESS-NAME,JetBrains Toolbox.exe,节点选择",
  // 配置说明：进程名/应用包名 idea64.exe → 交给「节点选择」策略。
  "PROCESS-NAME,idea64.exe,节点选择",
  // 配置说明：进程名/应用包名 pycharm64.exe → 交给「节点选择」策略。
  "PROCESS-NAME,pycharm64.exe,节点选择",
  // 配置说明：进程名/应用包名 webstorm64.exe → 交给「节点选择」策略。
  "PROCESS-NAME,webstorm64.exe,节点选择",
  // 配置说明：同时满足括号内条件（NOT 子条件须不匹配） → 交给「国内服务」策略。
  "AND,((NOT,((DOMAIN-SUFFIX,in.th))),(RULE-SET,cn)),国内服务",
  // 配置说明：目标 IP 属于 GeoIP CN → 交给「国内服务」策略。no-resolve：不为本条 IP 匹配额外解析域名。
  "GEOIP,CN,国内服务,no-resolve",
  // 配置说明：命中规则集合 geolocation-!cn → 交给「漏网之鱼」策略。
  "RULE-SET,geolocation-!cn,漏网之鱼",
  // 配置说明：此前均未有效命中的请求 → 交给「漏网之鱼」策略。
  "MATCH,漏网之鱼",
  "",
].join("\n");


// 将 RULES_TEXT 转为 rules 数组，过滤空行。
OVERRIDE.rules = RULES_TEXT
  .split("\n")
  .map((rule) => rule.trim())
  .filter(Boolean);


// 深拷贝，避免多个调用共享或修改 OVERRIDE 常量；main 会原地覆写客户端 config。
// 配置说明：复制普通 JSON 配置对象，避免不同调用共享可变状态。
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}


// 入口函数：客户端调用 main(config)，返回覆写后的配置。
// 配置说明：客户端覆写入口：接收现有配置并返回合并结果；后续步骤可能由客户端再次合并。
function main(config) {
  const next = deepClone(OVERRIDE);
  // 这些 TUN 字段由客户端管理；替换对象时也要保留显式设置。
  // 未设置的字段不补默认值，与 YAML 覆写保持一致。
  // dns.ipv6 / fake-ip-range6 由共同源码管理，不沿用订阅旧值；顶层 ipv6 不覆写。
  for (const [section, keys] of Object.entries({
    // 配置说明：虚拟网卡接管参数；开关、网卡和接管范围仍需客户端配合。
    tun: ["enable", "device", "mtu", "gso", "gso-max-size", "auto-redirect", "inet4-address", "inet6-address",
      "include-package", "exclude-package", "include-android-user", "include-uid", "exclude-uid", "include-uid-range", "exclude-uid-range"],
  })) {
    for (const key of keys) {
      if (config[section] && Object.prototype.hasOwnProperty.call(config[section], key)) {
        next[section][key] = deepClone(config[section][key]);
      }
    }
  }
  Object.assign(config, next);
  return config;
}

return main;
})();

// 配置说明：所在地差异：DNS 与默认候选；不含私人节点或订阅。
const ENVIRONMENT = {
  // 配置说明：DNS 解析、缓存、fake-ip 和域名专用解析器设置。
  "dns": {
    // 配置说明：启动解析器，用于解析 DNS 上游的域名。
    "default-nameserver": [
      "https://223.5.5.5/dns-query"
    ],
    // 配置说明：专门解析代理节点域名，避免解析依赖尚未建立的节点连接。
    "proxy-server-nameserver": [
      "https://223.5.5.5/dns-query#DIRECT",
      "https://doh.pub/dns-query#DIRECT"
    ],
    // 配置说明：为直连目标提供解析器。
    "direct-nameserver": [
      "https://223.5.5.5/dns-query",
      "https://doh.pub/dns-query"
    ],
    // 配置说明：域名专用 DNS；保留顺序，专属业务应先于通用集合。
    "nameserver-policy": {
      // 配置说明：命中域名集合 rule-set:private 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:private": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 jspoo.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "jspoo.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 jspoo.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".jspoo.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 tampermonkey.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "tampermonkey.net": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 tampermonkey.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".tampermonkey.net": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 aweme.snssdk.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "aweme.snssdk.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 is.snssdk.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "is.snssdk.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 getui.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "getui.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 getui.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".getui.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 getui.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "getui.net": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 getui.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".getui.net": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 gepush.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gepush.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 gepush.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gepush.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 igexin.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "igexin.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 igexin.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".igexin.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 aliapp.org 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "aliapp.org": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 aliapp.org 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".aliapp.org": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 yhglobal.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "yhglobal.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 yhglobal.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".yhglobal.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 download.nvidia.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "download.nvidia.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 download.nvidia.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".download.nvidia.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 download.nvidia.cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "download.nvidia.cn": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：域名 download.nvidia.cn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".download.nvidia.cn": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 ota.nvidia.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ota.nvidia.com": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 gfwsl.geforce.cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gfwsl.geforce.cn": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：精确域名 windowsupdate.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "windowsupdate.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 windowsupdate.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".windowsupdate.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 download.windowsupdate.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "download.windowsupdate.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 download.windowsupdate.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".download.windowsupdate.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 delivery.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "delivery.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 delivery.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".delivery.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 dl.delivery.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "dl.delivery.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 dl.delivery.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".dl.delivery.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 googleapis.cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "googleapis.cn": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 googleapis.cn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".googleapis.cn": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 steampowered.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "steampowered.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 steampowered.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".steampowered.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 steamcommunity.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "steamcommunity.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 steamcommunity.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".steamcommunity.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 steamstatic.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "steamstatic.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 steamstatic.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".steamstatic.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 steamcontent.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "steamcontent.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 steamcontent.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".steamcontent.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 epicgames.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "epicgames.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 epicgames.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".epicgames.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 epicgamescdn.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "epicgamescdn.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 epicgamescdn.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".epicgamescdn.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 battle.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "battle.net": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 battle.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".battle.net": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 blizzard.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "blizzard.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 blizzard.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".blizzard.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 riotgames.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "riotgames.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 riotgames.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".riotgames.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 ubisoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ubisoft.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 ubisoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".ubisoft.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 ea.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ea.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：域名 ea.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".ea.com": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：精确域名 accounts.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "accounts.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 accounts.google.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".accounts.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 accounts.youtube.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "accounts.youtube.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 accounts.youtube.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".accounts.youtube.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 play.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "play.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 dl.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "dl.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 dl-ssl.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "dl-ssl.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 android.apis.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "android.apis.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 android.clients.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "android.clients.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 android.googleapis.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "android.googleapis.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 gstatic.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gstatic.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 gstatic.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gstatic.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 googleusercontent.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "googleusercontent.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 googleusercontent.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".googleusercontent.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 gvt1.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gvt1.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 gvt1.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gvt1.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 gvt2.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gvt2.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 gvt2.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gvt2.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 gvt3.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gvt3.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 gvt3.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gvt3.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 ggpht.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ggpht.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 ggpht.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".ggpht.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 xn--ngstr-lra8j.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "xn--ngstr-lra8j.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：域名 xn--ngstr-lra8j.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".xn--ngstr-lra8j.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 mtalk.google.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "mtalk.google.com": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：精确域名 github.io 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "github.io": [
        "https://1.1.1.1/dns-query#GitHub",
        "https://8.8.8.8/dns-query#GitHub"
      ],
      // 配置说明：域名 github.io 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".github.io": [
        "https://1.1.1.1/dns-query#GitHub",
        "https://8.8.8.8/dns-query#GitHub"
      ],
      // 配置说明：精确域名 v2rayse.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "v2rayse.com": [
        "https://1.1.1.1/dns-query#GitHub",
        "https://8.8.8.8/dns-query#GitHub"
      ],
      // 配置说明：精确域名 displaycatalog.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "displaycatalog.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 displaycatalog.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".displaycatalog.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 prod.do.dsp.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "prod.do.dsp.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 prod.do.dsp.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".prod.do.dsp.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 do.dsp.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "do.dsp.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 do.dsp.mp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".do.dsp.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 update.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "update.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 update.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".update.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 wns.windows.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "wns.windows.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 wns.windows.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".wns.windows.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 windows.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "windows.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 windows.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".windows.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 msedge.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "msedge.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 msedge.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".msedge.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 microsoftonline.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "microsoftonline.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 microsoftonline.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".microsoftonline.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 msauth.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "msauth.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 msauth.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".msauth.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 live.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "live.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 live.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".live.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 storecatalogrevocation.storequality.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "storecatalogrevocation.storequality.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 storecatalogrevocation.storequality.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".storecatalogrevocation.storequality.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 img-prod-cms-rt-microsoft-com.akamaized.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "img-prod-cms-rt-microsoft-com.akamaized.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 img-prod-cms-rt-microsoft-com.akamaized.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".img-prod-cms-rt-microsoft-com.akamaized.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 img-s-msn-com.akamaized.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "img-s-msn-com.akamaized.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 img-s-msn-com.akamaized.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".img-s-msn-com.akamaized.net": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 manage.devcenter.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "manage.devcenter.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 manage.devcenter.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".manage.devcenter.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 share.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "share.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 share.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".share.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 pipe.aria.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "pipe.aria.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 pipe.aria.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".pipe.aria.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 api.cdp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "api.cdp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：域名 api.cdp.microsoft.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".api.cdp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 storeedgefd.dsx.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "storeedgefd.dsx.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 livetileedge.dsx.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "livetileedge.dsx.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 licensing.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "licensing.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 tsfe.trafficshaping.dsp.mp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "tsfe.trafficshaping.dsp.mp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 adl.windows.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "adl.windows.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 ctldl.windowsupdate.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ctldl.windowsupdate.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 definitionupdates.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "definitionupdates.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 msedge.api.cdp.microsoft.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "msedge.api.cdp.microsoft.com": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：精确域名 x.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "x.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 x.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".x.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 twitter.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "twitter.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 twitter.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".twitter.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 t.co 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "t.co": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 t.co 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".t.co": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 twimg.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "twimg.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 twimg.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".twimg.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 facebook.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "facebook.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 facebook.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".facebook.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 facebook.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "facebook.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 facebook.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".facebook.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 fbcdn.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "fbcdn.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 fbcdn.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".fbcdn.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 messenger.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "messenger.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 messenger.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".messenger.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 instagram.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "instagram.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 instagram.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".instagram.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 cdninstagram.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "cdninstagram.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 cdninstagram.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".cdninstagram.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 threads.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "threads.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 threads.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".threads.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 whatsapp.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "whatsapp.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 whatsapp.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".whatsapp.com": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 whatsapp.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "whatsapp.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：域名 whatsapp.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".whatsapp.net": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：精确域名 zalo.me 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "zalo.me": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 zalo.me 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".zalo.me": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 zaloapp.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "zaloapp.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 zaloapp.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".zaloapp.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 grab.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "grab.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 grab.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".grab.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 gojek.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gojek.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 gojek.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gojek.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 nhaccuatui.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "nhaccuatui.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 nhaccuatui.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".nhaccuatui.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 vnexpress.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "vnexpress.net": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 vnexpress.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".vnexpress.net": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 zalopay.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "zalopay.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 zalopay.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".zalopay.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 shopeefood.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "shopeefood.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 shopeefood.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".shopeefood.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 techcombank.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "techcombank.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 techcombank.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".techcombank.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 biz.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "biz.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 biz.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".biz.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 info.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "info.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 info.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".info.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 name.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "name.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 name.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".name.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 pro.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "pro.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 pro.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".pro.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 baomoi.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "baomoi.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 baomoi.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".baomoi.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 thegioididong.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "thegioididong.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 thegioididong.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".thegioididong.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 dienmayxanh.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "dienmayxanh.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 dienmayxanh.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".dienmayxanh.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 bachhoaxanh.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "bachhoaxanh.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 bachhoaxanh.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".bachhoaxanh.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 gearvn.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gearvn.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 gearvn.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gearvn.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 nguyenkim.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "nguyenkim.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 nguyenkim.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".nguyenkim.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 hoanghamobile.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "hoanghamobile.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 hoanghamobile.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".hoanghamobile.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 ahamove.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ahamove.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 ahamove.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".ahamove.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 fpt.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "fpt.net": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 fpt.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".fpt.net": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 ghnexpress.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "ghnexpress.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 ghnexpress.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".ghnexpress.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 vietnamairlines.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "vietnamairlines.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 vietnamairlines.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".vietnamairlines.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 vietjetair.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "vietjetair.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 vietjetair.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".vietjetair.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 bambooairways.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "bambooairways.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 bambooairways.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".bambooairways.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 vexere.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "vexere.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 vexere.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".vexere.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 traveloka.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "traveloka.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 traveloka.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".traveloka.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 chotot.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "chotot.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 chotot.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".chotot.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 muaban.net 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "muaban.net": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 muaban.net 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".muaban.net": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 vietnamworks.com 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "vietnamworks.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 vietnamworks.com 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".vietnamworks.com": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 in.th 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "in.th": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ],
      // 配置说明：域名 in.th 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".in.th": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ],
      // 配置说明：命中域名集合 rule-set:openai 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:openai": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ],
      // 配置说明：命中域名集合 rule-set:anthropic 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:anthropic": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ],
      // 配置说明：命中域名集合 rule-set:google-gemini 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:google-gemini": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ],
      // 配置说明：命中域名集合 rule-set:github-copilot 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:github-copilot": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ],
      // 配置说明：命中域名集合 rule-set:bilibili 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:bilibili": [
        "https://223.5.5.5/dns-query#哔哩哔哩港澳台",
        "https://doh.pub/dns-query#哔哩哔哩港澳台"
      ],
      // 配置说明：命中域名集合 rule-set:biliintl 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:biliintl": [
        "https://223.5.5.5/dns-query#哔哩哔哩港澳台",
        "https://doh.pub/dns-query#哔哩哔哩港澳台"
      ],
      // 配置说明：命中域名集合 rule-set:steam-cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:steam-cn": [
        "https://223.5.5.5/dns-query#游戏平台",
        "https://doh.pub/dns-query#游戏平台"
      ],
      // 配置说明：命中域名集合 rule-set:category-games-cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:category-games-cn": [
        "https://223.5.5.5/dns-query#游戏平台",
        "https://doh.pub/dns-query#游戏平台"
      ],
      // 配置说明：命中域名集合 rule-set:steam 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:steam": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：命中域名集合 rule-set:category-games-global 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:category-games-global": [
        "https://1.1.1.1/dns-query#游戏平台",
        "https://8.8.8.8/dns-query#游戏平台"
      ],
      // 配置说明：命中域名集合 rule-set:github 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:github": [
        "https://1.1.1.1/dns-query#GitHub",
        "https://8.8.8.8/dns-query#GitHub"
      ],
      // 配置说明：命中域名集合 rule-set:microsoft 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:microsoft": [
        "https://223.5.5.5/dns-query#微软服务",
        "https://doh.pub/dns-query#微软服务"
      ],
      // 配置说明：命中域名集合 rule-set:apple 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:apple": [
        "https://223.5.5.5/dns-query#苹果服务",
        "https://doh.pub/dns-query#苹果服务"
      ],
      // 配置说明：命中域名集合 rule-set:wechat 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:wechat": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：命中域名集合 rule-set:alipay 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:alipay": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：命中域名集合 rule-set:google 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:google": [
        "https://1.1.1.1/dns-query#谷歌服务",
        "https://8.8.8.8/dns-query#谷歌服务"
      ],
      // 配置说明：命中域名集合 rule-set:youtube 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:youtube": [
        "https://1.1.1.1/dns-query#YouTube",
        "https://8.8.8.8/dns-query#YouTube"
      ],
      // 配置说明：命中域名集合 rule-set:telegram 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:telegram": [
        "https://1.1.1.1/dns-query#电报消息",
        "https://8.8.8.8/dns-query#电报消息"
      ],
      // 配置说明：命中域名集合 rule-set:twitter 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:twitter": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：命中域名集合 rule-set:facebook 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:facebook": [
        "https://1.1.1.1/dns-query#Meta / X",
        "https://8.8.8.8/dns-query#Meta / X"
      ],
      // 配置说明：命中域名集合 rule-set:netflix 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:netflix": [
        "https://1.1.1.1/dns-query#Netflix",
        "https://8.8.8.8/dns-query#Netflix"
      ],
      // 配置说明：命中域名集合 rule-set:tiktok 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:tiktok": [
        "https://1.1.1.1/dns-query#TikTok",
        "https://8.8.8.8/dns-query#TikTok"
      ],
      // 配置说明：命中域名集合 rule-set:spotify 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:spotify": [
        "https://1.1.1.1/dns-query#Spotify",
        "https://8.8.8.8/dns-query#Spotify"
      ],
      // 配置说明：业务分类「vn」的公共配置项。
      "vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 com.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "com.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 com.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".com.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 net.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "net.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 net.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".net.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 org.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "org.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 org.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".org.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 edu.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "edu.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 edu.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".edu.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：精确域名 gov.vn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "gov.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：域名 gov.vn 的子域 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      ".gov.vn": [
        "https://223.5.5.5/dns-query#越南服务",
        "https://doh.pub/dns-query#越南服务"
      ],
      // 配置说明：命中域名集合 rule-set:cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:cn": [
        "https://223.5.5.5/dns-query",
        "https://doh.pub/dns-query"
      ],
      // 配置说明：命中域名集合 rule-set:geolocation-!cn 使用下列解析器；Mihomo 地址尾部 #名称 指定解析连接策略。
      "rule-set:geolocation-!cn": [
        "https://1.1.1.1/dns-query#节点选择",
        "https://8.8.8.8/dns-query#节点选择"
      ]
    },
    // 配置说明：直连目标解析仍允许采用域名专用 nameserver-policy。
    "direct-nameserver-follow-policy": true
  },
  // 配置说明：业务分类「defaults」的公共配置项。
  "defaults": {}
};

// 配置说明：将所在地 DNS 和默认选项应用到共同配置，随后进行分组精简。
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

// 配置说明：按环境精简策略组，并同步规则与 DNS 的策略引用；保留匹配条件及顺序。
function consolidateGroups(config, domestic) {
  const aliases = {
    // 配置说明：业务分类「漏网之鱼」的公共配置项。
    "漏网之鱼": "节点选择", "GitHub": "节点选择", "YouTube": "节点选择",
    // 配置说明：业务分类「Netflix」的公共配置项。
    "Netflix": "节点选择", "谷歌服务": "节点选择", "电报消息": "节点选择",
    // 配置说明：业务分类「Meta / X」的公共配置项。
    "Meta / X": "节点选择", "TikTok": "节点选择", "Spotify": "节点选择",
    // 配置说明：业务分类「微软服务」的公共配置项。
    "微软服务": "微软/苹果服务", "苹果服务": "微软/苹果服务", "全局直连": "DIRECT",
  };
  if (domestic) aliases["国内服务"] = "DIRECT";
  const removed = new Set(["韩国节点", "韩国-自动",
    ...(domestic ? ["中国节点", "中国-自动"] : [])]);
  // 手机端 JS 引擎可能没有 Object.hasOwn；借用原型方法也能正确处理无原型对象。
  const target = name => Object.prototype.hasOwnProperty.call(aliases, name) ? aliases[name] : name;
  const original = config["proxy-groups"];
  const systems = original.find(group => group.name === "微软服务")
    || original.find(group => group.name === "微软/苹果服务");
  if (!systems) throw new Error("缺少微软/苹果服务来源");
  const apple = original.find(group => group.name === "苹果服务");
  config["proxy-groups"] = original.flatMap(group => {
    if (removed.has(group.name)) return [];
    if (Object.prototype.hasOwnProperty.call(aliases, group.name) && group !== systems) return [];
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
    // 逻辑规则的 payload 内含逗号；其策略位于最后，不能误改内层 IP/端口。
    const index = ["AND", "OR", "NOT"].includes(parts[0]) ? parts.length - 1
      : ["MATCH", "FINAL"].includes(parts[0]) ? 1 : 2;
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

// 配置说明：添加 Mihomo 专属 AI 分组和 DNS 调优；不修改订阅节点。
function tuneMihomo(config) {
  const groups = config["proxy-groups"];
  const ai = groups.find(group => group.name === "AI");
  if (!ai || ai.type !== "select") throw new Error("缺少 AI 手选入口");
  const regions = ["美国", "日本", "新加坡"];
  const aiNames = new Set(regions.map(region => region + "-AI-自动"));
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
      // 配置说明：组内为测速端点，规则提供器内为下载地址；端点可达不代表业务解锁。
      url: ai.url, "expected-status": ai["expected-status"], timeout: ai.timeout };
  });
  // 普通香港组保留，但不作为 AI 的直接候选；兼容重复处理曾生成的四地区版本。
  ai.proxies = ai.proxies.filter(name => !["香港节点", "香港-自动", "香港-AI-自动"].includes(name))
    .map(name => regions.some(region => name === region + "-自动")
      ? name.replace(/-自动$/, "-AI-自动") : name);
  config["proxy-groups"] = [...groups.filter(group => !aiNames.has(group.name)
    && group.name !== "香港-AI-自动"), ...automatic];

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

// 动态节点别名仅适用于 JS：每次从输入订阅读取 hosts，不固定 IP。
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
    if (!original || !own(mappings, original)) return proxy;
    const destination = target(original);
    return destination === original ? proxy : { ...proxy, server: destination };
  });
  config.proxies = proxies;
  return config;
}

// 配置说明：客户端覆写入口：接收现有配置并返回合并结果；后续步骤可能由客户端再次合并。
function main(config) {
  return tuneMihomo(consolidateGroups(applyEnvironment(applySharedConfig(applyNodeServerAliases(config)), ENVIRONMENT), true));
}
