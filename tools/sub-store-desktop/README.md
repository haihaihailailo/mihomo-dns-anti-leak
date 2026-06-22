# Sub-Store Desktop for Windows

这是给 Windows 笔记本用的一体化 Sub-Store 桌面应用。

## 目标

不用手动安装 Git、手动 clone、手动输入命令。双击应用后自动完成：

1. 准备便携版 Node.js
2. 准备 pnpm
3. 下载 Sub-Store 源码到本机应用目录
4. 安装 Sub-Store backend 依赖
5. 启动 Sub-Store backend
6. 显示电脑本机、同 Wi-Fi、Tailscale 后端地址
7. 打开 Sub-Store 前端
8. 可选安装 Windows 登录自启

## 数据目录

应用会把运行文件放在：

```text
%LOCALAPPDATA%\SubStoreDesktop
```

主要目录：

```text
%LOCALAPPDATA%\SubStoreDesktop\node
%LOCALAPPDATA%\SubStoreDesktop\pnpm
%LOCALAPPDATA%\SubStoreDesktop\Sub-Store
```

## 使用方式

下载 GitHub Actions 生成的：

```text
SubStoreDesktop-win-x64.exe
```

双击运行，然后点：

```text
一键准备并启动
```

首次运行需要联网，因为要下载 Node、Sub-Store 源码和依赖。

## 地址怎么填

电脑本机使用：

```text
http://127.0.0.1:3000
```

手机和电脑在同一个 Wi-Fi 下使用：

```text
http://电脑局域网IP:3000
```

笔记本在酒店、办公室来回切换时，推荐用 Tailscale：

```text
http://电脑TailscaleIP:3000
```

应用会自动检测并优先显示 Tailscale 地址。

## 编译

GitHub Actions 会自动编译：

```text
.github/workflows/build-substore-desktop.yml
```

产物在 Actions artifact：

```text
SubStoreDesktop-win-x64
```

## 注意

- 关闭应用窗口后，Sub-Store 后端会停止。
- 第一次运行需要能访问 nodejs.org、github.com、npm/pnpm 仓库。
- 如果手机访问失败，请右键以管理员身份运行应用，让它自动放行 Windows 防火墙 TCP 3000。
- 这个程序不是代理客户端，只负责运行 Sub-Store 后端。
