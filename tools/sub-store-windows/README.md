# Sub-Store Windows 一键启动工具

这个目录是给 Windows 笔记本用的 Sub-Store 小工具。

目标：

- 不用每次手动输入 `cd C:\Sub-Store\backend` 和 `pnpm esbuild:dev`
- 双击启动 Sub-Store 后端
- 自动显示本机、局域网、Tailscale 后端地址
- 自动打开 Sub-Store 前端
- 可选安装开机自启

## 文件说明

| 文件 | 用途 |
|---|---|
| `Start-SubStore.bat` | 双击启动器 |
| `SubStoreLauncher.ps1` | 主启动脚本，自动检查环境并启动后端 |
| `Install-AutoStart.ps1` | 可选：安装 Windows 登录自启任务 |

## 首次使用

先确认电脑已安装：

- Git
- Node.js
- pnpm

如果你已经按前面的步骤装过，就不用重复安装。

## 一键启动

双击：

```text
Start-SubStore.bat
```

启动后会自动：

1. 检查 Node / Git / pnpm
2. 如果没有 `C:\Sub-Store`，自动克隆 Sub-Store
3. 如果已有 `C:\Sub-Store`，尝试 `git pull` 更新
4. 如果缺少依赖，自动执行 `pnpm install`
5. 显示后端地址
6. 打开前端 `https://sub-store.vercel.app`
7. 启动后端

窗口不要关，关掉窗口后后端也会停止。

## 后端地址怎么填

电脑本机用：

```text
http://127.0.0.1:3000
```

同一个 Wi-Fi 的手机 / iPad 用脚本显示的局域网地址，例如：

```text
http://192.168.0.242:3000
```

酒店、办公室来回切换，推荐用 Tailscale 地址，例如：

```text
http://100.x.x.x:3000
```

## 开机自启

用管理员 PowerShell 执行：

```powershell
cd <本目录>
powershell -ExecutionPolicy Bypass -File .\Install-AutoStart.ps1
```

安装后，Windows 登录时会自动启动 Sub-Store 后端。

## 注意

- 不要把机场原始订阅放到陌生人的公开 Sub-Store 后端。
- 如果手机访问失败，确认 Windows 防火墙已放行 TCP 3000。
- 如果笔记本经常换酒店/办公室网络，建议安装 Tailscale，然后使用 `100.x.x.x:3000` 这个固定私有地址。
