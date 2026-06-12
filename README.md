# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomoparty / Clash Party 的个人 DNS 防泄露与规则分流配置。

## 文件

- `防DNS泄露.yaml`：主配置，适合 YAML 覆写或配置片段使用。
- `防DNS泄露.js`：JavaScript 覆写版本，适合 JS 覆写功能使用。

## 功能

- DNS 防泄露。
- fake-ip 与 TUN DNS 劫持。
- 国内、越南、AI、Google、YouTube、GitHub、微软、Telegram 等规则分流。
- 局域网、私有地址、微信、支付宝等场景做绕过处理。

## 维护口径

- YAML 是主配置。
- JS 与 YAML 保持功能同步。
- 以后修改其中一个，另一个也要同步更新。
- CI 会自动校验 YAML 解析、JS 语法、YAML/JS 关键配置同步、规则引用完整性和 mihomo 加载测试。
- CI 会检查 `dns`、`tun`、`sniffer`、`proxy-groups`、`rule-providers`、`rules` 是否在 YAML 和 JS 中保持一致。
