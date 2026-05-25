# Mihomo DNS Anti-Leak Config

> 面向 Mihomo / Clash Meta 内核的个人 DNS 防泄露与分流配置，重点解决 Fake-IP、DoH、IPv6、国内外解析路径和常用服务分组的协同问题。

## 仓库定位

这个仓库不是通用订阅模板，而是一份偏实战的主配置文件，适合在 Clash Mi、Clash Verge Rev、Mihomo Party 等支持 Mihomo / Clash Meta 配置格式的客户端中使用。

核心目标：

- 防止 DNS 请求绕过代理或被系统 DNS 污染。
- 让国内、越南、本地局域网、微软更新等流量优先走直连解析。
- 让 Google、YouTube、GitHub、OpenAI、Telegram 等海外服务走明确的海外 DoH 路径。
- 保留 IPv6 能力，同时通过 Fake-IP v6 与 TUN 配置降低泄露概率。
- 通过地区自动测速组降低手动切节点成本。

## 主配置文件

| 文件 | 用途 |
|---|---|
| `mihomo-dns-anti-leak.yaml` | 推荐使用的标准英文文件名，包含 DNS、防泄露、TUN、代理组、规则集与分流规则 |
| `防DNS泄露.yaml` | 旧中文文件名，保留用于兼容已经导入客户端的旧链接 |

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

### 分流策略

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
| 越南服务 | 优先 DIRECT，再回退越南/新加坡节点 |
| 国内服务 | 优先 DIRECT |

## 使用方式

1. 下载或复制 `mihomo-dns-anti-leak.yaml`。
2. 在支持 Mihomo / Clash Meta 的客户端中导入为主配置，或作为覆写配置的基础模板。
3. 如果已经导入旧的 `防DNS泄露.yaml` 链接，可以继续使用；后续新导入建议改用英文文件名。
4. 根据自己的机场节点命名规则，检查地区过滤关键词是否匹配。
5. 开启系统代理或 TUN 后，使用 DNS 泄露测试网站检查结果。
6. 如果某个服务风控明显，优先把该服务分组改成固定节点，不要频繁使用自动测速组。

## 维护说明

- 修改代理组名称时，必须同步修改所有 `rules` 里的目标策略名。
- 修改地区过滤关键词时，建议同时检查手动组和自动组，避免只改一边。
- 修改 DNS 逻辑时，优先检查 `nameserver-policy`、`fallback`、`direct-nameserver` 与 `proxy-server-nameserver` 是否互相冲突。
- 修改规则集路径时，保持 `./ruleset/metacubex/` 目录一致，避免缓存文件散落。
- 新旧两个 YAML 文件需要保持同步；旧中文文件暂时只作为兼容入口保留。

## 建议仓库元信息

GitHub 仓库 About 区可以这样设置：

- **Repository name**：`mihomo-dns-anti-leak`
- **Description**：`Mihomo / Clash Meta DNS anti-leak config with Fake-IP, DoH, IPv6, TUN and service-based routing.`
- **Topics**：`mihomo`, `clash-meta`, `dns`, `fake-ip`, `doh`, `anti-leak`, `proxy-rules`, `ipv6`, `tun`, `clash-config`

## 适用范围

适合个人 Windows / Android 代理客户端使用。该配置含有个人化规则，例如越南服务、美的/yhglobal 相关直连规则、国内/海外应用分流等，不建议未经检查直接作为公共模板发布。
