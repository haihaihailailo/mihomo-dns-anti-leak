# 路由器与 Sub-Store 维护参考

这里保存不含订阅、节点、认证信息和私人设备记录的维护来源。与十二个覆写入口分开：导入远程 CONF **不会**安装这些系统设置，构建工具也不会连接设备。不要将本目录作为机场订阅导入。

适用验证基线：GL-MT3600BE 固件 4.9.0、OpenClash 0.47.156、logrotate 3.17.0。其他版本先检查实际启动脚本；不承诺固件升级后仍保持补丁。

## 日志轮转

- [openclash-logrotate.conf](openclash-logrotate.conf)：当前日志阈值 2 MiB，保留 4 份历史，延迟压缩最近一份；正常未压缩总量约 10 MiB，另预留至少 4 MiB 临时空间。周期检查不是硬配额，实际保留时间取决于日志量。
- 路由器目标为 `/etc/openclash/custom/openclash-logrotate.conf`，root 所有、0600 权限。使用既有 watchdog 循环调用 `/usr/sbin/logrotate -s /tmp/openclash-logrotate.status /etc/openclash/custom/openclash-logrotate.conf`，替换原日志整份清空区块；不能保留清空区块后仅追加轮转命令。
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

候选工具的内存内合成验证使用唯一入口 `python .github/scripts/validate_health_checks.py --check-maintenance`，完整入口与 CI 也会运行。无 Ruby 的本机报告 NOT RUN，CI 必须有 Ruby；不访问设备、不生成测试目录，也不代替实际轮转验收。

## 本地设置参考

这些是设备维护选择，不是公共覆写强制项：路由器自身需要经 OpenClash 解析/代理时核对 `router_self_proxy=1`；订阅更新间隔可设 360 分钟；受限时下载开关保护的订阅先开启供应商开关再更新，不能靠缩短轮询绕过。

公开模板已设置内核 `geo-auto-update: false`，并将越南改为独立 IP 规则集。设备侧停用未使用的 GeoIP.dat/GeoSite.dat 更新前，先确认没有其他规则依赖；Country.mmdb、ASN 及国内路由表的更新按实际使用保留。不要把全部 GEO 更新无差别关闭。

- [闲置服务与开机启动](idle-services.md)
- [Sub-Store 流量合并、过滤和日志](sub-store.md)

私人订阅、运行 YAML、SSH 密钥、备份、服务器地址及完整维护日志不进入此目录。重新安装必须结合设备自己的私有恢复材料。
