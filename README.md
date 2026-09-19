# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomo Party / OpenClash / Stash / Shadowrocket 的个人 DNS 防泄露、fake-ip、TUN 参数、IPv6 与规则分流配置。

## 先按所在地选择（Mihomo / ClashMi）

新用户从下表选 **一套、一个格式** 即可；两套均包含完整公共规则和策略组，不含机场订阅。将所选文件作为机场订阅的覆写使用，不能代替机场节点。

| 使用地点 | YAML 入口 | JS 入口（客户端支持时） |
| --- | --- | --- |
| 中国大陆 | [防DNS泄露-国内版.yaml](防DNS泄露-国内版.yaml) | [防DNS泄露-国内版.js](防DNS泄露-国内版.js) |
| 越南及其他境外地区 | [防DNS泄露-国外版.yaml](防DNS泄露-国外版.yaml) | [防DNS泄露-国外版.js](防DNS泄露-国外版.js) |

| 项目 | 国内版 | 国外版 |
| --- | --- | --- |
| 普通国外服务 | 合并到节点选择，默认自动选择 | 合并到节点选择，默认 DIRECT，可手动切代理 |
| AI | 独立 AI 组，默认美国-AI-自动；已知 AI 域名 DNS 跟随 AI | 同左；只在所选地区的 AI 候选节点内自动测速 |
| 其余国内流量 | 已有独立业务组优先；其余国内规则 DIRECT，不设国内服务和中国组 | 已有独立业务组优先；其余国内服务默认 DIRECT，按需回国 |
| 越南服务 / 微软/苹果服务 | 独立分组，默认 DIRECT | 同左 |
| 启动 / 节点 / 直连 DNS | 国内 DoH | Cloudflare / Google DoH |
| 已知国内域名 DNS | 国内 DoH | 国内 DoH 跟随国内服务；切回国时也经所选出口查询 |
| 默认 DNS 兜底 | 保留国内 GeoIP 判断与经节点选择的外部 DNS | 不使用 CN GeoIP 兜底；默认 DNS 跟随节点选择（首选 DIRECT） |
| TUN / 顶层 IPv6 / 运行模式 | 由客户端决定 | 由客户端决定 |
| DNS 双栈 fake-ip | 内置 `dns.ipv6: true` 与 IPv6 fake-ip 地址池 | 同左 |

- GitHub、YouTube、Netflix、Google、Meta / X、TikTok、Spotify 和漏网流量归入 `节点选择`。Telegram 使用独立的 `电报消息` 组，国内/国外入口均默认 `新加坡-自动`，可单独切换香港或其他地区；Mihomo 的 Telegram 专用 DNS 同步跟随该组。地区接近不保证头像、视频或通话质量，仍须实测。`游戏平台` 保持独立，默认跟随节点选择。Mihomo 的 AI 默认 `美国-AI-自动`；不需要代理且当地可用时可手动选择 `AI → DIRECT`。
- Mihomo 两地版所有自动组使用 `lazy: true`、`tolerance: 100`，保留 300 秒间隔和 10000 毫秒超时。减少闲置探测及小幅延迟波动造成的选路变化，不保证提速或解决 SSL 报错。若订阅通过 proxy-providers 引入，其自身健康检查仍须在客户端核对。`微软/苹果服务` 默认 DIRECT，原有业务/地区测速端点不变。
- 已知微软域名 DNS 在 Mihomo 国外版使用全球 DoH、跟随 `微软/苹果服务`；原 Google、YouTube、GitHub DNS 策略引用同步改为 `节点选择`。国内域名查询继续交给国内 DNS，这是显式分流，不代表所有 DNS 都经海外节点。
- **不自动识别所在地，也不自动重置已保存选择。** 上表描述没有选择缓存时的默认值；`profile.store-selected` 会保留旧手选，切换版本后核对节点选择、AI、越南服务、微软/苹果服务，以及国外版的国内服务。尤其回到国内后，不要遗留 `节点选择 = DIRECT`。
- 境外直连可达性取决于所在地网络；合并业务失败时在 `节点选择` 手动选择可用代理，Telegram 则在 `电报消息` 组单独切换。
- **Mihomo 国外版中国组只有 REJECT = 没有匹配回国节点**。国内版已删除中国两个组；两版仍不把回国节点纳入全局自动选择，不强迫国内软件走空中国组。
- 上述 YAML / JS 仅适用于支持本仓库 Mihomo 字段的客户端；ClashMi 需内核与覆写合并功能支持，并核对实际生效配置。Stash / Shadowrocket 使用下方各自的原生格式，不混用 Mihomo 文件。

### Stash / Shadowrocket（苹果客户端）

| 客户端 | 中国大陆使用 | 越南及其他境外地区使用 |
| --- | --- | --- |
| Stash | [stash-国内版.stoverride](stash-国内版.stoverride) | [stash-国外版.stoverride](stash-国外版.stoverride) |
| Shadowrocket | [shadowrocket-国内版.conf](shadowrocket-国内版.conf) | [shadowrocket-国外版.conf](shadowrocket-国外版.conf) |

- 六套入口保留同一业务分流骨架：Stash / Shadowrocket 国内版 22 组、国外版 25 组，AI 仍首选 `美国-自动`；Mihomo 另加 3 个隐藏地区 AI 组，总计 25 / 28 组。相较合并 Telegram 的版本增加一个可见的 `电报消息` 组。节点选择在国内首选自动选择、国外首选 DIRECT；越南服务、微软/苹果服务及国外版国内服务默认 DIRECT。韩国两个组均删除。
- Stash 国内版使用国内 DoH 启动/节点解析；国外版改用 Cloudflare / Google DoH，并调整微软等服务 DNS，专属 geosite 策略优先于通用 cn。两版保留 `follow-rule`、独立节点解析和 `#!replace`；国外版仅将全局自动组改为懒测速，其他测速参数不变。[Stash DNS](https://stash.wiki/en/features/dns-server)、[覆写合并语义](https://stash.wiki/en/configuration/override)。
- Shadowrocket 国内版保留国内主 DNS 和经代理的备用 DNS，节点解析只使用国内 IP 型 DoH；国外版主、备用、节点 DNS 改为境外 DoH，不强制让备用 DNS 依赖默认代理。两版继续禁用系统 DNS 回退，保留现有 IPv6 和隧道旁路设置，不新增未验证的 Mihomo 字段。
- **DNS 出口不能跨客户端等同。** Stash 使用自身的 `follow-rule`，Shadowrocket 保留自身 DNS 逻辑；不承诺像 Mihomo 两地版 AI / 国外版回国策略一样，将已知域名 DNS 逐项绑定到同名业务组。AI 请求走 AI 组不等于所有相关 DNS 都走同一出口。
- Stash 每次仅启用一个地区覆写；Shadowrocket 每次仅启用一个地区配置，并保留已导入的订阅节点。跨境后核对已保存的手动选择，尤其不能在国内遗留 `节点选择 = DIRECT`。
- 两个旧通用入口 `stash.stoverride`、`shadowrocket.conf` 已移入内部生成来源；旧导入 URL 不会自动转向新文件，请手动更换。生成与静态回归通过不代表 iOS / macOS 实机通过，导入后仍需检查登录、长连接、规则命中和空地区组。

### OpenClash 路由器专用模板

| 路由器所在网络 | 公共 YAML 模板 | OpenClash 远程覆写模块 |
| --- | --- | --- |
| 中国大陆 | [防DNS泄露-路由器-国内版.yaml](防DNS泄露-路由器-国内版.yaml) | [国内版模块](防DNS泄露-路由器-国内版.conf) |
| 越南及其他境外地区 | [防DNS泄露-路由器-国外版.yaml](防DNS泄露-路由器-国外版.yaml) | [国外版模块](防DNS泄露-路由器-国外版.conf) |

- 两种格式由同一 Mihomo 地区配置生成，不另维护 JS。YAML 是**不含节点的公共模板**，须在本地副本加入 `proxies` 或 `proxy-providers` 后导入；不要用公共 YAML URL 更新覆盖私人节点文件。
- 希望“机场订阅独立更新、公共规则跟随仓库”时，使用 `.conf` **覆写模块**：机场链接仅加入 OpenClash 的“配置订阅”，模块的 GitHub Raw 链接加入“覆写模块 → 订阅链接 → http”，仅绑定目标机场配置。国内/国外只启用一个；不要将模块当机场 YAML 导入。先下载校验，再启用，保留旧配置供回退。
- 模块复用 [OpenClash v0.47.156 ruby_edit](https://github.com/vernesong/OpenClash/blob/v0.47.156/luci-app-openclash/root/usr/share/openclash/ruby.sh) 的 `[Overwrite]` 接口，整段替换公共策略组、规则集、规则和 DNS 策略，不残留机场旧规则引用；保留设备字段，并对订阅节点执行下述限定适配。DNS 仅保留本地 `listen`、`ipv6`、`fake-ip-range6`，其余按公共模板替换。Base64 承载公共 JSON 及仓库固定 Ruby 源码，避免 Shell/Ruby 二次转义损坏；这不是加密，也不含私有订阅。修改应通过生成器，不手改编码内容。
- 两份 CONF 已内置 SS 精确 hosts 别名适配及限定花云 UDP 修复，无需换路由器后另装 Ruby 文件。代码在独立 Module 中加载，只执行仓库固定源码；订阅的 hosts/节点始终按数据处理。TFO、MPTCP、UOT、smux 等其他字段保持输入值。纯 YAML 无法执行此动态适配，使用 Sub-Store 已处理输出或选择 CONF 模块。
- 远程模块属于可执行覆写，更新前应审查来源和变更；可将 Raw URL 中的 `main` 换为已验证的完整 commit SHA 固定版本，回退时停用该模块并恢复原配置。静态/合成验证不代表所有 OpenClash 版本兼容；更新后须核对最终生效配置。
- 移除全部 `PROCESS-*` 规则及桌面 TUN 块，明确使用 `find-process-mode: "off"`（引号不可省略，兼容 OpenClash 的 YAML 1.1 处理）。路由器无法识别远端手机包名，因此 NVIDIA/AMD 等整进程直连不再适用，只保留已有精确域名规则；不承诺整个应用的未知域名都被覆盖。[Mihomo 进程匹配模式](https://wiki.metacubex.one/config/general/)
- OpenClash 本地负责运行模式、DNS 监听、TUN/透明转发、防火墙、端口、认证、接管设备及启动设置。使用分流应选择规则模式；不向公共文件写网卡名、IP 白名单、密钥、订阅 URL 或节点密码。公共模板不指定 `dns.listen`、顶层 `ipv6`、`dns.ipv6` 或 IPv6 fake-ip 池。
- 先按 IPv4 部署；不使用 IPv6 时，路由器 LAN 的 RA/DHCPv6 和 OpenClash IPv6 代理/DNS 开关应保持一致，不能仅靠模板防止绕过。以后开启 IPv6，须在本地同时验证接管、DNS 和客户端实际路由；本模板不自动开关路由器 IPv6。
- 保留模板的 DNS 策略、`respect-rules`、嗅探及测速语义；在 OpenClash 覆写设置中核对最终运行配置，避免额外自定义 DNS/规则覆盖它们。规则集及 GEO 缓存是路由器本地数据；首次启动应确认下载完成、组内确有可用节点，再测试业务。
- 需要临时开启下载权限的机场，应先在机场网站开启，再手动更新本地订阅。缓存缺失仍可能触发首次下载；不在公共模板加入特定机场更新地址或保证缓存永远可用。
- 验收先限一台设备，避免与电脑/手机代理重复接管；核对日志命中和真实登录后再扩大范围。回退时恢复原来的本地配置及接管范围。公开模板通过静态/内核加载不等于已在你的 OpenClash、手机或全网完成实测。

### 桌面与手机切换与回退

1. 先在客户端备份当前配置与手动策略选择。
2. 停用客户端中已有的原版覆写和国内 DNS 补充层，改为所选国内版或国外版，**只启用一套、一个格式，不再叠加补充层**。保留机场订阅。仓库已移除旧的 `防DNS泄露.yaml` / `.js` 与 `Windows-国内网络覆写.yaml` / `.js` 入口；仍引用旧 URL 的客户端须手动更换，新文件不会自动替换旧导入项。
3. TUN、顶层 IPv6、系统代理和运行模式仍在软件里选择；Mihomo 两版的 DNS 双栈 fake-ip 已内置。要使用这些分流，应选择规则模式；文件不会强制切模式。
4. 查看最终 DNS、上述策略组、实际连接日志；确认账号登录、工作站点和手机业务。不只看测速绿灯。
5. 回退时停用新入口，从导入前的客户端备份恢复配置与手选；旧文件也可从 Git 历史找回。本文不要求清除全部客户端缓存，也不修改本机运行配置。

## 文件

公开入口共 **8 套、12 个文件**：Mihomo 桌面/手机、OpenClash 路由器、Stash、Shadowrocket 各有国内版和国外版；其中 Mihomo 每套提供 YAML / JS，路由器每套提供公共 YAML / 远程覆写模块 CONF。内部共同源码不作为额外配置入口。

- `防DNS泄露-国内版.yaml` / `.js`：中国大陆使用的 Mihomo 覆写，已内置国内 DNS 设置。
- `防DNS泄露-国外版.yaml` / `.js`：越南及其他境外地区使用的 Mihomo 覆写。
- `防DNS泄露-路由器-国内版.yaml` / `防DNS泄露-路由器-国外版.yaml`：OpenClash 公共模板，私有订阅与设备设置由路由器本地维护。
- `防DNS泄露-路由器-国内版.conf` / `防DNS泄露-路由器-国外版.conf`：同源生成的 OpenClash 远程覆写模块；不是 Shadowrocket 配置。
- `stash-国内版.stoverride` / `stash-国外版.stoverride`：Stash 原生地区覆写。
- `shadowrocket-国内版.conf` / `shadowrocket-国外版.conf`：Shadowrocket 原生地区配置。
- `.github/config/shared.yaml` / `shared.js` / `shared.stoverride` / `shared.conf`：只供维护与生成使用的共同源码，不导入客户端；Mihomo YAML / JS 保持全配置同步，苹果格式按各自语义维护。
- `.github/scripts/build_profiles.cjs`：统一生成十二个入口文件；苹果环境差异在 `build_native_profiles.cjs` 中维护，路由器投影在 `build_router_profiles.cjs` 中维护；`consolidate_groups.cjs` 统一精简最终分组、规则目标和 DNS 策略引用。校验均由唯一离线入口调用。

### 仓库维护导航

| 位置 | 用途 | 维护方式 |
| --- | --- | --- |
| 根目录十二个公开配置文件 | 客户端订阅和导入入口 | 保留文件名与路径；由生成器更新，不直接手改 |
| [共同源码](.github/config/) | 各客户端共享配置 | 从这里及生成器维护配置逻辑 |
| [生成与校验脚本](.github/scripts/) | 环境投影、同步及回归检查 | 通过统一生成命令和唯一验收入口运行 |
| [GitHub Actions](.github/workflows/) | 源码检查、双内核测试、公开端点检测 | CI 成功不代表设备或业务实测通过 |
| [手机分应用名单](blacklist/README.md) | 手机名单参考 | 与路由器按域名/IP 分流区分；不自动修改手机 |
| [生成物管理](.github/ARTIFACTS.md) / [容量策略](.github/artifact-policy.json) | 新测试产物登记、容量与保留规则 | 只管理已登记对象，不接管历史目录 |
| `package.json` / `package-lock.json` | 生成和测试依赖 | 使用锁定依赖，不提交 `node_modules/` |

本地的 `.generated/`、历史 `*.tmp` 和指定交接记录不属于公开配置，已由忽略规则隔离。**被 Git 忽略不等于可删除**：历史目录可能含恢复文件、客户端私有备份和审计证据，整理前须逐项核验并取得目标级授权。不要移动公开入口来整理目录，以免破坏现有订阅 URL；不要移动历史现场来掩盖占用或长路径问题。

开发时先读 [AGENTS.md](AGENTS.md)，验证方式见下方“同步与验证”；平台验收限制见 [生成物管理文档](.github/ARTIFACTS.md)。

## 功能

- DNS 防泄露：Mihomo 启用 `respect-rules`，国内域名使用国内 DoH，代理节点域名另走加密启动 DNS，避免递归；国内版的外部 DNS 跟随 `节点选择`，国外版见上表。Stash 使用 `follow-rule` 与独立的代理节点 DNS；Shadowrocket 主、备用 DNS 均使用 DoH，仅国内版强制备用 DoH 经代理。
- IPv6：Mihomo YAML / JS 不强制顶层 `ipv6` 开关，但两地 DNS 均内置 `ipv6: true` 和 `fake-ip-range6: fdfe:dcba:9876::1/64`，详见下方双栈说明。Stash 沿用自身 IPv6 设置；Shadowrocket 版本当前显式关闭 IPv6，以降低 iOS 隧道外泄风险。
- fake-ip：显式使用 `fake-ip-filter-mode: blacklist`，对局域网、路由器、NTP、推送等域名返回真实 IP，降低局域网和系统服务异常概率。
- TUN 参数：主配置提供 DNS 劫持和局域网绕过参数，但不写入 `tun.enable`；是否启用 TUN / VPN 由客户端软件决定。启用后，国内应用由包名和域名规则精确分流。
- Stash 适配：提供两地 `.stoverride`，保留 DNS、Sniffer、策略组、规则集和分流规则。
- Sniffer 稳定性：对局域网、路由器、NTP、Apple Push、QQ/微信本地登录等域名配置 `skip-domain`，避免被嗅探误改写目标。
- 规则分流：覆盖大量国内 App 包名、中国域名库、微信/支付宝专属规则，补充常用越南支付、银行、电商、出行 App 包名，并覆盖 AI、Google、YouTube、GitHub、微软、Telegram、Netflix、TikTok、Spotify、Apple、哔哩哔哩等常见场景。哔哩哔哩国内版/国际版域名及已知 App 包名统一进入 `哔哩哔哩港澳台`，不再随国内大集合直接分流。
- 两地使用：国内版的国内规则直接 DIRECT；国外版的国内服务默认 DIRECT，按需回国。越南服务两地均默认 DIRECT，可手动切换越南节点；选择会由 `profile.store-selected` 保留。
- 分组测速：Mihomo / JS 与 Shadowrocket 的手动业务组使用对应服务的小型 HTTPS 端点，地区手动组与自动组使用对应地区端点；中国组使用百度 200。Mihomo 的 `select` 组不设置 `interval`，只提供按需测速，不改变手动选路逻辑；含 `REJECT` 的广告组不测速。
- Stash 测速边界：自动组继续使用各自的地区端点；手动 `select` 组保留 `interval: -1`。Stash 对同一代理在多个组间共享测速结果，若要真正使用不同测试参数需要复制代理，因此本覆写不写入无效的“每组独立 URL”。
- Mihomo 的 `美国-AI-自动`、`日本-AI-自动`、`新加坡-AI-自动` 直接筛选对应地区的叶节点，使用 `https://auth.openai.com/favicon.ico`、预期状态 200，与 AI 手动检测口径一致；不会套在普通地区自动组外面。三组均隐藏且不跨地区自动回退；AI 仍保留这三个地区手选和 DIRECT。隐藏需要客户端界面支持，并不代表候选列表中不可选。
- Mihomo JS/YAML 与 OpenClash CONF/YAML 保留订阅来源前缀，如 `【花云】`、`【赔钱】`、`【火箭】`、`【自建泰国】`，仅用于区分节点，不按来源分配流量。普通自动组和三个 AI 自动组都接受所有订阅，继续按地区、回国隔离和提示节点规则筛选；AI 组仍使用 AI 专用测速端点。更新时撤销旧版生成的来源排除项，没有前缀的旧订阅保持原行为，空候选仍为 REJECT，已有手动选择可继续保留。来源前缀应在 Sub-Store 单条订阅的能力处理后添加，组合保留单条能力设置；前缀不证明节点支持或业务质量。苹果原生入口不执行此 Mihomo 投影。
- AI 地区名仅按订阅名称归类，不证明实际出口地区或服务可用。香港不在目前的 [ChatGPT 官方支持地区名单](https://help.openai.com/en/articles/7947663-chatgpt-supported-countries)中，因此 Mihomo AI 不提供香港自动或手动直接候选，普通香港组仍供其他业务使用。手动选择 `节点选择` / `DIRECT` 时须自行核对出口。图标 200 不代表聊天/流式响应正常，更不能证明 Claude/Gemini 等全部 AI 服务解锁。空候选保持 `REJECT`。
- Sub-Store 的节点导出不携带完整配置的 `hosts`，因此应在单条订阅中、能力处理之后和来源前缀之前应用别名适配。`.github/scripts/substore_node_aliases.cjs` 的 `buildSubstoreAliases()` 复用本仓库算法，生成可粘贴为脚本操作的内容，读取 Sub-Store 的 `context.raw`，不固化入口地址，保留 UDP/TFO/MPTCP。不要把此操作放到组合中；映射冲突或循环会报错，不混用不同来源的 hosts。
- 更新后请核对 `AI → 美国-AI-自动`；旧 `美国-自动` 等候选被替换为对应 AI 专用组，客户端的旧缓存不一定自动迁移。普通地区手动组继续可见，其他业务组不引用新增 AI 组。
- 节点归类：保留香港、台湾、日本、新加坡、美国、越南手动及自动组；国外版另有中国组。使用常见代码和机场名，带英文字母边界避免误匹配；带明确境外地区信息或仅写 `CN2` 的线路不因此误入中国组。韩国只删除独立分组，订阅节点仍可进入全部节点和全局自动选择。
- 回国节点隔离：`回国`、`港广`、`港沪`、`港深`、`沪港`、`深港`、`广中` 从全局 `自动选择` 和所有非中国地区组排除；国外版可进入中国组，两地仍可在 `全部节点` 中手动选择。
- 空组保护：Mihomo 的所有订阅筛选组使用 `empty-fallback: REJECT`，筛选不到节点时不会静默直连。
- 订阅提示过滤：`全部节点` 与全局 `自动选择` 除中文提示外，还排除以 `Traffic:`、`Expire:`、`Expiry:`、`Expiration:` 开头的流量/到期占位节点；不因线路带“实验性”字样而禁用节点。

### 同一业务统一归组（2026-09-14）

- `哔哩哔哩港澳台` 是整个 B站业务的手动出口入口，不是只识别国际版，也不会识别番剧后自动切地区。默认仍为 DIRECT；需要时手动切香港/台湾等对应节点。手机须先让 B站进入 VPN 白名单，修改组才有效。
- 域名使用 [MetaCubeX bilibili 全量集合](https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/bilibili.list) 加原 biliintl 补充：主站、账号、直播、短链、图片、视频 CDN、B站游戏和国际版归同一组。共享 CDN 只匹配专属主机名，不放行整个 Akamai/AWS/Cloudinary 根域名。新增 bilibili 使用 MRS（Mihomo/Stash）或 DOMAIN-SET（Shadowrocket），每份 Mihomo/Stash 有 28 个规则集。
- Mihomo 覆盖 7 个已知包名：`tv.danmaku.bili`、`tv.danmaku.bilibilihd`、`com.bilibili.app.blue`、`com.bilibili.app.in`、`com.bilibili.comic`、`com.bilibili.comic.intl`、`com.bstar.intl`。补充来源为 [BiliBili 维护规则](https://github.com/blackmatrix7/ios_rule_script/blob/master/rule/Clash/BiliBili/BiliBili.yaml)；不使用可能误匹配其他应用的包名前缀通配。
- 游戏平台统一已有游戏规则与包名，新增 Steam Android / steam.exe / steamwebhelper.exe 整应用归组；不再保留国内游戏 CDN 的固定直连出口。已收录的穿越火线、OPLUS/小米游戏服务同步进入游戏平台。
- 微软/苹果服务同步补充 Outlook、OneDrive、Teams、Apple Music 的 Android 包名；Copilot 独立归 AI，GitHub 仍归节点选择。Edge/Chrome 等浏览器不整体绑定某家厂商分组，访问什么服务就按服务域名分流。
- 已有 Perplexity、Cursor、Windsurf 的 App/进程属于 AI；同步补齐其已知域名，避免网页和 App 出口不同。域名依据 MetaCubeX 的 [Perplexity](https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/perplexity.list)、[Cursor](https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cursor.list)、[Windsurf](https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/windsurf.list) 列表，仅保留必要的专属共享 CDN 主机。
- Mihomo 生成器同步业务 DNS：已识别域名和域名规则集的 DoH 连接使用同名业务组；AI 仍使用独立的国际 DoH。B站/越南/微软苹果在国内版用国内 DoH、国外版用国际 DoH，查询路径跟随其分组；游戏国内集合在国内版用国内 DoH，其余游戏集合用国际 DoH。节点启动 DNS 保持 DIRECT，原有网站/驱动例外不变。Stash 仅按原生规则补专属 DNS 分类，不注入 Mihomo 的 `#组名`。
- 局域网、广告规则仍优先；用户明确保留的 NVIDIA/AMD 整进程、驱动下载和特定网站直连不被取消。规则模式、TUN/IPv6、手机白名单和所有组默认选择/测速参数都不因此次归组变化而调整。
- “统一”覆盖目前维护源和已知应用标识，不保证未来新增域名、未知第三方 SDK 或白名单外应用。整应用规则仍优先于后续域名分类：一个已归组 App 内嵌别家内容时，命中 App 规则的连接跟随这个 App；DNS 仍按域名归组，跨业务场景下可能与 App 出口不同，不保证所有请求的两者完全一致。外部浏览器请求按自己的规则处理。
- `validate_service_ownership.cjs` 经唯一入口检查六套配置的首条匹配、B站与游戏/微软集合重叠、通用工具兜底、业务 DNS 和负向控制；离线模型不等同于设备实测。

### AI 专属域名与共享服务边界（2026-09-14）

- 六套入口不再将 `auth0.com`、`statsigapi.net`、`intercom.io`、`intercomcdn.com` 整根强制交给 AI。这些分别是多租户登录、统计和客服基础设施，不是 AI 专属域名；参考 [Auth0 租户域名](https://auth0.com/docs/get-started/auth0-overview/create-tenants)、[Statsig 域名](https://docs.statsig.com/infrastructure/statsig_domains)、[Intercom CSP](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)。官方网络放行清单不是独占的分流归属清单。
- 已命中整应用规则的 ChatGPT 等连接仍跟随 AI；浏览器访问共享基础设施时按剩余正常规则分流，不强制 DIRECT，也不声称能仅凭共享主机名判断来源网页。`auth0.openai.com` 等 AI 自有域名继续归 AI。已识别域名的 DNS 绑定保留，移除的共享后缀不再强制绑定 `#AI`。
- 明确将 `copilot.microsoft.com` 网页入口归 AI，与已有 `com.microsoft.copilot` 包名一致；Mihomo 同步 `#AI` DNS，Stash 使用自身 DNS 策略。依据 [Microsoft Copilot 客户端说明](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-app-overview)，只补精确网页入口，不把整个 Bing、MSN、微软登录或更新服务挪到 AI；这不等于穷尽全部 Copilot 企业功能或共享依赖。
- Shadowrocket 的 OpenAI / Claude / Gemini / GitHub Copilot 改用与 Mihomo、Stash 同源的 MetaCubeX 纯域名 `DOMAIN-SET`，取消旧 classical 集合中按共享根域、关键词及云厂商 ASN 归 AI 的规则。三端格式不同、上游会更新，不承诺文件逐字相同或所有第三方主机都已证明独占。
- 回归包含共享根域负例、双 Copilot 入口和 DNS 正例；联网下载器检查实际 AI 文本规则，隔离 Mihomo 用真实 MRS/文本快照检查 DNS 选路。离线合成样本、公开快照及客户端实测是不同证据层，不能互相替代。
- Mihomo 两地版对 Gemini 专属的 `gemini.gstatic.com` 及其子域增加 AI DNS 例外，避免被通用 `.gstatic.com` DNS 提前接管。普通 Google 静态资源仍走原策略，不把共享 `gstatic.com` 根域整体归 AI；隔离内核回归覆盖根域、子域、相似域名和删除例外的负向控制。
- Mihomo 的 `.vn`、`.com.vn` 等地域 DNS 兜底后置于专属业务集合：Google / YouTube 越南域名继续跟随节点选择，普通越南业务继续跟随越南服务。只改变地域匹配顺序，不更换 DNS 服务器或越南服务默认值；两环境均有真实规则快照及恢复错误顺序的负向对照。

## 使用方法

### YAML 覆写

适合使用 Mihomo v1.19.27 或更新内核、并支持 YAML 覆写、配置片段或 merge/override 的客户端。`empty-fallback` 从 v1.19.27 起可用。

1. 按所在地复制 `防DNS泄露-国内版.yaml` 或 `防DNS泄露-国外版.yaml` 的内容，只选一个。
2. 在客户端的覆写/扩展配置中粘贴或引用该文件。
3. 更新订阅后检查 `节点选择`、`AI`、`越南服务`、`游戏平台`、`微软/苹果服务` 等分组；只有国外版包含国内服务和中国两个组。
4. 运行一次配置测试，确认无 YAML 解析错误和规则引用错误。

### JavaScript 覆写

适合支持 `main(config)` JavaScript override 的 Clash Party / Mihomo Party，以及提供 JS 覆写入口的 Clash Mi 版本；需核对客户端最终生效配置。

1. 按所在地复制 `防DNS泄露-国内版.js` 或 `防DNS泄露-国外版.js` 的内容，只选一个，不再叠加 YAML 版本。
2. 在客户端中新建 JavaScript 覆写。
3. 确认入口函数为 `main(config)`，并返回修改后的 `config`。
4. 更新订阅后检查 DNS、TUN、Sniffer、策略组和规则是否生效。

国内版和国外版 JS 已集成节点域名别名转换：每次读取当前订阅的 `hosts`，将支持的 SS 节点 `server` 改为精确域名别名，不固定 IP、不逐节点配置；名称、端口、认证、混淆 host 和分组引用保持原值。仅支持普通 SS 和明确指定 `plugin-opts.host` 的 `obfs/http` SS；其他协议、TLS、通配符及 `proxy-providers` 内部节点不转换，IP 映射由内核处理。没有匹配项时保持原样；循环/非法目标等会抛出覆写错误，修正订阅或回退原入口后再连接，不声称客户端必然阻止使用旧配置。

花云直订阅曾将 SS 节点全部标为 `udp: false`。JS 和 OpenClash CONF 仅对订阅 `hosts` 中存在 `.aws-agent.com` → `.apt-agent.dev` 精确域名关系的 `obfs/http` SS 节点（含已转换的目标域名）设为 `udp: true`；其他节点的 UDP 原样保留。该识别不依赖节点名字，也不启用 UOT、TFO、MPTCP、smux 或顶层 IPv6。供应商将来更换域名关系时须重新核对，不能保证自动识别；没有该关系的输入不强制启用。UDP 开关与实际双向连通性分别验证，域名转换也不保证改善延迟或修复 Telegram 媒体。

从 YAML 切换的 Clash Mi 用户：保留原机场订阅，导入同地区 JS 并选为该订阅的覆写，停用原 YAML，避免两套叠加；客户端自己的 DNS/TUN 末层覆写仍需核对。[官方覆写顺序](https://clashmi.app/guide/faq#clashmi覆写是如何工作的)。重新连接后，在最终配置中检查节点 `server` 是否等于本次订阅的别名目标，并核对上述花云节点的 `udp: true`；其他节点字段和设备设置应保留。回退时停用 JS 并重新启用原 YAML；GitHub 文件更新不代表手机已经导入或生效。

Clash Mi 1.0.29.1503 Android 曾在 `consolidateGroups` 报 `TypeError: not a function`：旧 JS 调用了部分引擎没有的 `Object.hasOwn`。两地入口已统一使用兼容的 `Object.prototype.hasOwnProperty.call`，同时修复 AI DNS 中的同类调用，不修改全局 JS 对象。遇到旧错误时先更新客户端中的远程 **JS 覆写文件**，仅更新机场订阅不会替换缓存的覆写脚本。离线回归会禁用该 API，比较两地完整输出、节点别名、设备字段及幂等，并逐一恢复四处旧调用确认测试能检出；这不等于手机实机验收。[兼容写法说明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn#description)。

### Stash 覆写

适合 Stash iOS/tvOS 3.6+ 或 macOS 4.3+；这些版本支持加密启动 DNS 与独立的代理节点 DNS。

1. 按所在地选择 `stash-国内版.stoverride` 或 `stash-国外版.stoverride`。
2. 在 Stash 的 Override / 覆写配置中导入。
3. 更新订阅后检查 DNS、Sniffer、策略组、规则集和分流规则是否生效。

### Shadowrocket 配置

1. 按所在地导入 `shadowrocket-国内版.conf` 或 `shadowrocket-国外版.conf`，只启用一个。
2. 配置不含节点，保留自己的订阅；将全局路由设置为“配置”以使用文件中的规则。
3. 核对策略组手选、节点匹配与实际连接；IPv6 和隧道相关参数沿用原配置，不因切换地区自动开启。

## 使用注意

### 两地版本与客户端设置

国内版已包含国内 DoH 启动解析、节点解析和直连解析，不再提供独立国内补充层。国外版使用对应的境外 DNS 策略；跨境时更换入口并核对手动选择，不自动判断所在地。

- 两地版本保留客户端运行模式。`Global` 会绕过业务分流；切到 **规则 / Rule** 前，先核对 Codex 等关键应用的策略与节点连通性，避免切换后无法连接。
- 两地版本不强制进程识别模式，保留客户端设置。Mihomo 默认的 `strict` 按规则需要识别进程；路由器不能按远端手机 App 进程识别流量，此类设备可在最后一层设置 `find-process-mode: off`，依靠域名/IP 分流。
- TUN 和顶层 IPv6 开关继续由客户端管理，DNS 双栈参数由 Mihomo 公共配置提供；不下发本机专属 MTU、网卡绑定、系统 DNS 或 Windows 路由表修改。
- 系统代理模式仅接管遵循系统代理设置的应用，不能据此保证所有应用及其 DNS 都被接管。有其他 VPN / 隧道时，先核对其路由，再由客户端决定是否启用 TUN。
- YAML 入口作为机场订阅的覆写使用，DNS 数组须按入口替换，不能再次追加旧补充层；导入后检查最终合并结果。

字段语义参考 [Mihomo 全局配置](https://wiki.metacubex.one/config/general/) 与 [DNS 配置](https://wiki.metacubex.one/config/dns/)。

### 通用注意事项

- 本配置默认启用 fake-ip；TUN 是否启用由客户端/软件决定。主配置包含启用 TUN 后使用的 DNS 劫持参数，建议先备份原客户端配置。
- Android 场景下，进入 VPN 且被客户端正确识别包名的微信/支付宝流量，在国内版由应用规则送往 DIRECT，在国外版送往国内服务；优先的局域网、广告等规则仍然生效。**分应用白名单之外的 App 不进入 VPN，不能由仓库分组改成代理或回国**；黑名单绕过的 App 同理。白名单内的浏览器/其他 App 仍可能访问国内域名，因此国内版继续保留国内直连规则。国外需要某 App 回国时，还须先在客户端允许它进入 VPN。跳转外部浏览器的 H5、其他进程的请求不保证沿用原 App 策略。包名白名单由手机管理，仓库不覆写。
- Stash iOS/tvOS 与 Shadowrocket 不能按 Android 包名实现“整个 App”分流；这两类客户端通过维护中的微信/支付宝域名、User-Agent 和 IP/ASN 规则覆盖已知流量，但未来出现的全新第三方内嵌域名仍需按连接日志补充。
- Stash 版本不建议直接照搬主配置的 `tun` 段，应交给客户端管理隧道。
- Stash 官方语义会把“筛选后没有任何节点”的策略组当作 `DIRECT`，且没有 Mihomo `empty-fallback` 的等价字段；导入订阅后必须确认 `中国节点/中国-自动`、`越南节点/越南-自动` 等准备使用的地区组非空。
- 在中国使用：选择国内版，国内规则直接 DIRECT，不再提供国内服务/中国组开关；如需访问越南本地服务，可将 `越南服务` 切换为 `越南-自动`。
- 在越南或其他境外地区使用：`国内服务` 可先保持 `DIRECT`；确实需要大陆出口且订阅提供可用回国节点时，再切换为 `中国-自动` 或 `中国节点`。中国组只有 `REJECT` 时表示没有匹配节点，不能靠配置获得回国能力。在越南时 `越南服务` 保持 `DIRECT`，其他地区按需选择可用越南节点。
- 配置无法可靠判断当前公网所在地，因此不硬编码自动切换；`profile.store-selected` 会记住手动选择，跨境后只需切换一次对应策略组。
- Mihomo 两地版的已知 AI 域名使用 AI 组解析，节点域名解析仍使用独立直连 DNS。不保证仅按进程识别的请求、未知第三方域名或绕过 VPN 的应用也使用同一 DNS 出口；同名策略也不意味着 DNS 缓存与每条连接永远使用同一 IP，不能将其视为整个系统零泄露保证。
- 系统更新、局域网、NTP、推送等既有直连规则保持不变。
- 用户指定的[聚神铺](https://www.jspoo.com/)（`jspoo.com` 根域名及子域名）在两地版均固定 DIRECT，位于广告规则之后、通用业务规则之前。Mihomo / Stash 的 DNS 随国内或国外环境使用对应解析器，不跟随回国组；导航页里的第三方外链继续按各自域名分流。
- Tampermonkey 的 `tampermonkey.net` 根域名及子域名（包括 `accounts.tampermonkey.net`）在六套入口中直连，位置在既有网站例外之后、业务规则之前；Mihomo / Stash 的专用 DNS 随国内/国外环境使用对应解析器，避免被通用国外集合改走代理。仅调整这个域名后缀，不放行整个浏览器进程，也不改变 Google、Microsoft 等第三方登录和云同步服务的分流。保留扩展同步与 TLS 验证；端点可达不代表整个 OAuth 流程已通过。[Tampermonkey 同步说明](https://www.tampermonkey.net/faq.php?locale=en&q=Q105)
- Steam 中国 CDN、中国大陆及海外游戏域名统一进入 `游戏平台`，Steam 包名/进程也进入该组；是否直连由组内选择决定。该组仍默认跟随节点选择，因此国内版默认可能代理游戏下载、消耗订阅流量；需要直连下载时手动选 DIRECT。B站专属游戏域名先归入 `哔哩哔哩港澳台`，不被游戏大集合截走。
- Windows 的 NVIDIA App / GeForce Experience 与 AMD Software 在两地 Mihomo YAML/JS 中按进程 DIRECT，位于广告之后、业务域名之前；包含 `NVIDIA App.exe`、`NVIDIA GeForce Experience.exe`、`NvContainer.exe`、`NVDisplay.Container.exe`、`nvngx_update.exe`、`AMDSoftware.exe`、`AMDRSServ.exe`、`AMDInstallManager.exe`。登录、商店、遥测也会直连；依赖代理的功能可能受影响。客户端须能识别进程，转到外部浏览器或其他进程的请求仍按自身规则分流；不添加通用 `setup.exe`，不改变 Intel 助手，也不将 Windows 进程规则写进苹果入口。
- 原有 `download.nvidia.com` / `download.nvidia.cn`（含子域名）及 `ota.nvidia.com` / `gfwsl.geforce.cn` 域名直连继续保留，供浏览器等其他程序下载使用；这些域名在国内版使用国内 DoH，国外版使用境外直连 DoH。其他 DNS 策略不因进程规则而改变。进程命中 DIRECT 或短时端点可达，不等于实际驱动下载、安装或 TUN 下的长连接已通过。
- `midea` 相关域名固定直连，避免客户/工作相关系统误走代理。
- 如修改策略组名称，必须同步修改 `rules`、`nameserver-policy`、JS 覆写版本和 Stash 覆写版本。

## 维护口径

### 规则源选型（2026-09-13 审核）

规则更多、更新更频繁并不自动代表分流更准确。本仓库优先选择仍在维护、原生格式匹配、覆盖边界清楚的来源，不叠加多个全量广告库。

| 用途 | 当前来源与格式 | 选择理由 / 边界 |
| --- | --- | --- |
| Mihomo / Stash 常用服务、中国域名与地域分类 | [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)，保留原有 MRS | 上游定期汇总维护中的数据；大域名集继续使用优化格式，不因更换广告源一并改成 classical。[Stash 支持的格式](https://stash.wiki/en/rules/rule-set) |
| 三类客户端广告过滤 | [秋风 AWAvenue Only.Ads](https://github.com/TG-Twilight/AWAvenue-Ads-Rule/blob/main/assets/README_Update.md) | 选纯广告版，不额外叠加其 Privacy / Unwelcome 分类。Mihomo、Stash 用 Clash Classical YAML，Shadowrocket 用 Surge RULE-SET，以保留相同的精确域名、后缀和关键词语义。覆盖较保守，不追求最大拦截量，也不保证零误杀。 |
| 微信 / 支付宝 | [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 的专属规则 | Mihomo、Stash 微信改为 `WeChat_No_Resolve.yaml`，规则调用继续带 `no-resolve`；Shadowrocket 原微信源的 ASN 已带该标记。支付宝保留原源，`aliapp.org` 本地补充保留。 |
| OpenAI / Claude / Gemini / GitHub Copilot | MetaCubeX 同名域名集合 | Mihomo、Stash 的 OpenAI 保持 MRS，其余三组用 domain/text；Shadowrocket 四组均用同源 `.list` 的 DOMAIN-SET。在 Google、GitHub、微软等通用规则之前归 AI；Microsoft Copilot 网页另有精确补充。不是新增策略组，也不保证覆盖所有 AI 产品。 |
| Shadowrocket 中国域名 | blackmatrix7 的 `China_Domain.list` | 按[上游调用说明](https://github.com/blackmatrix7/ios_rule_script/blob/master/rule/Shadowrocket/China/README.md)使用 `DOMAIN-SET`，不再将纯域名内容当 `RULE-SET`。不扩大为实验性 ChinaMax。 |

- 广告缓存使用独立路径，避免旧 MRS 与新 classical 文件混用。切换后若业务异常，先查看是否命中 `广告过滤`，可临时将该组改为 DIRECT 对照；不需要关闭 TLS 证书校验或清空全部客户端数据。
- 微信 / 支付宝的 classical provider 用于 DNS 策略时，Mihomo 只取其中域名规则，相关提示不表示 ASN 也参与 DNS 匹配。`no-resolve` 避免仅为匹配 IP/ASN 而触发解析，不禁止业务请求本身的正常 DNS 查询。
- 新增来源由 `validate_rule_sources.cjs` 检查格式、缓存隔离、AI 优先级和 DNS 同步，并纳入唯一离线验证入口。离线测试不能保证远程源永远可用；上游文件会继续变化，实机仍须核对命中日志。手机 ChatGPT 的 SSL 提示、支付或导航体验不能仅凭更换规则集宣告修复。
- 上游误分类的临时隔离（2026-09-15）：`category-games-cn` 经 [Tencent 游戏源](https://github.com/v2fly/domain-list-community/blob/5d939545c84e2a534f8e85ba6ffb2b51fa18fb76/data/tencent-games#L20) 收入整个 `in.th` 公共注册后缀，已解码的 `cn.mrs` 也包含它。两地版对国内游戏/国内域名集合使用 AND/NOT 排除该后缀后继续后续匹配，不增加全后缀 DIRECT 或固定节点规则；原有具体业务域名、整应用规则和 GeoIP 条件仍保留，规则源与每日更新不变。这是配置侧隔离，不是上游数据修复。
- DNS 同步隔离：Mihomo 为 `in.th` 与子域使用通用境外 DoH、解析连接跟随 `节点选择`，优先级低于具体业务域名、高于过宽集合；Stash 用 `+.in.th` 的境外 DoH 策略覆盖独立 geosite 误分类，保留 `follow-rule`，不套用 Mihomo 的 `#策略组` 语法。[Stash DNS 优先级](https://stash.wiki/en/features/dns-server)
- 隔离范围与回退：当前国内游戏文本集合没有独立登记的 `in.th` 游戏子域。今后若有真实游戏使用该后缀，需要明确域名及对应 DNS 例外，或待上游修正后连同隔离条件一起复核；不能靠整个公共后缀推断游戏归属。公开规则检查会提示此类新增游戏条目。撤销须同时核对路由和 DNS，不能只删其中一层。隔离内核测试只证明 Mihomo 条件匹配；Stash/Shadowrocket 仍需原生客户端导入验收。

### 首条匹配与优先级

- Mihomo 的 DNS 策略有顺序语义：私有域名优先，其次是已有明确域名例外、AI 等专属服务，最后才是通用服务及国内/国外大集合。不能只比对键值而忽略顺序；两地版 AI 的 `#AI` 解析策略必须早于 `geolocation-!cn` 等重叠规则。[Mihomo DNS](https://wiki.metacubex.one/config/dns/)
- VS Code、Postman 和 JetBrains 等通用开发工具的进程兜底位于所有专属业务域名规则之后：AI、B站、游戏、微软/苹果、越南等已知服务各归其组，未识别开发流量仍是节点选择。Teams 两个进程统一进入微软/苹果服务。
- 微信、支付宝整应用选路仍在 AI 域名规则之前：国内版 DIRECT，国外版国内服务。未进入 VPN 的应用不受这些规则控制；这次没有改动手机分应用名单。
- Stash 将 OpenAI 与其他 AI 的 geosite DNS 策略一起放在通用 geosite 之前；它使用自己的 DNS 机制，不能把 Mihomo 的 `#策略组` 语法套用到 Stash。

- 普通 GitHub 的 DNS 策略先于 Microsoft 和通用集合，避免 GitHub 网页、API、Raw、头像、静态资源和 Pages 被微软集合提前匹配；Copilot 的 AI 策略仍更优先。Mihomo 两地版的 GitHub DNS 跟随节点选择；Stash 按自身 geosite 顺序使用对应 DNS。[Stash DNS 匹配说明](https://stash.wiki/en/features/dns-server)

### TUN / IPv6 / 订阅故障先分层判断

- 开机后 TUN 全部超时且日志出现 `reject loopback connection` 时，先检查网卡转发、其他 VPN/互联软件的后台服务和路由。关闭软件界面的“开机启动”不代表其 Windows 服务已停止。不要通过关闭防火墙、跳过证书校验或反复更换 DNS 掩盖回环；具体服务的停用应由设备所有者确认并保留回退。仓库不自动修改这些系统设置。
- 顶层 `ipv6`、`dns.ipv6` 与公网 IPv6 连通性是不同层：DNS 关闭 AAAA 不等于关闭 Windows IPv6，也不保证应用自带 IPv6 地址可达。按 [Mihomo DNS 文档](https://wiki.metacubex.one/config/dns/#ipv6) 对实际 DNS 监听端口做 UDP/TCP 的 A/AAAA 查询；控制 API 的上游查询不能替代这一验证。
- 测试原生 IPv6 时，确认实际出口地址族；域名嗅探可能把请求重新解析为 IPv4。国内/国外入口均不强制顶层 IPv6 开关，不能把一台设备的公网 IPv6 失败套用到所有用户。
- 系统代理和 TUN 同时开启时，显式 HTTP 代理请求与不使用 HTTP 代理、进入 TUN 的请求可用于比较入口，但这不是“系统代理单独开启”的对照实验。网站 200/404 只证明相应请求的结果，不能替代 App 登录、长连接、后台切换和移动网络实测。
- Sub-Store 更新出现 HTTP 403，应先检查上游订阅的下载授权、限时开关或链接有效期；组合订阅的一个来源失败不等于全部节点失效。不要公布带 token 的日志，也不要以关闭 TLS 验证修复 403。修改订阅源和放宽错误处理需要另行确认。

### Mihomo 两地共用 DNS 双栈 fake-ip（2026-09-15）

- 国内版、国外版的 YAML / JS 均内置 `dns.ipv6: true` 与 `dns.fake-ip-range6: fdfe:dcba:9876::1/64`；既有 IPv4 池、上游 DNS、业务 DNS 策略、过滤表和路由规则不变。[Mihomo DNS 参数说明](https://wiki.metacubex.one/config/dns/#fake-ip-range6)
- 用于避免部分 Windows 多网卡 / TUN 环境在空 AAAA 响应后长时间等待。此前单台 Windows / Sparkle 对照测试有效，不代表所有设备或网站都存在同一原因，也不保证解决手机 ChatGPT 的 SSL 提示。
- **覆写顺序变更：** JS 不再保留输入中的旧 `dns.ipv6` / `dns.fake-ip-range6`，而是与 YAML 一样使用本仓库值；顶层 `ipv6` 与 TUN 开关仍由客户端决定。客户端关闭顶层 IPv6 时，Mihomo 不建立 IPv6 fake-ip 池；客户端末层再次覆写 DNS 时，以最终合并结果为准。[最低支持内核的解析实现](https://github.com/MetaCubeX/mihomo/blob/v1.19.27/config/config.go)
- IPv6 fake-ip 是核心内部域名映射，不等于公网 IPv6 出口可用，也不会修改物理网卡 DNS。需要使用它时，客户端须开启顶层 IPv6 并正确接管 IPv6 流量；系统代理只覆盖遵循代理设置的应用，不能保证其他应用能处理这些虚拟地址。命中过滤表的域名仍取真实解析，真实 IPv6 连通性须另测。
- 已有本机 Windows DNS6 补充层的用户：先更新所选地区版，确认最终配置含以上两项，再停用同值补充层并复核，保留备份供回退。无需新增第三个导入入口。本次仓库修改不会自动删除本机补充层或更新任何设备。
- 本项只适用于 Mihomo YAML / JS，不将字段复制进 Stash / Shadowrocket 原生入口。离线回归检查缺省/旧输入、顶层开关保留、幂等和负向控制；可选隔离内核测试检查 UDP A/AAAA 映射、局域网过滤及关闭开关/删除地址池的结果，不作为手机或全机 TUN 实测。
- IPv4-only CI 中，双栈合成测试仅为自建回环子进程设置内核支持的 `SKIP_SYSTEM_IPV6_CHECK=true`，避免宿主地址检查提前清空测试池；不设置到客户端或公共配置，也不修改网卡/路由。生产环境仍受内核宿主 IPv6 检查约束，缺少合适的 IPv6 地址时不保证建立池。[内核检查实现](https://github.com/MetaCubeX/mihomo/blob/v1.19.27/config/utils.go)

### 国内业务域名与推送例外

- `aweme.snssdk.com`、`is.snssdk.com` 使用精确域名规则；`getui.com`、`getui.net`、`gepush.com`、`igexin.com` 覆盖根域名及子域名。十二个公开入口同步更新，国内版 DIRECT，国外版跟随 `国内服务`，位置在广告及既有网站例外之后、其他业务规则之前。
- Mihomo 使用对应的国内 DoH，国外版解析连接绑定 `#国内服务`；Stash 保留国内 DoH 和原生 `follow-rule`。Shadowrocket 只同步路由，保留自身全局 DNS 机制，不套用其他客户端的域名 DNS 语法。
- 不放行整个 `snssdk.com`，不改变 `i.snssdk.com`、`ecomuser.snssdk.com` 或 TikTok 的既有分流。广告规则仍优先；推送域名例外不表示其所有请求都免于广告过滤。
- 离线回归覆盖两地路由/DNS、广告重叠、开发工具进程、相似域名边界及删除规则/DNS 的负向控制。它不证明所有客户端实机正常。若本地自定义覆写已加入相同域名补丁，更新后先核对最终生效配置，再决定是否移除重复的本地域名补丁；节点 UDP 设置须单独保留和核对。

### 可选：阻止 Mihomo 的末尾 UDP 直连回退

[Mihomo v1.19.31 的规则匹配实现](https://github.com/MetaCubeX/mihomo/blob/v1.19.31/tunnel/tunnel.go#L615-L668) 会跳过声明不支持 UDP 的目标；遍历后没有可用匹配时返回 DIRECT。这与节点连接超时不同。服务商支持 UDP 时，应先核对最终节点配置及实际双向通信，不能仅凭 `udp: true` 判断可用。

需要拒绝这种末尾回退时，可在本地规则模式配置的最后一个 `MATCH` **之后**加入下面一行，保留原有全部规则及 MATCH 目标：

```yaml
rules:
  # 此处保留全部既有规则
  - MATCH,节点选择
  - NETWORK,udp,REJECT
```

这是可选的本地配置，公共入口不自动加入，也不统一强制节点启用 UDP。前面的 MATCH 目标支持 UDP 时照常命中；被跳过后才可能走到 REJECT。代价是这部分 UDP 请求失败，通话、游戏或 QUIC 可能受影响，能否改用 TCP 取决于应用。

此行不能阻止此前已命中的 DIRECT，也不能保证被跳过的专属业务规则仍走原业务组；它不检测实际节点故障，不适用于全局/直连模式或所有其他客户端，不是整机零泄露保证。启用后检查最终规则、UDP 命中与真实业务；回退时仅移除本地新增的这一行。

### 通用配置与设备设置的边界

- 用户指定服务器例外：Mihomo 国内/国外 YAML、JS 仅将 `47.81.15.184` 的 **TCP 22** 连接设为 DIRECT，位于既有局域网/广告/网站例外之后、应用分流之前，避免 TUN 代理出口与 SSH 来源白名单不一致。采用 [AND 逻辑规则](https://wiki.metacubex.one/config/rules/#and-or-not)，IP 子规则带 `no-resolve`；不扩展到其他主机、该主机的其他端口、UDP 或整个 `ssh.exe` 进程。此条按仓库所有者要求公开，其他用户不需要该例外时可删除；服务器地址未来变动需重新核对。
- 这不修改云安全组、服务器防火墙、SSH 密钥或系统路由，也不保证动态公网 IP 永远与白名单一致；Stash / Shadowrocket 的原生配置本次不变。

- 内部共同源码承载各设备可复用的域名/应用分流、DNS 策略、回国隔离和测速参数；两地入口通过生成器同步共有部分，环境差异不绑定某家机场。
- 两地 JS 覆写保留输入中显式的 `tun.enable`、`tun.device`、`tun.mtu`、`tun.gso`、`tun.gso-max-size`、`tun.auto-redirect`、`tun.inet4-address`、`tun.inet6-address` 和原有顶层 `mode` / `ipv6`。未设置时不自行添加这些设备参数；`dns.ipv6` / `dns.fake-ip-range6` 则使用上述公共值。这不等于信任订阅里的所有 TUN 字段，也不把 MTU 固定为本机数值。
- Sparkle 仍会在自定义覆写之后合并软件管理字段。协议栈、MTU 和私人路由排除应在设备侧核对；数组会替换而非自动追加。使用本仓库 DNS 劫持策略时，应确认末层 `tun.dns-hijack` 同时含 `any:53` 和 `tcp://any:53`。DNS 与嗅探交由仓库管理时，不再开启软件整块 DNS/嗅探接管；不要为调整一个字段覆盖整个 DNS 策略。
- 不下发订阅地址、具体节点选择、代理环境变量、系统代理开关、网卡名、MTU、Windows 路由或其他 VPN 的设置。更换机场后核对所选地区组非空，切换所在地后检查已保存的手选策略。
- 验证顺序：先检查最终合并配置，再观察连接日志中的命中规则和出口，然后测试实际登录/业务。测速 URL 可达只证明该端点可达，不等于吞吐速度、服务解锁或整个 App 正常。
- 回退：停用当前入口，恢复导入前的客户端备份或重新导入更新前的对应地区版。导入前备份客户端配置与手选策略，不直接修改客户端生成的运行配置。

### 同步与验证

- 路由器模板关闭内核 GEO 自动更新，由 OpenClash 统一调度；设备应保留正在使用的 Country.mmdb 和中国 IP 列表更新。越南 IP 分流使用 MetaCubeX 的独立 `geoip-vn` MRS，兼容仅含 CN 的 Lite MMDB，保持原规则位置和 `no-resolve`。
- Mihomo 普通自动组和全部节点组会识别带 `【来源】` 前缀的英文流量/到期提示，防止这些占位条目参与自动测速；正常来源节点及回国隔离规则保持不变。Sub-Store 的组合过滤也应排除这些提示。

- JS 节点别名逻辑由 `.github/scripts/node_server_aliases.cjs` 作为自包含函数嵌入两地公开 JS，OpenClash CONF 内嵌 `.github/scripts/openclash_node_aliases.rb` 的等价适配；客户端无需 Node.js，也不依赖额外本地 Ruby 文件。YAML / Stash / Shadowrocket 不执行动态节点适配。使用 `python .github/scripts/validate_health_checks.py --check-node-aliases` 可执行有界只读定向检查，包括生成一致性、现有配置回归及两份真实 JS 的别名、字段保留、更新、幂等和错误原子性；默认完整入口也运行相同回归。定向模式不替代完整生命周期验收，也不是手机实测。
- 可选的 Windows 公网订阅抽样诊断仍走唯一入口：设置 `SUBSCRIPTION_PROBE_OPT_IN=1`、`SUBSCRIPTION_PROBE_FILES`（最多三个本机 YAML 绝对路径组成的 JSON 数组）、`MIHOMO_TEST_BIN`（已有内核绝对路径），运行 `python .github/scripts/validate_health_checks.py --probe-subscriptions`。每份订阅最多抽样 16 个节点；内核由 Windows Job Object 限制进程数及总内存 512 MiB，8 分钟总期限，单次网络等待 4 秒。仅用 loopback SOCKS/控制 API，无 TUN、系统代理或现有客户端选择变更；真实节点配置通过 stdin 和 API 内存传递，不写文件或命令行。独立 DoH 解析入口以避开系统 fake-ip，默认测试指定公共 DNS 的 UDP 回包及 Cloudflare 的 IPv4/IPv6 HTTPS 响应，REJECT 负向控制和末尾拒绝规则避免直连回退。含节点名称的本地报告只写入受管理的 `.generated/runs/`，不要公开私人报告。此诊断使用本地缓存并注明时间，不刷新订阅，不代表全部节点、手机、QUIC 应用或业务服务通过。
- 上述诊断设置 `SUBSCRIPTION_PROBE_EXTENSIONS=1` 时改为每种协议/传输抽样一个节点，在隔离副本分别尝试 TFO、sing-mux 和 SS 的 UOT v1/v2；可用 `SUBSCRIPTION_PROBE_PREVIOUS` 引用上一份受管理报告以保留依赖。功能测试不会写回客户端：TFO 打开后能接通也可能是普通 TCP 回退，不是协商成功或加速的证明；MPTCP 不在此 Windows 诊断中验证。服务端不兼容的 UOT/复用不得仅凭内核接受配置就启用。
- 可用 `SUBSCRIPTION_PROBE_NAMES` 传入最多八个精确节点名组成的 JSON 数组以补充抽样；每份订阅总样本仍不能超过 16 个。工具不固化某个机场的节点名、地址或凭据，默认离线验收只检查语法和未显式启用时的拒绝行为。
- OpenClash 节点适配库把当前配置 `hosts` 的精确域名别名应用到普通 SS 的 `server`，仅为已确认域名关系的花云 `obfs/http` SS 开启 UDP；保留名称、端口、认证、其他功能开关、策略组及原始订阅。两份远程 CONF 自动携带该源码，每次更新重新读取当前 hosts，不固定解析 IP，也不逐节点维护映射。
- 已有设备可以继续保留旧本地补丁；新 CONF 不依赖它们。若要移除旧补丁，须先备份并验证最终配置等价，不能直接删掉包含其他修复的整份自定义覆写。旧设备的 Telegram 适配库属于兼容入口，通用配置现已直接包含独立组。
- `.github/scripts/openclash_telegram_split.rb` 是旧版远程模板的可选本地适配：将 Telegram 两条规则、专用 DNS 恢复到独立的 `电报消息`，默认 `新加坡-自动`。必须在既有覆写完成之后调用 `OpenClashTelegramSplit.apply`，仅用于具有所需地区组的模板；先备份并验证候选，库本身不部署、不重启、不修改节点。已含相同独立组时幂等；遇到未知组、规则或 DNS 结构则拒绝赋值。
- 该库只支持普通 SS，以及显式指定混淆域名的 `obfs/http` SS，匹配精确 ASCII 域名；混淆 host 原样保留。不展开 `proxy-providers`、通配符或其他协议，不修改 TLS/SNI。IP 映射及最终落到 hosts IP 的别名链由内核继续处理。循环、非法目标、重复规范化键或过长链抛出异常，整批不赋值；OpenClash 记录覆写错误并保留转换前节点，不承诺因此阻止插件启动。它解决别名应用差异，不保证入口更快或消除超时。
- 同一唯一验证入口会在 Ruby 可用时运行内存内合成回归，覆盖更新映射、幂等、字段保留、循环/非法值拒绝与部分失败无副作用。没有 Ruby 的本机明确报告 NOT RUN；设备验收须复用该夹具，并核对运行配置和真实连接。部署备份只留在设备，私有配置不进入 Git。

- 十二个公开配置和四份共同源码均有中文注释，说明字段用途、单位、DNS、策略组和逐条分流。`config_comments.cjs` 复用锁定的 YAML AST 在原行前插入说明，保留锚点、`#!replace`、规则顺序及原注释；生成器会自动补齐公开入口的说明。路由器 CONF 为每条赋值命令提供注释，编码正文的逐项说明见同名 YAML。
- 仅修改注释时，可通过唯一入口执行 `python .github/scripts/validate_health_checks.py --check-comments <修改前的完整提交SHA>`：只读比较 16 份配置的有效内容、DNS 键顺序、规则顺序和 JS 合成执行结果，并复用配置静态回归；不会生成或清理测试产物。该模式不能代替功能修改的完整验收，也不代表内核或设备实测通过。默认不带参数的完整入口继续保留生命周期前置检查，并新增注释覆盖/生成一致性检查。
- `.github/config/shared.yaml` 与 `shared.js` 是同步维护的内部共同源码，不提供独立导入。
- 八套入口由各客户端内部共同源码、环境差异及最终分组精简投影生成，不分别手改地区版。内部源码仍保留细分服务组作为规则分类来源，**不代表公开入口仍有这些组**；生成的 JS 也在运行时投影为精简组。开发依赖仅用于生成和测试，客户端不需要 Node.js 或 npm。
- `tune_mihomo.cjs` 在精简后为两个 Mihomo 入口统一添加 AI 地区自动组、懒测速/容差和 AI DNS；同一自包含函数嵌入 JS。`validate_mihomo_tuning.cjs` 独立验证允许的差异、回国隔离、可见组不增加、幂等与负向控制。Stash / Shadowrocket 不调用这一 Mihomo 专属投影，本次保持文件不变。
- `.github/config/shared.stoverride` 维护 Stash 公共规则与原生语法；IPv6 跟随 Stash 自身设置。
- `.github/config/shared.conf` 维护 Shadowrocket 公共规则与原生语法；地区组筛选和测速端点与公共配置保持语义同步。
- 以后修改主配置时，需要同步检查 JS、Stash 和 Shadowrocket 三类版本。
- 换设备时只需重新导入私人订阅/Sub-Store 输出和对应公开入口：手机/电脑推荐 JS，OpenClash 使用 CONF。更新机场订阅不会自动刷新缓存的远程覆写，应分别更新。首次核对 `电报消息 → 新加坡-自动`；已有选择缓存按客户端保留。Sub-Store 的逐节点 TFO/MPTCP 结果随私人订阅输出传递，公共配置保留这些字段，不携带私人服务器名单或过期的测试白名单。
- 修改 `.github/config/shared.*` 或生成器内的环境差异后，先 `npm ci --ignore-scripts --no-audit --no-fund` 安装锁定的 YAML 开发依赖，再 `npm run build:profiles` 更新十二个入口文件；唯一离线验证入口仍为 `python .github/scripts/validate_health_checks.py`。仅检查生成文件有无过期可运行 `npm run check:profiles`，不会写文件。
- 路由器回归由同一入口调用：检查 YAML 1.1/1.2 的字符串 `off`、进程规则移除、设备/私有字段隔离、完整差异允许范围及生成漂移；CI 另执行 Ruby aliases 解析和两份模板的 Mihomo 加载。不会联网读取私人订阅或修改路由器。
- GitHub 托管的临时 Ubuntu VM 在隔离内核验收步骤使用 `sudo -n` 运行同一入口，使产物封存时的 `/proc` 占用检查可读取系统进程；只传入 PATH 和三个显式测试路径，不改变仓库 token 权限或本地系统权限。占用、不可读和收尾失败仍阻止通过，不跳过生命周期保护；不将此步骤复制到自托管或生产机器。[GitHub 托管运行器权限](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#administrative-privileges)
- 远程模块回归逐字段解码并与公共 YAML 全量比较；CI 在唯一入口设置 `OPENCLASH_RUBY_TEST=1`，额外执行真实 POSIX Shell → Ruby 合成覆写两次，检查中文/正则、旧 DNS 清除、节点/端口/认证/IPv6 保留和幂等。无 Shell/Ruby 的本地只完成静态部分，会明确报告未运行原生链路，不等同于设备实测。
- CI 对两地入口新增全对象 YAML/JS 对比、生成漂移检查、引用/循环检查、默认出口、DNS、回国隔离、空组保护和客户端 TUN/IPv6 保留测试，并分别运行 Mihomo 配置加载。测试数据为合成节点，不访问订阅或切换本机网络。
- CI 对四个苹果地区版验证生成漂移、原生格式结构、默认出口、DNS、回国隔离、引用/循环和规则/测速保留，并检查 Stash 的替换标记。Shadowrocket 的结构解析器不是其内核；不会把 Mihomo 加载成功当作苹果客户端实测。
- CI 会自动校验主 YAML 解析、主 JS 语法、主 YAML/JS 全配置同步、规则引用完整性、Stash 覆写解析、Shadowrocket 关键策略语义和 mihomo 加载测试。
- CI 会检查 `unified-delay`、`profile`、`geo-auto-update`、`geo-update-interval`、`tcp-concurrent`、`sniffer`、`tun`、`dns`、`proxy-groups`、`rule-providers`、`rules` 是否在主 YAML 和主 JS 中保持一致。
- CI 每天自动运行一次，用于尽早发现 Mihomo 最新版本、远程规则集或下载链路变化导致的问题。
- 内核 CI 分别测试最低支持的 `v1.19.27` 和官方 `latest` 正式版，两组都运行配置加载、隔离 DNS/AI 分组及公开规则快照初始化。关闭矩阵 fail-fast，避免一组失败遮住另一组结果；两组都必须通过，不自动提高最低支持版本。下载后先核对官方资产 SHA-256，再检查实际二进制版本。
- 独立的 `Check public health-check endpoints` workflow 每天 04:50（UTC+8）检查两个 Mihomo 公开 YAML 的全部测速 URL（按 URL / 预期状态 / 超时去重，包括 Telegram），也可手动运行。它不在 push / PR 上执行公网探测，不影响普通配置 CI；只检测主分支，发布后才会生效。GitHub 定时任务可能延迟，并非精确计时器。
- 端点探测按 [Mihomo URLTest 实现](https://github.com/MetaCubeX/mihomo/blob/v1.19.30/adapter/adapter.go) 使用 HEAD、不跟随重定向，严格核对配置的预期状态，保留 TLS 验证。每个 URL 最多尝试 3 次、间隔 1.5 秒、单次按配置超时（上限 10 秒）、并发上限 4；不会把 302 登录跳转或 403 算成功。中途恢复标记为 RECOVERED，连续失败使独立 workflow 失败，并在 Actions summary / 日志列出受影响的组。
- 探测只访问代码白名单内的公开地址，不读取机场订阅、节点凭据或本机控制器，不自动替换测速 URL / 切节点。本地 JSON / Markdown 报告带配置 SHA-256；默认离线入口只跑合成回归。需要显式实测时，设置 `MIHOMO_ENDPOINT_OUTPUT` 为仓库内 `.generated/runs/<本次唯一名称>` 的绝对路径，再运行同一个 `python .github/scripts/validate_health_checks.py`；目标必须不存在，已有报告不会覆盖。
- **公网探测只是执行机器的网络视角。** GitHub 机房可能被端点限流或地域限制；本地进程也可能经过当前代理/TUN。失败需结合客户端连接复核，成功不代表手机/电脑节点可用、AI 解锁、聊天流式响应正常或无 DNS 泄露。这项检查不复刻 Mihomo 的节点传输和 unified-delay 延迟测量。
- `validate_priority.cjs` 额外比较 YAML/JS 的 DNS 键顺序，并用重叠域名、开发工具、微信/支付宝和 Teams 的合成请求检查首条匹配；负向控制确保恢复旧遮挡时检查会失败。
- `mihomo -t` 只检查配置解析，不保证 HTTP 规则能下载或初始化。CI 另用 `check_remote_rules.cjs` 下载三个客户端配置中去重后的公开 URL，检查状态码、体积、文本格式并保存哈希快照；403、HTML 错误页、空正文和超时均判失败。不访问机场订阅，不关闭证书校验。
- CI 随后通过唯一测试入口调用隔离内核回归：只用回环 DNS 和合成答案验证优先级，再让 Mihomo 初始化主配置及 Stash 的公开快照，包括 MRS 完整解码。后者只证明这些文件能被 Mihomo 解析，**不是 Stash / Shadowrocket 实机通过**。Shadowrocket 的 `+.domain` 匹配仍须在真实客户端核对。
- 本地默认入口保持离线；已有 Mihomo 时可设置 `MIHOMO_TEST_BIN` 为其绝对路径后重跑该入口，启用回环测试。先显式运行 `node .github/scripts/check_remote_rules.cjs --output-dir .generated/runs/<本次唯一名称>`，再将 `MIHOMO_RULE_CACHE` 指向其绝对路径，才能同时检查公开快照初始化。新快照正文可能复用上一快照文件，读取须使用项目加载器，不能只复制 manifest 所在目录。旧快照可显式只读引用，不会自动纳管或删除。`MIHOMO_TEST_OUTPUT` 若设置，也必须是 `.generated/runs/` 内不存在的新目录；缺省由工具生成唯一名称。测试不改系统代理、TUN 开关或客户端配置。
- 新生成快照/测试缓存的容量、保留根、断点及安全回收规则见 [生成物生命周期](.github/ARTIFACTS.md)；不自动接管历史临时目录。
- Dependabot 会每周检查 GitHub Actions 依赖更新。
- YAML 开发依赖精确锁定为 `2.9.1`，锁文件记录来源与完整性；仅用于生成/验证，客户端无需安装。正常 merge alias、显式键覆盖、重复键拒绝和有限 alias 预算的递归拒绝均有离线回归。升级说明见 [YAML v2.9.1](https://github.com/eemeli/yaml/releases/tag/v2.9.1)。
- Dependabot 也每周检查 npm 开发依赖，更新精确版本及锁文件后仍需通过现有 CI，不自动合并。最低内核矩阵、下载验证和依赖更新覆盖由 `validate_compatibility.cjs` 及负向控制检查。
- 三个 workflow 的 checkout 同步固定到官方 [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) 的完整 SHA，并设置 `persist-credentials: false`；CI 保持 `contents: read`，不为检查留存 Git 推送凭据。

### 分组精简当前状态

| 项目 | 国内版 | 国外版 |
| --- | --- | --- |
| Mihomo 总组数 | 24 | 27 |
| Stash / Shadowrocket 总组数 | 21 | 24 |
| Mihomo 隐藏自动组 | 10 | 11 |
| Mihomo 可见组（客户端支持隐藏时） | 14 | 16 |
| 地区手动组 | 香港、台湾、日本、新加坡、美国、越南 | 国内版六组 + 中国 |
| 国内服务 / 中国两个组 | 删除；保留国内规则并改为 DIRECT | 保留，国内服务默认 DIRECT |

- 普通业务合并进 `节点选择`：漏网之鱼、GitHub、YouTube、Netflix、谷歌服务、Meta / X、TikTok、Spotify。`电报消息` 独立，默认新加坡自动，可单独选择地区。
- 保持独立：AI、游戏平台、越南服务、哔哩哔哩港澳台、广告过滤、全部节点；微软与苹果合并为 `微软/苹果服务`。
- Mihomo AI 内部提供美国、日本、新加坡三个隐藏 AI 自动组，默认美国，不新增可见业务组或跨国家 AI 自动池。
- 韩国手动、自动组均删除；韩国订阅节点不删除。Shadowrocket 的单项包装组 `全局直连` 删除，使用内建 DIRECT。
- 保留地区手动组供手选。Stash / Shadowrocket 保留自身的显示语义，不添加未经验证的隐藏字段。
- 独立回归检查最终组集合、全部规则的匹配内容/顺序、策略目标、DNS 引用、保留组测速、客户端字段、回国隔离和韩国节点可选性；旧组的选中缓存不会迁移到合并后的组，导入后手动核对节点选择。
