# Mihomo DNS 防泄露配置

面向 Mihomo / Clash Meta / Clash Party / Mihomo Party 的个人 DNS 防泄露与规则分流配置。

## 文件

| 文件 | 说明 |
|---|---|
| `防DNS泄露.yaml` | 主配置，包含 DNS、TUN、Sniffer、代理组、规则集、Android 包名分流和服务分流规则。 |
| `防DNS泄露.js` | JS 覆写入口文件。当前作为 JS 版本占位与同步入口，后续与 YAML 同步维护。 |

## 当前维护口径

- `防DNS泄露.yaml` 是主配置，以它为准。
- `防DNS泄露.js` 用于 Clash Party / Mihomo Party 的 JavaScript 覆写入口。
- 以后修改 YAML 时，JS 也要同步更新，避免两个入口配置不一致。
- 如果只想使用稳定完整版本，优先导