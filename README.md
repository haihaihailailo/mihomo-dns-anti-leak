# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomo Party / Stash / Shadowrocket 的个人 DNS 防泄露、fake-ip、TUN 参数、IPv6 与规则分流配置。

## 先按所在地选择（Mihomo / ClashMi）

新用户从下表选 **一套、一个格式** 即可；两套均包含完整公共规则和策略组，不含机场订阅。将所选文件作为机场订阅的覆写使用，不能代替机场节点。

| 使用地点 | YAML 入口 | JS 入口（客户端支持时） |
| --- | --- | --- |
| 中国大陆 | [防DNS泄露-国内版.yaml](防DNS泄露-国内版.yaml) | [防DNS泄露-国内版.js](防DNS泄露-国内版.js) |
| 越南及其他境外地区 | [防DNS泄露-国外版.yaml](防DNS泄露-国外版.yaml) | [防DNS泄露-国外版.js](防DNS泄露-国外版.js) |

| 项目 | 国内版 | 国外版 |
| --- | --- | --- |
| 普通国外服务 | 保留原代理分流 | 默认直连，可按组手动切代理 |
| AI | 保留独立 AI 组，默认美国-自动 | 同左；已知 AI 域名 DNS 也跟随 AI 组 |
| 国内服务 / 越南服务 | 默认 DIRECT | 默认 DIRECT；有回国需求和可用节点再手动切中国组 |
| 启动 / 节点 / 直连 DNS | 国内 DoH | Cloudflare / Google DoH |
| 已知国内域名 DNS | 国内 DoH | 国内 DoH 跟随国内服务；切回国时也经所选出口查询 |
| 默认 DNS 兜底 | 保留国内 GeoIP 判断与经节点选择的外部 DNS | 不使用 CN GeoIP 兜底；默认 DNS 跟随节点选择（首选 DIRECT） |
| TUN / IPv6 / 运行模式 | 由客户端决定 | 由客户端决定 |

- 国外版将 `节点选择`、`GitHub`、`电报消息` 的首选改为 `DIRECT`；YouTube、Google、Netflix、Meta / X、游戏、TikTok、Spotify 和漏网流量默认沿现有策略跟随 `节点选择`。AI 不随之切直连；不需要代理且当地可用时可手动选择 `AI → DIRECT`。
- 国外版只有未使用的全局 `自动选择` 改为懒测速；各组测速地址、超时、间隔和容差不变。测速不能保证服务解锁或吞吐速度。
- 已知微软域名 DNS 在国外版改用全球 DoH、跟随 `微软服务`，避免仍按国内 DNS 选 CDN。国内域名查询继续交给国内 DNS，这是显式分流，不代表所有 DNS 都经海外节点。
- **不自动识别所在地，也不自动重置已保存选择。** 上表描述没有选择缓存时的默认值；`profile.store-selected` 会保留旧手选，切换版本后须在客户端核对这三个首选组及 AI、国内服务、越南服务。尤其回到国内后，不要遗留 `节点选择 = DIRECT`。
- 境外直连可达性取决于所在地网络，不保证所有国家/网络都能直连 Telegram 等服务；失败时在对应业务组手动选择可用代理。
- **中国组只有 REJECT = 没有匹配回国节点**。两套均不把回国节点纳入全局自动选择，也不强迫国内软件走空中国组。
- 仅适用于支持本仓库 Mihomo 字段的客户端；ClashMi 需内核与覆写合并功能支持，并核对实际生效配置。Stash / Shadowrocket 继续使用各自原文件，本次未生成它们的两地版本。

### 切换与回退

1. 先在客户端备份当前配置与手动策略选择。
2. 停用原主覆写和额外的 `Windows-国内网络覆写.*` / 本地国内 DNS 补充层，改为所选国内版或国外版，**不要同时叠加两套或再次追加旧补充层**。保留机场订阅。
3. TUN、IPv6、系统代理和运行模式仍在软件里选择。要使用这些分流，应选择规则模式；文件不会强制切模式。
4. 查看最终 DNS、上述策略组、实际连接日志；确认账号登录、工作站点和手机业务。不只看测速绿灯。
5. 回退时停用新入口，恢复备份或原来的主覆写 + 原补充层组合，并恢复原手选。本文不要求清除全部客户端缓存，也不修改本机运行配置。

## 文件

- `防DNS泄露.yaml`：主配置，适合 Mihomo / Clash Meta / Clash Party / Mihomo Party 的 YAML 覆写或配置片段使用。
- `防DNS泄露.js`：JavaScript 覆写版本，适合 Clash Party / Mihomo Party 的 JS 覆写功能使用。
- `stash.stoverride`：Stash 覆写配置，适合 Stash 的 override 导入使用。
- `shadowrocket.conf`：Shadowrocket 专用配置，策略组、回国节点关键词和测速端点单独按其语法维护。
- `防DNS泄露-国内版.yaml` / `.js`、`防DNS泄露-国外版.yaml` / `.js`：从共有主配置生成的两地入口。直接选择一套，不叠加主配置或旧补充层；不要手改生成文件。
- `Windows-国内网络覆写.yaml` / `Windows-国内网络覆写.js`：旧入口兼容用的国内 DNS 补充层，在旧主配置之后二选一应用；新国内版已内置其 DNS 设置，无需再叠加；不用于 Stash / Shadowrocket。
- `.github/scripts/build_profiles.cjs`：两地 DNS 与默认策略差异的维护来源，生成四个入口；`validate_profiles.cjs` 由现有离线验证入口调用。

## 功能

- DNS 防泄露：Mihomo 启用 `respect-rules`，国内域名使用国内 DoH，代理节点域名另走加密启动 DNS，避免递归；旧主配置/国内版的外部 DNS 跟随 `节点选择`，国外版见上表。Stash 使用 `follow-rule` 与独立的代理节点 DNS；Shadowrocket 主、备用 DNS 均使用 DoH，备用公共 DoH 强制经代理。
- IPv6：Mihomo YAML、JS 与 Stash 覆写不强制开启或关闭 IPv6，跟随客户端/软件自身设置；Shadowrocket 版本当前显式关闭 IPv6，以降低 iOS 隧道外泄风险。
- fake-ip：显式使用 `fake-ip-filter-mode: blacklist`，对局域网、路由器、NTP、推送等域名返回真实 IP，降低局域网和系统服务异常概率。
- TUN 参数：主配置提供 DNS 劫持和局域网绕过参数，但不写入 `tun.enable`；是否启用 TUN / VPN 由客户端软件决定。启用后，国内应用由包名和域名规则精确分流。
- Stash 适配：提供 `stash.stoverride`，保留 DNS、Sniffer、策略组、规则集和分流规则。
- Sniffer 稳定性：对局域网、路由器、NTP、Apple Push、QQ/微信本地登录等域名配置 `skip-domain`，避免被嗅探误改写目标。
- 规则分流：覆盖大量国内 App 包名、中国域名库、微信/支付宝专属规则，补充常用越南支付、银行、电商、出行 App 包名，并覆盖 AI、Google、YouTube、GitHub、微软、Telegram、Netflix、TikTok、Spotify、Apple、哔哩哔哩等常见场景。中国版哔哩哔哩走 `国内服务`，国际版保留在 `哔哩哔哩港澳台`。
- 两地使用：`国内服务` 和 `越南服务` 均默认 `DIRECT`，在中国或越南按所在地手动切换需要的跨境策略，选择会由 `profile.store-selected` 保留。
- 分组测速：Mihomo / JS 与 Shadowrocket 的手动业务组使用对应服务的小型 HTTPS 端点，地区手动组与自动组使用对应地区端点；中国组使用百度 200。Mihomo 的 `select` 组不设置 `interval`，只提供按需测速，不改变手动选路逻辑；含 `REJECT` 的广告组不测速。
- Stash 测速边界：自动组继续使用各自的地区端点；手动 `select` 组保留 `interval: -1`。Stash 对同一代理在多个组间共享测速结果，若要真正使用不同测试参数需要复制代理，因此本覆写不写入无效的“每组独立 URL”。
- 节点归类：支持 `HK/HKG`、`TW/TWN/TPE`、`JP/NRT/HND/KIX`、`SG/SGP/SIN`、`US/USA`、`KR/ICN/SEL`、`VN/HCM/HCMC/SGN/HAN`、`CN/China` 等常见代码或机场名，并使用英文字母边界避免误命中普通英文单词；带明确境外地区信息或仅写 `CN2` 的线路不会仅因“中国/CN2”字样误入中国组。
- 回国节点隔离：`回国`、`港广`、`港沪`、`港深`、`沪港`、`深港`、`广中` 在地区分类中只进入中国组，并从全局 `自动选择` 和所有非中国地区组排除；仍可在 `全部节点` 中手动选择。
- 空组保护：Mihomo 的所有订阅筛选组使用 `empty-fallback: REJECT`，筛选不到节点时不会静默直连。
- 订阅提示过滤：`全部节点` 与全局 `自动选择` 除中文提示外，还排除以 `Traffic:`、`Expire:`、`Expiry:`、`Expiration:` 开头的流量/到期占位节点；不因线路带“实验性”字样而禁用节点。

## 使用方法

### YAML 覆写

适合使用 Mihomo v1.19.27 或更新内核、并支持 YAML 覆写、配置片段或 merge/override 的客户端。`empty-fallback` 从 v1.19.27 起可用。

1. 复制 `防DNS泄露.yaml` 的内容。
2. 在客户端的覆写/扩展配置中粘贴或引用该文件。
3. 更新订阅后检查策略组是否出现 `节点选择`、`漏网之鱼`、`国内服务`、`越南服务`、`AI`、`谷歌服务` 等分组。
4. 运行一次配置测试，确认无 YAML 解析错误和规则引用错误。

### JavaScript 覆写

适合支持 JavaScript override 的 Clash Party / Mihomo Party 客户端。

1. 复制 `防DNS泄露.js` 的内容。
2. 在客户端中新建 JavaScript 覆写。
3. 确认入口函数为 `main(config)`，并返回修改后的 `config`。
4. 更新订阅后检查 DNS、TUN、Sniffer、策略组和规则是否生效。

### Stash 覆写

适合 Stash iOS/tvOS 3.6+ 或 macOS 4.3+；这些版本支持加密启动 DNS 与独立的代理节点 DNS。

1. 使用 `stash.stoverride`。
2. 在 Stash 的 Override / 覆写配置中导入。
3. 更新订阅后检查 DNS、Sniffer、策略组、规则集和分流规则是否生效。

## 使用注意

### 国内网络补充层（跨平台 Mihomo）

以下仅针对继续使用旧 `防DNS泄露.yaml` / `.js` 的用户。新国内版已包含这些 DNS 参数；新国外版不得再叠加该层。

当国内 DoH 可达，而 `1.1.1.1` / `8.8.8.8` 的 HTTPS DNS 直连失败时，可在主覆写之后追加 `Windows-国内网络覆写.js`（客户端支持 JS 时推荐）或 YAML 版本。它使用国内 DoH 进行启动解析、节点解析和直连解析；保留主配置的 `nameserver-policy`、经代理的境外 DNS、地区分组与选择。这套参数来自 Windows / Sparkle 的排障，但不包含 Windows 命令、网卡名或本机路径；其他支持 Mihomo 覆写的客户端也可按网络条件使用。出境后先禁用这层，恢复通用配置并重新验证；本层不会自动判断所在地，其他平台仍需实机验证。

- 本层保留客户端运行模式。`Global` 会绕过业务分流；切到 **规则 / Rule** 前，先核对 Codex 等关键应用的策略与节点连通性，避免切换后无法连接。
- `find-process-mode: strict` 让内核按规则需要识别进程；保留主配置的应用规则。若客户端强制覆盖此字段，应在客户端核对实际值。
- 主配置不强制进程识别模式，Mihomo 默认就是 `strict`。路由器不能按远端手机 App 进程识别流量；此类设备可在最后一层设置 `find-process-mode: off`，依靠域名/IP 分流。
- TUN 和 IPv6 继续由客户端管理。本层不修改 TUN、MTU、网卡绑定、系统 DNS 或 Windows 路由表。
- 系统代理模式仅接管遵循系统代理设置的应用，不能据此保证所有应用及其 DNS 都被接管。有其他 VPN / 隧道时，先核对其路由，再由客户端决定是否启用 TUN。
- YAML 补充层必须合并到主配置并替换列出的 DNS 数组，不能单独当成完整配置使用。撤销时禁用补充层即可恢复原 DNS 和进程识别设置。

字段语义参考 [Mihomo 全局配置](https://wiki.metacubex.one/config/general/) 与 [DNS 配置](https://wiki.metacubex.one/config/dns/)。

### 通用注意事项

- 本配置默认启用 fake-ip；TUN 是否启用由客户端/软件决定。主配置包含启用 TUN 后使用的 DNS 劫持参数，建议先备份原客户端配置。
- Android 场景下，进入 VPN 且被客户端正确识别包名的微信/支付宝流量由应用规则送往 `国内服务`，但优先的局域网、广告等规则仍然生效。分应用黑名单中绕过 VPN 的 App 不受这些规则控制；跳转外部浏览器的 H5、其他进程发起的请求也不保证沿用原 App 策略。桌面微信有独立进程规则，远程域名规则同时覆盖不支持 Android 包名匹配的客户端。
- Stash iOS/tvOS 与 Shadowrocket 不能按 Android 包名实现“整个 App”分流；这两类客户端通过维护中的微信/支付宝域名、User-Agent 和 IP/ASN 规则覆盖已知流量，但未来出现的全新第三方内嵌域名仍需按连接日志补充。
- Stash 版本不建议直接照搬主配置的 `tun` 段，应交给客户端管理隧道。
- Stash 官方语义会把“筛选后没有任何节点”的策略组当作 `DIRECT`，且没有 Mihomo `empty-fallback` 的等价字段；导入订阅后必须确认 `中国节点/中国-自动`、`越南节点/越南-自动` 等准备使用的地区组非空。
- 在中国使用：保持 `国内服务 = DIRECT`；如需访问越南本地服务，可将 `越南服务` 切换为 `越南-自动`。
- 在越南或其他境外地区使用：`国内服务` 可先保持 `DIRECT`；确实需要大陆出口且订阅提供可用回国节点时，再切换为 `中国-自动` 或 `中国节点`。中国组只有 `REJECT` 时表示没有匹配节点，不能靠配置获得回国能力。在越南时 `越南服务` 保持 `DIRECT`，其他地区按需选择可用越南节点。
- 配置无法可靠判断当前公网所在地，因此不硬编码自动切换；`profile.store-selected` 会记住手动选择，跨境后只需切换一次对应策略组。
- 国外版的已知 AI 域名使用 AI 组解析，不保证仅按进程识别的请求、未知第三方域名或绕过 VPN 的应用也使用同一 DNS 出口；不能将其视为整个系统零泄露保证。
- 系统更新、局域网、NTP、推送等既有直连规则保持不变。
- Steam 中国 CDN 与中国大陆游戏域名默认走 `国内服务`，海外游戏域名进入 `游戏平台`，两者按规则顺序隔离。
- NVIDIA 驱动下载的 `download.nvidia.com` / `download.nvidia.cn`（含子域名）以及 `ota.nvidia.com` / `gfwsl.geforce.cn` 精确直连，优先于 NVIDIA 进程代理规则；其他 NVIDIA 服务不改变。国内版使用国内 DoH 获取 CDN 地址，国外版使用境外直连 DoH。网络下载成功不代表驱动安装或 NVIDIA App 自身故障也已解决。
- `midea` 相关域名固定直连，避免客户/工作相关系统误走代理。
- 如修改策略组名称，必须同步修改 `rules`、`nameserver-policy`、JS 覆写版本和 Stash 覆写版本。

## 维护口径

### TUN / IPv6 / 订阅故障先分层判断

- 开机后 TUN 全部超时且日志出现 `reject loopback connection` 时，先检查网卡转发、其他 VPN/互联软件的后台服务和路由。关闭软件界面的“开机启动”不代表其 Windows 服务已停止。不要通过关闭防火墙、跳过证书校验或反复更换 DNS 掩盖回环；具体服务的停用应由设备所有者确认并保留回退。仓库不自动修改这些系统设置。
- 顶层 `ipv6`、`dns.ipv6` 与公网 IPv6 连通性是不同层：DNS 关闭 AAAA 不等于关闭 Windows IPv6，也不保证应用自带 IPv6 地址可达。按 [Mihomo DNS 文档](https://wiki.metacubex.one/config/dns/#ipv6) 对实际 DNS 监听端口做 UDP/TCP 的 A/AAAA 查询；控制 API 的上游查询不能替代这一验证。
- 测试原生 IPv6 时，确认实际出口地址族；域名嗅探可能把请求重新解析为 IPv4。国内/国外入口均不强制 IPv6 开关，不能把一台设备的公网 IPv6 失败套用到所有用户。
- 系统代理和 TUN 同时开启时，显式 HTTP 代理请求与不使用 HTTP 代理、进入 TUN 的请求可用于比较入口，但这不是“系统代理单独开启”的对照实验。网站 200/404 只证明相应请求的结果，不能替代 App 登录、长连接、后台切换和移动网络实测。
- Sub-Store 更新出现 HTTP 403，应先检查上游订阅的下载授权、限时开关或链接有效期；组合订阅的一个来源失败不等于全部节点失效。不要公布带 token 的日志，也不要以关闭 TLS 验证修复 403。修改订阅源和放宽错误处理需要另行确认。

### 通用配置与设备设置的边界

- 主配置承载各设备可复用的域名/应用分流、DNS 策略、回国隔离和测速参数；两地入口通过生成器同步共有部分，环境差异不绑定某家机场。旧国内 DNS 补充层仅供旧入口兼容使用。
- JS 主覆写保留客户端显式的 `tun.enable`、`tun.inet6-address`、`dns.ipv6`、`dns.fake-ip-range6`，以及原有顶层 `mode` / `ipv6`。未设置时不自行添加，客户端后续覆写仍可能改变最终值。
- 不下发订阅地址、具体节点选择、代理环境变量、系统代理开关、网卡名、MTU、Windows 路由或其他 VPN 的设置。更换机场后核对所选地区组非空，切换所在地后检查已保存的手选策略。
- 验证顺序：先检查最终合并配置，再观察连接日志中的命中规则和出口，然后测试实际登录/业务。测速 URL 可达只证明该端点可达，不等于吞吐速度、服务解锁或整个 App 正常。
- 回退：取消国内补充层；主配置更新则重新导入更新前版本。导入前备份客户端配置与手选策略，不直接修改客户端生成的运行配置。

### 同步与验证

- `防DNS泄露.yaml` 是主配置。
- `防DNS泄露.js` 与主 YAML 保持功能同步。
- 两地入口由主 YAML / JS 和生成器内的环境差异共同生成；不维护两份独立规则副本。开发依赖仅用于生成和测试，客户端不需要 Node.js 或 npm。
- `stash.stoverride` 是 Stash 专用版本，保留 DNS、Sniffer、策略组、规则集和规则分流；IPv6 跟随 Stash 自身设置。
- `shadowrocket.conf` 使用 Shadowrocket 原生语法；地区组筛选、双地默认策略和测速端点与主配置保持语义同步。
- 以后修改主配置时，需要同步检查 JS、Stash 和 Shadowrocket 三类版本。
- 修改公共主配置或环境差异后，先 `npm ci --ignore-scripts --no-audit --no-fund` 安装锁定的 YAML 开发依赖，再 `npm run build:profiles` 更新四个入口；唯一离线验证入口仍为 `python .github/scripts/validate_health_checks.py`。仅检查生成文件有无过期可运行 `npm run check:profiles`，不会写文件。
- CI 对两地入口新增全对象 YAML/JS 对比、生成漂移检查、引用/循环检查、默认出口、DNS、回国隔离、空组保护和客户端 TUN/IPv6 保留测试，并分别运行 Mihomo 配置加载。测试数据为合成节点，不访问订阅或切换本机网络。
- CI 会自动校验主 YAML 解析、主 JS 语法、主 YAML/JS 全配置同步、规则引用完整性、Stash 覆写解析、Shadowrocket 关键策略语义和 mihomo 加载测试。
- CI 会检查 `unified-delay`、`profile`、`geo-auto-update`、`geo-update-interval`、`tcp-concurrent`、`sniffer`、`tun`、`dns`、`proxy-groups`、`rule-providers`、`rules` 是否在主 YAML 和主 JS 中保持一致。
- CI 每天自动运行一次，用于尽早发现 Mihomo 最新版本、远程规则集或下载链路变化导致的问题。
- Dependabot 会每周检查 GitHub Actions 依赖更新。
