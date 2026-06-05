// 防DNS泄露.js
// JS 覆写入口文件。
// 当前仓库以 防DNS泄露.yaml 为主配置；后续更新时，YAML 与 JS 需要同步维护。
// 完整 JS 版本已在本地转换完成，但当前 GitHub 写入接口拦截了包含 DNS/TUN 字段的完整提交。

function main(config) {
  return config;
}
