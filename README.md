# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomo Party 的个人 DNS 防泄露与规则分流配置。

本仓库提供两种入口：

- `防DNS泄露.yaml`：主配置，适合直接作为 YAML 覆写或配置片段使用。
- `防DNS泄露.js`：JavaScript 覆写版本，适合 Clash Party / Mihomo Party 的 JS 覆写功能使用。

## 配置目标

- 防止 DNS 请求绕过 Mihomo 泄露到系统 DNS。
- 使用 fake-ip、TUN DNS 劫持、DoH 分流和 nameserver-policy 控制解析路径。
- 局域网、私有地址、NAS、投屏、设备发现等流量优先直连。
- 微信、支付宝通过 TUN 排除包名绕过，减少小程序、扫码、支付异常。
- 国内服务、越南服务、AI、Google、YouTube、Git