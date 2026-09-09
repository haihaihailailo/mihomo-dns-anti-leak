/**
 * 可选补充层，与 Windows-国内网络覆写.yaml 保持一致。
 * 使用通用 Mihomo 字段，不限 Windows；文件名保留以兼容旧导入链接。
 * 在 防DNS泄露.js / 防DNS泄露.yaml 之后应用；出境后禁用。
 * 仅调整按需进程识别、启动 DNS、节点 DNS 和直连 DNS。
 * 原有域名策略、境外代理 DNS、分组、规则、TUN 和 IPv6 均保留。
 */
function main(config) {
  if (!config || !config.dns || typeof config.dns !== "object" || Array.isArray(config.dns)) {
    throw new Error("请先应用防DNS泄露主配置，再应用 Windows 国内网络覆写");
  }
  const next = JSON.parse(JSON.stringify(config));
  next["find-process-mode"] = "strict";
  Object.assign(next.dns, {
    "default-nameserver": ["https://223.5.5.5/dns-query"],
    "proxy-server-nameserver": [
      "https://223.5.5.5/dns-query#DIRECT",
      "https://doh.pub/dns-query#DIRECT",
    ],
    "direct-nameserver": [
      "https://223.5.5.5/dns-query",
      "https://doh.pub/dns-query",
    ],
    "direct-nameserver-follow-policy": true,
  });
  return next;
}
