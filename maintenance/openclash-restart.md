# OpenClash 重启期间的 DNS 接管保护

在已接管 DNS 的设备上，原生重启会暂时恢复 dnsmasq 公共上游并删除 DNS REDIRECT。核心恢复前，向路由器或硬编码公共 DNS 发出的查询可能绕开原接管。此候选在符合条件的重启期间保留接管，核心停止时允许短暂超时；普通停止仍恢复原生 DNS。

## 适用范围与来源

复用 OpenClash 原生 `restart`、`stop_service`、`revert_firewall` 和自定义防火墙钩子，不引入另一套服务。候选生成方式沿用本仓库 [watchdog 生成器](prepare-openclash-watchdog.rb) 的哈希及精确区块校验。

设备验证基线为 GL-MT6000、固件 4.9.1、OpenWrt 21.02 / fw3、OpenClash 0.47.156、Mihomo 1.19.31。仅适用于启用状态、dnsmasq 接管已生效、dnsmasq 监听 53、LAN 访问控制模式 0 且无黑名单的配置。未知脚本、已打补丁、多个匹配或哈希漂移均拒绝；**版本号不构成安装许可**。fw4、其他端口和访问控制组合没有设备验收，不应部署本候选。

## 候选内容

- [prepare-openclash-restart.rb](prepare-openclash-restart.rb) 从 stdin 读取最多 512 KiB 已审查 init，向 stdout 输出完整候选；不访问设备、不写文件、不执行输入源码。
- 显式重启期间保留 dnsmasq 指向核心；符合上述条件时同时保留原生 DNS REDIRECT 与 WAN DNS guard。OUTPUT 重建先检查是否存在，防止累计重复。
- 原生 DNAT ACCEPT 插入在已有 WAN guard 之后；[防火墙钩子](openclash-wan-dns-guard.sh) 同时负责将 guard 移到链首。两部分需要配合，不能只保留规则却继续使用不能修正顺序的旧钩子。
- 不改变 Fake-IP、公共 DNS 上游、规则、节点、手选组或设备 TUN 参数。维护代码不嵌入远程 CONF，订阅/模块更新不会安装它。

## 准备、安装与回退

1. 先读取实际 init、watchdog、自定义防火墙钩子、运行设置和两族规则，核对上述资格；特别确认 PREROUTING 的原生 DNS REDIRECT 指向 53、没有 ACL/ipset 依赖。核对 RAM、持久存储和源文件哈希。
2. 在设备私有检查点登记原 init、原钩子、候选、相关配置、手选组、哈希、验证及回退说明。参考已验证设备预算为 4 MiB、最低空闲 32 MiB；实际不足则停止。检查点和配置不上传仓库。用并发锁保护操作，拒绝未知暂存、链接或漂移；不得覆盖现有证据。
3. 生成候选并检查退出码：

   ```sh
   ruby prepare-openclash-restart.rb REVIEWED_SHA256 < init.before > init.candidate
   sh -n init.candidate
   sh -n openclash-wan-dns-guard.sh
   ```

   重定向可能留下空候选，失败不得安装。审查 diff，并将新版 guard 集成到既有钩子中，保留其他用户逻辑。生成器不负责复制、安装或执行候选。
4. 获准设备部署后，在锁内再次核对现场身份，按原模式/所有者以同目录临时文件原子替换两个目标，再经原生 OpenClash 重启验证。替换两个文件不是跨文件原子事务；中断或任一失败时停止重启，先恢复成对的一致状态。
5. 比较运行配置及手选组；测路由器/公共 DNS、IPv4/IPv6、TCP/UDP、A/AAAA、本地域与 HTTPS。持续采样重启窗口，从 WAN 实测 53/核心 DNS 端口隔离，并核对 guard 在 DNAT ACCEPT 前、OUTPUT 无重复。
6. 回退须核对后续漂移，成对恢复本次原 init 和原钩子，再原生重启并验证；这会重新暴露原 DNS 重启窗口。日志轮转可独立回退。不要恢复整套旧 UCI 覆盖其他改动，不删除检查点证据。

升级后核对补丁及钩子是否仍在、规则顺序和真实 DNS 行为。未知版本需要重新生成/审查，不自动重打补丁。

## 已有设备验证及边界

2026-09-24 的设备测试：外部 DNS 矩阵覆盖 16 条路径，基线 800 次查询出现 41 次非 Fake-IP；最终 800 次为 736 次 Fake-IP、64 次切换超时、0 次非 Fake-IP。WAN 规则顺序抽查 860 次无异常；整机软件重启前后各 8 项 WAN DNS 入站拒绝通过，网络恢复后 160 次 DNS 查询全部 Fake-IP，16 个手动选择保持。

日志轮转完成 6 轮合成验证及一次真实强制轮转，内容、写入句柄及核心进程保持；不冒充已自然跨过每日或大小阈值。整机软件重启验证通过，不是断电冷启动；不覆盖 DoH/DoT、所有客户端、任意配置切换或长期连续稳定性。

仓库回归通过唯一入口 `python .github/scripts/validate_health_checks.py --check-maintenance` 执行内存内合成报文和防火墙模型；默认完整入口及 CI 同样调用。覆盖未知输入拒绝、普通停止恢复、资格分支、删除索引、OUTPUT 幂等、DNAT 顺序、guard 重定位/重复调用和失败保留保护，不接触真实防火墙。没有 Ruby 的本机明确报告 NOT RUN，CI 必须执行。
