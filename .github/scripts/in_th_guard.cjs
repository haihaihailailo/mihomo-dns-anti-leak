// 仅识别本仓库针对 in.th 的固定隔离式；不是通用逻辑规则解释器。
// 构建 DNS/检查远程源时需要看见内层集合；真实路由仍由客户端执行 AND/NOT。
function unwrapInThGuard(rule) {
  const match = /^AND,\(\(NOT,\(\(DOMAIN-SUFFIX,in\.th\)\)\),\((RULE-SET|DOMAIN-SET),([^,()]+)\)\),([^,()]+)$/.exec(rule);
  return match ? match.slice(1).join(",") : rule;
}
module.exports = { unwrapInThGuard };
