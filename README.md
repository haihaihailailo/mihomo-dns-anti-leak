# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomoparty / Clash Party 的个人 DNS 防泄露、fake-ip、TUN 接管与规则分流配置。

## 文件

- `防DNS泄露.yaml`：主配置，适合 YAML 覆写或配置片段使用。
- `防DNS泄露.js`：JavaScript 覆写版本，适合 JS 覆写功能使用。

## 功能

- DNS 防泄露：启用 `respect-rules`，按规则分流 DNS 请求。
- fake-ip：显式使用 `fake-ip-filter-mode: blacklist`，对局域网、路由器、NTP、推送等域名返回真实 IP，降低局域网和系统服务异常概率。
- TUN 接管：启用 TUN DNS 劫持，并绕过局域网地址、微信、支付宝等关键国内应用。
- Sniffer 稳定性：对局域网、路由器、NTP、Apple Push、QQ/微信本地登录等域名配置 `skip-domain`，避免被嗅探误改写目标。
- 规则分流：覆盖国内、越南、AI、Google、YouTube、GitHub、微软、Telegram、Netflix、TikTok、Spotify、Apple、哔哩哔哩港澳台等常见场景。
- 国内服务保护：国内应用、小程序、支付、系统服务优先直连，避免进入漏网之鱼导致加载异常。

## 维护口径

- YAML 是主配置。
- JS 与 YAML 保持功能同步。
- 以后修改其中一个，另一个也要同步更新。
- CI 会自动校验 YAML 解析、JS 语法、YAML/JS 关键配置同步、规则引用完整性和 mihomo 加载测试。
- CI 会检查 `unified-delay`、`profile`、`geo-auto-update`、`geo-update-interval`、`tcp-concurrent`、`sniffer`、`tun`、`dns`、`proxy-groups`、`rule-providers`、`rules` 是否在 YAML 和 JS 中保持一致。
- CI 每周自动运行一次，用于提前发现 mihomo 最新版本、远程规则集或下载链路变化导致的问题。
- Dependabot 会每周检查 GitHub Actions 依赖更新。
