# Mihomo DNS 防泄露与 Android 包名分流配置

> 面向 Mihomo / Clash Meta 的个人 DNS 防泄露与规则分流配置，支持 fake-ip、TUN、DoH、rule-provider、Android 包名分流和 WebDAV 多设备同步，适合中国/越南双场景使用。

## 仓库定位

这个仓库不是通用订阅模板，而是一份面向个人多设备使用的 Mihomo / Clash Meta 主配置。配置重点解决 DNS 泄露、国内外解析路径、Google/AI/Telegram/GitHub/越南服务分组，以及 Android 多设备包名分流统一管理问题。

适合在 Clash Mi、Clash Verge Rev、Mihomo Party 等支持 Mihomo / Clash Meta 配置格式的客户端中使用。

核心目标：

- 防止 DNS 请求绕过代理或被系统 DNS 污染。
- 国内服务、局域网、银行支付、微信 QQ、国内购物和系统组件默认直连。
- Google、AI、Telegram、GitHub、越南 App 等按策略组代理。
- Android 端通过 `PROCESS-NAME` 按应用包名分流，适合两个手机和一个平板共用同一套规则。
- 通过 WebDAV 同步配置，减少多设备手动维护分应用代理的成本。
- 保留 IPv6 能力，同时通过 fake-ip、TUN 和 DNS 分流降低泄露概率。

## 主配置文件

| 文件 | 用途 |
|---|---|
| `防DNS泄露.yaml` | 当前主配置文件，包含 DNS、防泄露、TUN、代理组、规则集、Android 包名分流与服务分流规则 |
| `android-process-name-rules.yaml` | Android 包名分流规则片段，用于单独查看或复制到其它配置 |
| `mihomo-dns-anti-leak.yaml` | 旧英文文件名引用，若客户端仍使用该链接，需要确认文件是否存在并与主配置同步 |

## 当前配置特点

### DNS 防泄露

- `enhanced-mode: fake-ip`
- `respect-rules: true`
- 国内 DoH：阿里 DNS、腾讯 DNSPod
- 海外 DoH：Cloudflare、Google，并绑定到代理策略组
- `direct-nameserver-follow-policy: false`，避免 DIRECT DNS 跟随代理策略导致路径混乱
- 针对 `google / youtube / openai / github / geolocation-!cn` 设置海外解析策略

### IPv6 支持

- DNS 层开启 `ipv6: true`
- Fake-IP IPv6 使用 `fdfe:dcba:9876::1/64`
- TUN 分配 `fdfe:dcba:9876::1/126`
- 是否真正启用 IPv6 出口，以客户端和系统网络环境为准

### Android 包名分流

配置在 `rules:` 前部加入 `PROCESS-NAME` 规则，用于在 Android 端按应用包名直接分流。

当前重点分流对象：

- AI：ChatGPT、Gemini
- Google 全家桶：Google、Google 地图、Gmail、Drive、Translate、Play 商店、Play 服务、GMS/GSF、Gboard、Authenticator、WebView 等
- 电报消息：Telegram、Turrit
- GitHub：GitHub Store 和 GitHub 域名规则
- 越南服务：Zalo、Shopee 越南、Grab、be、J&T Express 越南、ViettelPost、My VNPT / Vinaphone
- 工具类：Speedtest、My NAT、Hanzii、雨见 cBeta

不建议加入代理的对象：

- Clash Mi 自身
- 银行、支付、身份认证类 App
- 微信、QQ、QQ 邮箱、企业微信、腾讯会议
- 淘宝、京东、拼多多、美团等国内购物生活 App
- Android / ColorOS / OPlus / Qualcomm 系统组件

### 服务分组

已内置常用服务分组：

- 节点选择
- 漏网之鱼
- 越南服务
- 国内服务
- GitHub
- YouTube
- Netflix
- AI
- 谷歌服务
- 电报消息
- 微软服务
- TikTok
- 苹果服务
- Spotify
- 哔哩哔哩港澳台
- 广告过滤
- 全局直连

### 地区节点组

已内置地区选择与自动测速：

- 香港 / 台湾 / 日本 / 新加坡 / 美国 / 韩国 / 越南 / 中国
- 每个主要地区均提供手动选择组与自动测速组
- 自动测速组默认隐藏，用于上层策略组调用

## 默认策略简表

| 分组 | 默认倾向 |
|---|---|
| 漏网之鱼 | 先走 `节点选择`，再走自动与地区节点 |
| AI | 优先美国、日本、新加坡、香港节点，减少频繁自动切换导致的风控风险 |
| 谷歌服务 | 走节点选择与新加坡/日本/香港/美国节点 |
| 电报消息 | 优先新加坡自动，再回退其它地区 |
| 微软服务 | 优先 DIRECT，兼顾商店、更新、CDN 下载稳定性 |
| 苹果服务 | 优先 DIRECT |
| 哔哩哔哩港澳台 | 优先 DIRECT |
| 越南服务 | 中国使用时可走越南/新加坡/节点选择，具体按策略组选择 |
| 国内服务 | 优先 DIRECT |

## 使用方式

1. 下载或复制 `防DNS泄露.yaml`。
2. 在支持 Mihomo / Clash Meta 的客户端中导入为主配置，或作为覆写配置的基础模板。
3. Android 端需要在客户端内打开“进程匹配 / 包名匹配”相关开关，否则 `PROCESS-NAME` 包名规则可能不会生效。
4. 多台 Android 设备可以通过 WebDAV 同步同一套配置，减少逐台维护分应用代理的成本。
5. 根据自己的机场节点命名规则，检查地区过滤关键词是否匹配。
6. 开启系统代理或 TUN 后，使用 DNS 泄露测试网站检查结果。
7. 如果某个服务风控明显，优先把该服务分组改成固定节点，不要频繁使用自动测速组。

## 维护说明

- 修改代理组名称时，必须同步修改所有 `rules` 里的目标策略名。
- 修改 Android 包名规则时，建议在规则后保留应用名注释，方便后续维护。
- 修改地区过滤关键词时，建议同时检查手动组和自动组，避免只改一边。
- 修改 DNS 逻辑时，优先检查 `nameserver-policy`、`fallback`、`direct-nameserver` 与 `proxy-server-nameserver` 是否互相冲突。
- 修改规则集路径时，保持 `./ruleset/metacubex/` 目录一致，避免缓存文件散落。
- 如果同时维护多个 YAML 文件，必须保持主配置和兼容文件同步，避免客户端导入旧链接后配置不一致。

## 建议仓库元信息

GitHub 仓库 About 区可以这样设置：

- **Repository name**：`mihomo-dns-anti-leak`
- **Description**：`Mihomo/Clash Meta DNS 防泄露与 Android 包名分流配置，支持 fake-ip、TUN、规则分组和 WebDAV 多设备同步，适合中国/越南双场景使用。`
- **Topics**：`mihomo`, `clash-meta`, `dns`, `fake-ip`, `doh`, `anti-leak`, `android`, `process-name`, `proxy-rules`, `ipv6`, `tun`, `clash-config`

## 适用范围

适合个人 Windows / Android 代理客户端使用。该配置含有个人化规则，例如越南服务、业务域名直连规则、国内/海外应用分流和 Android 包名分流等，不建议未经检查直接作为公共模板发布。
