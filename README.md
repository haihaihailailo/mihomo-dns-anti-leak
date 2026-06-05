# Mihomo DNS 防泄露与 Android 包名分流配置

> 面向 Mihomo / Clash Meta 的个人 DNS 防泄露与规则分流配置，支持 fake-ip、TUN、DoH、rule-provider、Android 包名分流和 WebDAV 多设备同步，适合中国/越南双场景使用。

## 仓库定位

这个仓库不是通用订阅模板，而是一份面向个人多设备使用的 Mihomo / Clash Meta 主配置。配置重点解决 DNS 泄露、国内外解析路径、Google/AI/Telegram/GitHub/越南服务分组，以及 Android 多设备包名分流统一管理问题。

适合在 Clash Mi、Clash Verge Rev、Mihomo Party 等支持 Mihomo / Clash Meta 配置格式的客户端中使用。

核心目标：

- 防止 DNS 请求绕过代理或被系统 DNS 污染。
- 国内服务、局域网、银行支付、微信 QQ、国内购物和系统组件默认直连。
- Google、AI、Telegram、GitHub、越南 App 等按策略组代理。
- Android 端通过 `PROCESS-NAME` 按应用包名分流，适合两个