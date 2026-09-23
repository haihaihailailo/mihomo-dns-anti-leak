# 路由器与 Sub-Store 维护参考

这里保存不含订阅、节点、认证信息和私人设备记录的维护来源。与八个公开入口分开：导入远程 CONF **不会**安装这些系统设置，构建工具也不会连接设备。不要将本目录作为机场订阅导入。

已验证旧设备基线：GL-MT3600BE 固件 4.9.0、OpenClash 0.47.156、logrotate 3.17.0。当前 GL-MT6000 应视为新的设备验证基线：在复核实际固件版本、启动脚本、watchdog、logrotate 和服务布局之前，不把 MT3600BE 的维护补丁直接视为已验证可用。其他版本同样先检查实际启动脚本；不承诺固件升级后仍保持补丁。

## 日志轮转（GL-MT3600BE 旧设备候选）

以下阈值、路径和操作步骤属于旧设备的已验证候选，不代表 MT6000 已安装该补丁。MT6000 的原生 OpenClash watchdog 仍可能在达到 `log_size` 时清空整份 `/tmp/openclash.log`；应先核对当前脚本、日志量和可用内存，再决定是否单独适配。不要直接把旧设备的 watchdog 补丁复制到 MT6000。

- [openclash-logrotate.conf](openclash-logrotate.conf)：此候选的轮转阈值为 2 MiB，保留 4 份历史，延迟压缩最近一份；正常未压缩总量约 10 MiB，另预留至少 4 MiB 临时空间。周期检查不是硬配额，实际保留时间取决于日志量。
- 旧设备候选目标为 `/etc/openclash/custom/openclash-logrotate.conf`，root 所有、0600 权限。使用既有 watchdog 循环调用 `/usr/sbin/logrotate -s /tmp/openclash-logrotate.status /etc/openclash/custom/openclash-logrotate.conf`，替换原日志整份清空区块；不能保留清空区块后仅追加轮转命令。
- 历史路径 `/tmp/openclash-log-history/openclash.log.1`、`.2.gz`、`.3.gz`、`.4.gz`。目录由 logrotate 以 0700 创建。插件重启通常追加日志，整机重启会丢失这些 RAM 日志。网页日志主要显示当前文件。
- `copytruncate` 保留写入句柄；复制与截断之间存在少量日志丢失窗口，不适合作为零丢失审计。配置依据 [logrotate 3.17.0 官方手册](https://github.com/logrotate/logrotate/blob/3.17.0/logrotate.8.in)。

### 准备与验证

1. 先确认已有 logrotate、gzip 和 Ruby。备份当前 watchdog、专用轮转配置（若存在）、UCI `log_size` 及 watchdog 服务实例定义。备份只保留在设备，权限 0700/0600，不上传公共仓库。
2. 每个实际操作先登记唯一检查点路径、文件清单、原文件哈希、用途和回滚步骤。单次检查点预算 3 MiB、最多 20 个文件；检查剩余空间，同时为日志预留上述峰值。遇到同名检查点、未知暂存物、链接或漂移停止，不自动覆盖。并发操作必须锁定同一目标；该候选工具本身不会部署或清理。
3. 审查备份原文并计算 SHA256。[prepare-openclash-watchdog.rb](prepare-openclash-watchdog.rb) 仅在哈希与精确旧区块都匹配时输出候选，输入最多 512 KiB；未知版本、多个区块、残余清空语句及已打补丁均拒绝。失败时 shell 可能已创建空输出文件，必须检查退出码，不能安装空候选。

   ```sh
   ruby prepare-openclash-watchdog.rb REVIEWED_SHA256 < watchdog.before > watchdog.candidate
   # Only after exit status 0:
   sh -n watchdog.candidate
   logrotate -d -s /tmp/openclash-logrotate.status /etc/openclash/custom/openclash-logrotate.conf
   ```

4. 在私有检查点内用小型日志验证多轮轮转、历史顺序、压缩内容及原句柄追加；不要为测试强制轮转真实日志。部署前再次检查原文件哈希，以同目录临时文件原子替换 watchdog 并保留原权限；UCI `log_size=2048` 只同步界面，实际轮转以专用配置为准。
5. 新脚本须由新 watchdog 进程加载。根据实际 procd 服务定义，只重建 watchdog 实例，核对代理核心 PID 和手选组不变；不照搬其他版本的实例定义，不为日志修改重启整个代理或路由器。
6. 只清理本次登记、哈希稳定且不再引用的合成暂存物；真实日志和回滚材料保留。记录成功或失败。回退前检查后续漂移，只恢复原 watchdog、原专用配置和原 `log_size`，重新加载 watchdog，保留现有历史日志。

此仓库不提供无人值守安装器。候选生成工具、配置和步骤可复用；设备上的一次性准备脚本及备份不作为通用部署程序发布。每次 OpenClash 更新后检查原清空代码是否回归、轮转配置是否存在以及历史是否继续生成。

可在现有 `/etc/openclash/custom/openclash_custom_overwrite.sh` 的最终 `exit 0` 前加入下面的只读提示。它由既有配置加载过程调用，不另建 cron，也不会给未知升级版本自动打补丁。先确认本机仍使用本目录所述轮转路径，保留原覆写逻辑，并通过 `sh -n` 检查。

```sh
if ! grep -Fq '/usr/sbin/logrotate -s /tmp/openclash-logrotate.status /etc/openclash/custom/openclash-logrotate.conf' /usr/share/openclash/openclash_watchdog.sh || [ ! -r /etc/openclash/custom/openclash-logrotate.conf ]; then
  LOG_OUT "Warning: maintenance log rotation is missing; review the installed OpenClash version before restoring the patch."
fi
```

该提示检测调用文本与配置存在性，不能代替 logrotate 实际执行验证；自定义覆写文件本身被替换时，提示也可能丢失。升级后仍需检查恢复材料。

候选工具的内存内合成验证使用唯一入口 `python .github/scripts/validate_health_checks.py --check-maintenance`，完整入口与 CI 也会运行。无 Ruby 的本机报告 NOT RUN，CI 必须有 Ruby；不访问设备、不生成测试目录，也不代替实际轮转验收。

## 本地设置参考

这些是设备维护选择，不是公共覆写强制项：路由器自身需要经 OpenClash 解析/代理时核对 `router_self_proxy=1`；订阅更新间隔建议 180 分钟。已启用的订阅、公共模块、规则集和实际使用的 GEO 数据更新，检查间隔最长 24 小时：模块每天检查，Country.mmdb 可每天 04:00 更新；规则集保持 86400 秒。关闭或未使用的功能不因此启用。频率不等于成功刷新；受下载开关保护的订阅先开启供应商开关，失败时保留最后成功缓存。

公开模板已设置内核 `geo-auto-update: false`，并将越南改为独立 IP 规则集。设备侧停用未使用的 GeoIP.dat/GeoSite.dat 更新前，先确认没有其他规则依赖；Country.mmdb、ASN 及国内路由表的更新按实际使用保留。不要把全部 GEO 更新无差别关闭。

- [闲置服务与开机启动](idle-services.md)
- [Sub-Store 流量合并、过滤和日志](sub-store.md)
- [有界流量回退候选工具](prepare-sub-store-flow.cjs)：复用原生缓存，仅处理指定来源，候选须经审查后手动部署。

私人订阅、运行 YAML、SSH 密钥、备份、服务器地址及完整维护日志不进入此目录。重新安装必须结合设备自己的私有恢复材料。

## DNS 接管方式与运行设置检查

Fake-IP 应答模式保持不变。本节只比较 `enable_redirect_dns=2`（防火墙直接转发到 Mihomo）和 `1`（dnsmasq 先处理本地域，再转发到 Mihomo）。这不是加密 DNS 与明文 DNS 的选择，两种方式都继续使用公共模板的 DoH 和解析策略。

- 远程 CONF 内嵌 `.github/scripts/openclash_local_dns.rb`：只读本机 UCI；模式 2 且 dnsmasq 的 domain/local 相互匹配时，把该权威域的 DNS 送往本机 dnsmasq，并保持该条在公共策略之前。不硬编码 LAN 地址、域名或接口；端口无效、与核心端口相同、域不权威时拒绝赋值。未配置域或未知接管模式不猜测上游。
- 模式 1 不注入回送。OpenClash 原生流程设置 dnsmasq 的 `server=127.0.0.1#核心DNS端口`、`noresolv=1` 和 `cachesize=0`，保留 DHCP/本地域解析，缓存交给 Mihomo。不要把 Mihomo 通用 nameserver 再指回 dnsmasq，也不额外部署 SmartDNS/MosDNS。
- 旧设备自定义覆写可能仍包含本地域名补丁。只有确认新模块最终配置等价、保留其他自定义逻辑并建立回退后，才移除本任务识别的旧区块；不覆盖整份用户脚本。
- [openclash-settings-audit.rb](openclash-settings-audit.rb) 在设备上以 `ruby openclash-settings-audit.rb /etc/openclash/实际运行配置.yaml` 运行。只输出字段一致性、更新上限和 TLS 保护形式的汇总，不输出节点、订阅、密钥。退出码 0 表示这些配置检查通过，1 表示发现待检查项，2 表示采集不完整；不能代替内核 API、防火墙、DNS 实测或证书握手。
- Hysteria2 的 `skip-cert-verify=true` 若同时含 SHA-256 证书 `fingerprint`，先核实 pinning；不要统一强改为 false。配置形状正确不代表服务器证书匹配，须在隔离核心用正确/错误指纹做正负向测试，不能改动运行节点。

切换前备份 UCI、dhcp、crontab、公共模块、自定义脚本、运行配置和手选策略，登记路径、哈希、容量与回退。测试 IPv4/IPv6、TCP/UDP 的路由器 DNS 与硬编码外部 DNS，本地域名、未知本地域的 NXDOMAIN、国内外 HTTPS 和实际命中规则；检查 WAN 53/核心 DNS 端口仍拒绝入站。验证一次 OpenClash 重启及停止后的 DNS 恢复，不能用单次 HTTP 200 宣称长期稳定。失败恢复原接管方式及原脚本。

## WAN DNS 入站防护

[openclash-wan-dns-guard.sh](openclash-wan-dns-guard.sh) 是可选的原生自定义防火墙钩子组件，不随公共 CONF 自动安装。它从 WAN zone 的 INPUT 规则读取接口，对 IPv4/IPv6 的 TCP/UDP 53 和核心 DNS 端口，拒绝 ORIGINAL 方向入站；不拦截路由器主动请求的回复。不得只凭监听地址或“仅内网访问”开关推断边界。

当前实现针对 fw3/iptables，检测到 fw4 时拒绝操作；不能在未验收设备上宣称兼容 nftables。安装前做 `sh -n`，保留原钩子，在其中 source 此文件并显式调用 `oc_wan_dns_guard`，失败须记录警告。接口变化、规则重建、升级和服务重启后复核规则并从 WAN 实测。源码和 mocked 测试可以公开，设备检查点和私有网络记录留在本地。
