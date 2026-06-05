# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomo Party 的个人 DNS 防泄露与规则分流配置。

## 文件说明

- `防DNS泄露.yaml`：主配置，适合 YAML 覆写或配置片段使用。
- `防DNS泄露.js`：JavaScript 覆写版本，适合 Clash Party / Mihomo Party 的 JS 覆写功能使用。

## 配置目标

- 防止 DNS 请求绕过 Mihomo 泄露到系统 DNS。
- 使用 fake-ip、TUN DNS 劫持、DoH 分流和 nameserver-policy 控制解析路径。
- 局域网、私有地址、NAS、投屏、设备发现等流量优先直连。
- 微信、支付宝通过 TUN 排除包名绕过，减少小程序、扫码、支付异常。
- 保留国内服务、越南服务、AI、Google、YouTube、GitHub、微软、Telegram 等规则分流。

## 维护口径

- `防DNS泄露.yaml` 是主配置，以 YAML 为准。
- `防DNS泄露.js` 与 YAML 保持功能同步。
- 以后修改 YAML 时，必须同步更新 JS，避免两个入口分叉。

## 使用建议

- 使用 Clash /