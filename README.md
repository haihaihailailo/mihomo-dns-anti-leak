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
| 普通国外服务 | 合并到节点选择，默认自动选择 | 合并到节点选择，默认 DIRECT，可手动切代理 |
| AI | 保留独立 AI 组，默认美国-自动 | 同左；已知 AI 域名 DNS 也跟随 AI 组 |
| 国内流量 | 保留规则，直接 DIRECT；不设国内服务和中国组 | 国内服务默认 DIRECT；有回国需求和可用节点再手动切中国组 |
| 越南服务 / 微软/苹果服务 | 独立分组，默认 DIRECT | 同左 |
| 启动 / 节点 / 直连 DNS | 国内 DoH | Cloudflare / Google DoH |
| 已知国内域名 DNS | 国内 DoH | 国内 DoH 跟随国内服务；切回国时也经所选出口查询 |
| 默认 DNS 兜底 | 保留国内 GeoIP 判断与经节点选择的外部 DNS | 不使用 CN GeoIP 兜底；默认 DNS 跟随节点选择（首选 DIRECT） |
| TUN / IPv6 / 运行模式 | 由客户端决定 | 由客户端决定 |

- GitHub、YouTube、Netflix、Google、Telegram、Meta / X、TikTok、Spotify 和漏网流量直接归入 `节点选择`，不再单独设组。GitHub 不再单独首选香港，Telegram 不再单独首选新加坡。`游戏平台` 保持独立，默认跟随节点选择。AI 仍默认美国自动；不需要代理且当地可用时可手动选择 `AI → DIRECT`。
- 国外版全局 `自动选择` 使用懒测速。保留组沿用原有测速参数；`微软/苹果服务` 合并两组候选并默认 DIRECT，Mihomo / Shadowrocket 沿用原微软测速端点。测速不能保证服务解锁或吞吐速度。
- 已知微软域名 DNS 在 Mihomo 国外版使用全球 DoH、跟随 `微软/苹果服务`；原 Google、YouTube、GitHub DNS 策略引用同步改为 `节点选择`。国内域名查询继续交给国内 DNS，这是显式分流，不代表所有 DNS 都经海外节点。
- **不自动识别所在地，也不自动重置已保存选择。** 上表描述没有选择缓存时的默认值；`profile.store-selected` 会保留旧手选，切换版本后核对节点选择、AI、越南服务、微软/苹果服务，以及国外版的国内服务。尤其回到国内后，不要遗留 `节点选择 = DIRECT`。
- 境外直连可达性取决于所在地网络，不保证所有国家/网络都能直连 Telegram 等服务；合并业务失败时在 `节点选择` 手动选择可用代理。
- **Mihomo 国外版中国组只有 REJECT = 没有匹配回国节点**。国内版已删除中国两个组；两版仍不把回国节点纳入全局自动选择，不强迫国内软件走空中国组。
- 上述 YAML / JS 仅适用于支持本仓库 Mihomo 字段的客户端；ClashMi 需内核与覆写合并功能支持，并核对实际生效配置。Stash / Shadowrocket 使用下方各自的原生格式，不混用 Mihomo 文件。

### Stash / Shadowrocket（苹果客户端）

| 客户端 | 中国大陆使用 | 越南及其他境外地区使用 |
| --- | --- | --- |
| Stash | [stash-国内版.stoverride](stash-国内版.stoverride) | [stash-国外版.stoverride](stash-国外版.stoverride) |
| Shadowrocket | [shadowrocket-国内版.conf](shadowrocket-国内版.conf) | [shadowrocket-国外版.conf](shadowrocket-国外版.conf) |

- 六套入口使用同一精简结构：国内版 21 组，国外版 24 组。节点选择在国内首选自动选择、国外首选 DIRECT；AI 均首选美国自动；越南服务、微软/苹果服务及国外版国内服务默认 DIRECT。分组精简本身不改变规则匹配条件和相对顺序，韩国两个组均删除；规则源的后续调整见下文。
- Stash 国内版使用国内 DoH 启动/节点解析；国外版改用 Cloudflare / Google DoH，并调整微软等服务 DNS，专属 geosite 策略优先于通用 cn。两版保留 `follow-rule`、独立节点解析和 `#!replace`；国外版仅将全局自动组改为懒测速，其他测速参数不变。[Stash DNS](https://stash.wiki/en/features/dns-server)、[覆写合并语义](https://stash.wiki/en/configuration/override)。
- Shadowrocket 国内版保留国内主 DNS 和经代理的备用 DNS，节点解析只使用国内 IP 型 DoH；国外版主、备用、节点 DNS 改为境外 DoH，不强制让备用 DNS 依赖默认代理。两版继续禁用系统 DNS 回退，保留现有 IPv6 和隧道旁路设置，不新增未验证的 Mihomo 字段。
- **DNS 出口不能跨客户端等同。** Stash 使用自身的 `follow-rule`，Shadowrocket 保留自身 DNS 逻辑；不承诺像 Mihomo 国外版一样，将每个 AI / 回国域名 DNS 逐项绑定到同名业务组。AI 请求走 AI 组不等于所有相关 DNS 都走同一出口。
- Stash 每次仅启用一个地区覆写；Shadowrocket 每次仅启用一个地区配置，并保留已导入的订阅节点。跨境后核对已保存的手动选择，尤其不能在国内遗留 `节点选择 = DIRECT`。
- 两个旧通用入口 `stash.stoverride`、`shadowrocket.conf` 已移入内部生成来源；旧导入 URL 不会自动转向新文件，请手动更换。生成与静态回归通过不代表 iOS / macOS 实机通过，导入后仍需检查登录、长连接、规则命中和空地区组。

### 切换与回退

1. 先在客户端备份当前配置与手动策略选择。
2. 停用客户端中已有的原版覆写和国内 DNS 补充层，改为所选国内版或国外版，**只启用一套、一个格式，不再叠加补充层**。保留机场订阅。仓库已移除旧的 `防DNS泄露.yaml` / `.js` 与 `Windows-国内网络覆写.yaml` / `.js` 入口；仍引用旧 URL 的客户端须手动更换，新文件不会自动替换旧导入项。
3. TUN、IPv6、系统代理和运行模式仍在软件里选择。要使用这些分流，应选择规则模式；文件不会强制切模式。
4. 查看最终 DNS、上述策略组、实际连接日志；确认账号登录、工作站点和手机业务。不只看测速绿灯。
5. 回退时停用新入口，从导入前的客户端备份恢复配置与手选；旧文件也可从 Git 历史找回。本文不要求清除全部客户端缓存，也不修改本机运行配置。

## 文件

供用户导入的配置共 **6 套、8 个文件**：Mihomo、Stash、Shadowrocket 各有国内版和国外版；其中 Mihomo 每套提供 YAML / JS 两种格式。内部共同源码不作为额外配置入口。

- `防DNS泄露-国内版.yaml` / `.js`：中国大陆使用的 Mihomo 覆写，已内置国内 DNS 设置。
- `防DNS泄露-国外版.yaml` / `.js`：越南及其他境外地区使用的 Mihomo 覆写。
- `stash-国内版.stoverride` / `stash-国外版.stoverride`：Stash 原生地区覆写。
- `shadowrocket-国内版.conf` / `shadowrocket-国外版.conf`：Shadowrocket 原生地区配置。
- `.github/config/shared.yaml` / `shared.js` / `shared.stoverride` / `shared.conf`：只供维护与生成使用的共同源码，不导入客户端；Mihomo YAML / JS 保持全配置同步，苹果格式按各自语义维护。
- `.github/scripts/build_profiles.cjs`：统一生成八个入口文件；苹果环境差异在 `build_native_profiles.cjs` 中维护；`consolidate_groups.cjs` 统一精简最终分组、规则目标和 DNS 策略引用。校验均由唯一离线入口调用。

## 功能

- DNS 防泄露：Mihomo 启用 `respect-rules`，国内域名使用国内 DoH，代理节点域名另走加密启动 DNS，避免递归；国内版的外部 DNS 跟随 `节点选择`，国外版见上表。Stash 使用 `follow-rule` 与独立的代理节点 DNS；Shadowrocket 主、备用 DNS 均使用 DoH，仅国内版强制备用 DoH 经代理。
- IPv6：Mihomo YAML、JS 与 Stash 覆写不强制开启或关闭 IPv6，跟随客户端/软件自身设置；Shadowrocket 版本当前显式关闭 IPv6，以降低 iOS 隧道外泄风险。
- fake-ip：显式使用 `fake-ip-filter-mode: blacklist`，对局域网、路由器、NTP、推送等域名返回真实 IP，降低局域网和系统服务异常概率。
- TUN 参数：主配置提供 DNS 劫持和局域网绕过参数，但不写入 `tun.enable`；是否启用 TUN / VPN 由客户端软件决定。启用后，国内应用由包名和域名规则精确分流。
- Stash 适配：提供两地 `.stoverride`，保留 DNS、Sniffer、策略组、规则集和分流规则。
- Sniffer 稳定性：对局域网、路由器、NTP、Apple Push、QQ/微信本地登录等域名配置 `skip-domain`，避免被嗅探误改写目标。
- 规则分流：覆盖大量国内 App 包名、中国域名库、微信/支付宝专属规则，补充常用越南支付、银行、电商、出行 App 包名，并覆盖 AI、Google、YouTube、GitHub、微软、Telegram、Netflix、TikTok、Spotify、Apple、哔哩哔哩等常见场景。中国版哔哩哔哩流量在国内入口直接 DIRECT，国外入口走国内服务；国际版保留在 `哔哩哔哩港澳台`。
- 两地使用：国内版的国内规则直接 DIRECT；国外版的国内服务默认 DIRECT，按需回国。越南服务两地均默认 DIRECT，可手动切换越南节点；选择会由 `profile.store-selected` 保留。
- 分组测速：Mihomo / JS 与 Shadowrocket 的手动业务组使用对应服务的小型 HTTPS 端点，地区手动组与自动组使用对应地区端点；中国组使用百度 200。Mihomo 的 `select` 组不设置 `interval`，只提供按需测速，不改变手动选路逻辑；含 `REJECT` 的广告组不测速。
- Stash 测速边界：自动组继续使用各自的地区端点；手动 `select` 组保留 `interval: -1`。Stash 对同一代理在多个组间共享测速结果，若要真正使用不同测试参数需要复制代理，因此本覆写不写入无效的“每组独立 URL”。
- 节点归类：保留香港、台湾、日本、新加坡、美国、越南手动及自动组；国外版另有中国组。使用常见代码和机场名，带英文字母边界避免误匹配；带明确境外地区信息或仅写 `CN2` 的线路不因此误入中国组。韩国只删除独立分组，订阅节点仍可进入全部节点和全局自动选择。
- 回国节点隔离：`回国`、`港广`、`港沪`、`港深`、`沪港`、`深港`、`广中` 从全局 `自动选择` 和所有非中国地区组排除；国外版可进入中国组，两地仍可在 `全部节点` 中手动选择。
- 空组保护：Mihomo 的所有订阅筛选组使用 `empty-fallback: REJECT`，筛选不到节点时不会静默直连。
- 订阅提示过滤：`全部节点` 与全局 `自动选择` 除中文提示外，还排除以 `Traffic:`、`Expire:`、`Expiry:`、`Expiration:` 开头的流量/到期占位节点；不因线路带“实验性”字样而禁用节点。

## 使用方法

### YAML 覆写

适合使用 Mihomo v1.19.27 或更新内核、并支持 YAML 覆写、配置片段或 merge/override 的客户端。`empty-fallback` 从 v1.19.27 起可用。

1. 按所在地复制 `防DNS泄露-国内版.yaml` 或 `防DNS泄露-国外版.yaml` 的内容，只选一个。
2. 在客户端的覆写/扩展配置中粘贴或引用该文件。
3. 更新订阅后检查 `节点选择`、`AI`、`越南服务`、`游戏平台`、`微软/苹果服务` 等分组；只有国外版包含国内服务和中国两个组。
4. 运行一次配置测试，确认无 YAML 解析错误和规则引用错误。

### JavaScript 覆写

适合支持 JavaScript override 的 Clash Party / Mihomo Party 客户端。

1. 按所在地复制 `防DNS泄露-国内版.js` 或 `防DNS泄露-国外版.js` 的内容，只选一个，不再叠加 YAML 版本。
2. 在客户端中新建 JavaScript 覆写。
3. 确认入口函数为 `main(config)`，并返回修改后的 `config`。
4. 更新订阅后检查 DNS、TUN、Sniffer、策略组和规则是否生效。

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
- TUN 和 IPv6 开关继续由客户端管理，不下发本机专属 MTU、网卡绑定、系统 DNS 或 Windows 路由表修改。
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
- 国外版的已知 AI 域名使用 AI 组解析，不保证仅按进程识别的请求、未知第三方域名或绕过 VPN 的应用也使用同一 DNS 出口；不能将其视为整个系统零泄露保证。
- 系统更新、局域网、NTP、推送等既有直连规则保持不变。
- Steam 中国 CDN 与中国大陆游戏域名在国内版直接 DIRECT、国外版走国内服务；海外游戏域名进入独立的 `游戏平台`，两者按原规则顺序隔离。
- NVIDIA 驱动下载的 `download.nvidia.com` / `download.nvidia.cn`（含子域名）以及 `ota.nvidia.com` / `gfwsl.geforce.cn` 精确直连，优先于 NVIDIA 进程代理规则；其他 NVIDIA 服务不改变。国内版使用国内 DoH 获取 CDN 地址，国外版使用境外直连 DoH。网络下载成功不代表驱动安装或 NVIDIA App 自身故障也已解决。
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
| Claude / Gemini / GitHub Copilot | MetaCubeX 专属 domain/text 列表 | Mihomo、Stash 在 Google、GitHub、微软等通用规则之前归入现有 AI 组，并同步 DNS 策略；Shadowrocket 保留已有专属规则。不是新增策略组，也不保证覆盖所有 AI 产品。 |
| Shadowrocket 中国域名 | blackmatrix7 的 `China_Domain.list` | 按[上游调用说明](https://github.com/blackmatrix7/ios_rule_script/blob/master/rule/Shadowrocket/China/README.md)使用 `DOMAIN-SET`，不再将纯域名内容当 `RULE-SET`。不扩大为实验性 ChinaMax。 |

- 广告缓存使用独立路径，避免旧 MRS 与新 classical 文件混用。切换后若业务异常，先查看是否命中 `广告过滤`，可临时将该组改为 DIRECT 对照；不需要关闭 TLS 证书校验或清空全部客户端数据。
- 微信 / 支付宝的 classical provider 用于 DNS 策略时，Mihomo 只取其中域名规则，相关提示不表示 ASN 也参与 DNS 匹配。`no-resolve` 避免仅为匹配 IP/ASN 而触发解析，不禁止业务请求本身的正常 DNS 查询。
- 新增来源由 `validate_rule_sources.cjs` 检查格式、缓存隔离、AI 优先级和 DNS 同步，并纳入唯一离线验证入口。离线测试不能保证远程源永远可用；上游文件会继续变化，实机仍须核对命中日志。手机 ChatGPT 的 SSL 提示、支付或导航体验不能仅凭更换规则集宣告修复。

### TUN / IPv6 / 订阅故障先分层判断

- 开机后 TUN 全部超时且日志出现 `reject loopback connection` 时，先检查网卡转发、其他 VPN/互联软件的后台服务和路由。关闭软件界面的“开机启动”不代表其 Windows 服务已停止。不要通过关闭防火墙、跳过证书校验或反复更换 DNS 掩盖回环；具体服务的停用应由设备所有者确认并保留回退。仓库不自动修改这些系统设置。
- 顶层 `ipv6`、`dns.ipv6` 与公网 IPv6 连通性是不同层：DNS 关闭 AAAA 不等于关闭 Windows IPv6，也不保证应用自带 IPv6 地址可达。按 [Mihomo DNS 文档](https://wiki.metacubex.one/config/dns/#ipv6) 对实际 DNS 监听端口做 UDP/TCP 的 A/AAAA 查询；控制 API 的上游查询不能替代这一验证。
- 测试原生 IPv6 时，确认实际出口地址族；域名嗅探可能把请求重新解析为 IPv4。国内/国外入口均不强制 IPv6 开关，不能把一台设备的公网 IPv6 失败套用到所有用户。
- 系统代理和 TUN 同时开启时，显式 HTTP 代理请求与不使用 HTTP 代理、进入 TUN 的请求可用于比较入口，但这不是“系统代理单独开启”的对照实验。网站 200/404 只证明相应请求的结果，不能替代 App 登录、长连接、后台切换和移动网络实测。
- Sub-Store 更新出现 HTTP 403，应先检查上游订阅的下载授权、限时开关或链接有效期；组合订阅的一个来源失败不等于全部节点失效。不要公布带 token 的日志，也不要以关闭 TLS 验证修复 403。修改订阅源和放宽错误处理需要另行确认。

### 通用配置与设备设置的边界

- 内部共同源码承载各设备可复用的域名/应用分流、DNS 策略、回国隔离和测速参数；两地入口通过生成器同步共有部分，环境差异不绑定某家机场。
- 两地 JS 覆写保留输入中显式的 `tun.enable`、`tun.device`、`tun.mtu`、`tun.gso`、`tun.gso-max-size`、`tun.auto-redirect`、`tun.inet4-address`、`tun.inet6-address`，以及 `dns.ipv6`、`dns.fake-ip-range6` 和原有顶层 `mode` / `ipv6`。未设置时不自行添加设备参数；这不等于信任订阅里的所有 TUN 字段，也不把 MTU 固定为本机数值。
- Sparkle 仍会在自定义覆写之后合并软件管理字段。协议栈、MTU 和私人路由排除应在设备侧核对；数组会替换而非自动追加。使用本仓库 DNS 劫持策略时，应确认末层 `tun.dns-hijack` 同时含 `any:53` 和 `tcp://any:53`。DNS 与嗅探交由仓库管理时，不再开启软件整块 DNS/嗅探接管；不要为调整一个字段覆盖整个 DNS 策略。
- 不下发订阅地址、具体节点选择、代理环境变量、系统代理开关、网卡名、MTU、Windows 路由或其他 VPN 的设置。更换机场后核对所选地区组非空，切换所在地后检查已保存的手选策略。
- 验证顺序：先检查最终合并配置，再观察连接日志中的命中规则和出口，然后测试实际登录/业务。测速 URL 可达只证明该端点可达，不等于吞吐速度、服务解锁或整个 App 正常。
- 回退：停用当前入口，恢复导入前的客户端备份或重新导入更新前的对应地区版。导入前备份客户端配置与手选策略，不直接修改客户端生成的运行配置。

### 同步与验证

- `.github/config/shared.yaml` 与 `shared.js` 是同步维护的内部共同源码，不提供独立导入。
- 六套入口由各客户端内部共同源码、环境差异及最终分组精简投影生成，不分别手改地区版。内部源码仍保留细分服务组作为规则分类来源，**不代表公开入口仍有这些组**；生成的 JS 也在运行时投影为精简组。开发依赖仅用于生成和测试，客户端不需要 Node.js 或 npm。
- `.github/config/shared.stoverride` 维护 Stash 公共规则与原生语法；IPv6 跟随 Stash 自身设置。
- `.github/config/shared.conf` 维护 Shadowrocket 公共规则与原生语法；地区组筛选和测速端点与公共配置保持语义同步。
- 以后修改主配置时，需要同步检查 JS、Stash 和 Shadowrocket 三类版本。
- 修改 `.github/config/shared.*` 或生成器内的环境差异后，先 `npm ci --ignore-scripts --no-audit --no-fund` 安装锁定的 YAML 开发依赖，再 `npm run build:profiles` 更新八个入口文件；唯一离线验证入口仍为 `python .github/scripts/validate_health_checks.py`。仅检查生成文件有无过期可运行 `npm run check:profiles`，不会写文件。
- CI 对两地入口新增全对象 YAML/JS 对比、生成漂移检查、引用/循环检查、默认出口、DNS、回国隔离、空组保护和客户端 TUN/IPv6 保留测试，并分别运行 Mihomo 配置加载。测试数据为合成节点，不访问订阅或切换本机网络。
- CI 对四个苹果地区版验证生成漂移、原生格式结构、默认出口、DNS、回国隔离、引用/循环和规则/测速保留，并检查 Stash 的替换标记。Shadowrocket 的结构解析器不是其内核；不会把 Mihomo 加载成功当作苹果客户端实测。
- CI 会自动校验主 YAML 解析、主 JS 语法、主 YAML/JS 全配置同步、规则引用完整性、Stash 覆写解析、Shadowrocket 关键策略语义和 mihomo 加载测试。
- CI 会检查 `unified-delay`、`profile`、`geo-auto-update`、`geo-update-interval`、`tcp-concurrent`、`sniffer`、`tun`、`dns`、`proxy-groups`、`rule-providers`、`rules` 是否在主 YAML 和主 JS 中保持一致。
- CI 每天自动运行一次，用于尽早发现 Mihomo 最新版本、远程规则集或下载链路变化导致的问题。
- Dependabot 会每周检查 GitHub Actions 依赖更新。

### 分组精简当前状态

| 项目 | 国内版 | 国外版 |
| --- | --- | --- |
| 总组数（三类客户端一致） | 21 | 24 |
| Mihomo 隐藏自动组 | 7 | 8 |
| Mihomo 可见组（客户端支持隐藏时） | 14 | 16 |
| 地区手动组 | 香港、台湾、日本、新加坡、美国、越南 | 国内版六组 + 中国 |
| 国内服务 / 中国两个组 | 删除；保留国内规则并改为 DIRECT | 保留，国内服务默认 DIRECT |

- 普通业务合并进 `节点选择`：漏网之鱼、GitHub、YouTube、Netflix、谷歌服务、电报消息、Meta / X、TikTok、Spotify。合并后不能再给这些业务分别选择国家。
- 保持独立：AI、游戏平台、越南服务、哔哩哔哩港澳台、广告过滤、全部节点；微软与苹果合并为 `微软/苹果服务`。
- 韩国手动、自动组均删除；韩国订阅节点不删除。Shadowrocket 的单项包装组 `全局直连` 删除，使用内建 DIRECT。
- 保留地区手动组供手选。Stash / Shadowrocket 保留自身的显示语义，不添加未经验证的隐藏字段。
- 独立回归检查最终组集合、全部规则的匹配内容/顺序、策略目标、DNS 引用、保留组测速、客户端字段、回国隔离和韩国节点可选性；旧组的选中缓存不会迁移到合并后的组，导入后手动核对节点选择。
