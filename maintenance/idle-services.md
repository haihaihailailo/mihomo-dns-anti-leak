# 闲置服务与开机启动

先检查当前功能开关、硬件、进程 RSS、procd 实例及所有启动调用者。停止进程不会关闭开机自启；OpenWrt 原生 `disable` 移除启动链接，`stop` 处理当前进程；热插拔可以显式调用 `start`，因此还须检查这条路径。[OpenWrt rc.common 源码](https://github.com/openwrt/openwrt/blob/master/package/base-files/files/etc/rc.common)

GL-MT3600BE 的条件化参考如下，**不是通用一键停用清单**：

| 服务 | 可停用的前提 | 恢复功能时 |
| --- | --- | --- |
| `netifyd`、`gl_dpi`、`gl_dpi_flow_statistics` | DPI QoS、流量统计和内容保护三个开关均为 0 | 先恢复对应服务和引擎，再验证开启的功能 |
| `gl_cellular_manager`、`sms_manager`、`modem_signal` | 无内置/USB 蜂窝模块，未使用蜂窝上网或短信 | 接入模块前恢复蜂窝与短信服务 |
| `gl_tethering`、`usbmuxd` | 未使用 USB 手机共享网络 | 使用手机共享前恢复两项；USB 插入事件也可能按需启动 usbmuxd |

核对 DPI 三个开关：

```sh
uci -q get gl_dpi_qos.qos.prio_enable
uci -q get gl_dpi_flow_statistics.global.enable
uci -q get gl_dpi_content_protection.content_protection.enabled
```

全部确认为 0 时，`netifyd` 自身的 `enabled=0` 也应保留；服务层对经过确认的单项执行 `/etc/init.d/SERVICE disable` 和原生 `stop`。未运行的服务不必调用带清理副作用的 stop。不要使用通配符删除 init 脚本、包或配置。

此固件的 `/etc/hotplug.d/iface/98-gl-dpi` 在 LAN/guest 的 ifup 直接启动 `gl_dpi`。备份并审查原文后，在 shebang 后加入下面一行，使事件尊重服务开关；此改动不修改防火墙或网络接口：

```sh
/etc/init.d/gl_dpi enabled || exit 0
```

先 `sh -n` 检查；仅在已核对的脚本上模拟 `ACTION=ifup INTERFACE=lan` 并确认未重新拉起。关闭开机入口与模拟事件通过，不等于已进行整机重启验证。固件升级或用户在管理页重新启用功能可能改变这些状态。

保留网络与管理依赖：OpenClash、dnsmasq、netifd、Wi-Fi/中继、SSH、管理网页、时钟同步、风扇。Avahi/DBus 可能服务于局域网发现或 NAS，不因 RSS 数字就直接停止；nginx 多进程 RSS 可能含共享页，不能简单相加。已关闭功能且没有常驻进程的插件通常没有可观的即时内存收益。

修改前在设备登记原始启动链接及目标、init/hotplug 哈希、进程状态、功能开关、内存和回滚步骤；独立检查点限 3 MiB/10 个文件，原子记录，不覆盖既有检查点。回退时先检查漂移，再恢复这些精确链接和文件，只启动原先在运行的服务。不要整份恢复旧 UCI 覆盖后续设置。

内存验证看 `MemAvailable`、同一代理 PID、实际 DNS/HTTPS、已选择的策略与新增 OOM；不要用 VSZ 作为实际物理占用，也不要仅凭一次内存增长诊断泄漏。停用闲置服务是降低内存压力，不能保证永不 OOM；不默认添加 swap、修改 Go 内存参数或清理缓存。
