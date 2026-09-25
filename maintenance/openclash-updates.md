# OpenClash 定时更新与无变化下载

维护候选与公共 CONF 分开，导入或更新公共模块不会安装本页补丁。

## 修复范围

- GEO 登记：旧代码把四种数据库包在同一个 `grep openclash_geo.sh` 判断内。只要已有 Country/ipdb 任务，其他已启用任务就可能漏登记。候选按 ipdb、geosite、geoip、geoasn 分别判断，保留原 UCI 开关、时间及命令，不启用关闭的功能，不立即运行更新。
- 公共模块：原下载器对 HTTP 304 返回 2，原生 cron 因此不重启；HTTP 200 则直接替换文件并返回 0，即使正文相同也会重启。候选仅对下载路径与对比路径相同的调用，在替换前比较正文；相同返回 2，变化保留原流程，比较错误返回 1 并保留原文件。下载失败及 304 的处理不变；GEO/CHNRoute 等不同路径调用不变。
- 相同正文分支保留原 ETag 状态，避免更新缓存时间后与保留文件的 mtime 不匹配。因此上游改变 ETag 却未改变正文时，后续可能仍需下载正文；这里保证不因相同正文重启，不保证节省每次下载流量。

工具 [prepare-openclash-updates.cjs](prepare-openclash-updates.cjs) 复用原生调度、下载器及返回码，不创建额外服务或定时器。它只在本地生成候选，最大输入 512 KiB；要求审查后的原文 SHA-256 和唯一精确旧区块，未知布局、重复区块、已修复输入和无效 UTF-8 拒绝处理。不要仅凭版本号匹配。

```sh
node maintenance/prepare-openclash-updates.cjs geo REVIEWED_SHA256 < init.before > init.candidate
node maintenance/prepare-openclash-updates.cjs overwrite REVIEWED_SHA256 < curl.before > curl.candidate
# 仅在候选命令退出码为 0 后，检查目标平台 shell 语法。
sh -n init.candidate
bash -n curl.candidate
```

## 部署及回退边界

1. 单独授权具体设备部署；读取当前 `/etc/init.d/openclash`、`/usr/share/openclash/openclash_curl.sh`、UCI、cron 及调用点，确认相同路径调用的返回 2 确实阻止重启。下载器可能有其他同路径调用，也应按内容未变化处理。
2. 在私有检查点预登记原文件、候选、cron、权限、SHA-256 和验收记录；单次预算 2 MiB、最多 12 个文件，检查可用空间，已有同名检查点停止。保留必要旧回退，不自动删除存量。设备数据和完整 cron 不提交 Git。
3. 原文件与候选都完成语法检查、差异审查及合成验证后，在锁内再次核对哈希、权限及非链接属性，使用同目录临时文件原子替换。工具自身不安装、不加锁、不创建检查点，也不自动执行 crontab 或 restart。
4. GEO 候选只修复今后的登记逻辑；已有缺失 cron 需结合本机启用设置单独补齐并回读，不能为生成 cron 而盲目重启。下载器候选供下次原生下载读取，无须重启核心。核对运行配置、核心 PID、选择组及其他私有文件未被修改。
5. 回退前核对后续漂移，只恢复本次修改文件的已验证原件、原权限及本次增添的 cron；保留后来新增的用户任务。升级 OpenClash 后重新审查，不给未知版本自动打补丁。

唯一验证入口为 `python .github/scripts/validate_health_checks.py --check-maintenance`，完整入口也调用相同检查。新增测试用内存 Shell 替身覆盖已有单项任务、重复登记、关闭开关、HTTP 200 相同/变化内容、比较失败、首次下载和不同路径；无 POSIX shell 时本机明确 NOT RUN，CI 必须执行。合成测试不等同于真实下载或长期运行验收。

当前设备证据：GEO 分项登记修复已在 2026-09-25 单独部署；2026-09-26 00:00 的国内 IPv4/IPv6 路由表有更新成功日志和文件时间。正文比较补丁于 00:44 单独部署，目标平台语法检查、完整原生下载函数的三种 HTTP 200 内存夹具及安装回读通过；核心 PID、运行配置、UCI 和 cron 未变，未执行重启。04:00 GEO 和 05:00 公共模块本轮实际执行仍待验收；内存夹具不代表已经发生真实相同正文下载。
