/**
 * 防DNS泄露.js
 * JavaScript override for Clash Party / Mihomo Party.
 *
 * 维护口径：
 * - 防DNS泄露.yaml 是完整 YAML 主配置。
 * - 本文件是 JS 覆写版本，当前同步 DNS / TUN / Sniffer / 基础防泄露项。
 * - 以后修改 YAML 中的 DNS、TUN、Sniffer、防泄露相关配置时，也要同步修改本 JS。
 */

function main(config) {
  config["unified-delay"] = true;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["tcp-concurrent"] = true;

  config.profile = {
    ...(config.profile || {}),
    "store