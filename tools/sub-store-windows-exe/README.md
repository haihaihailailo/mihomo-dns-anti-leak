# SubStoreLauncher.exe

这是 Sub-Store Windows 单文件启动器。

## 功能

双击 `SubStoreLauncher-win-x64.exe` 后会自动：

1. 检查 Git / Node.js / pnpm
2. 如果没有 `C:\Sub-Store`，自动克隆 Sub-Store
3. 如果已有 `C:\Sub-Store`，尝试更新
4. 如果缺少依赖，自动执行 `pnpm install`
5. 显示电脑本机、同 Wi-Fi、Tailscale 后端地址
6. 自动打开 `https://sub-store.vercel.app`
7. 启动 Sub-Store 后端

窗口不要关。关闭窗口后，Sub-Store 后端也会停止。

## 后端地址怎么填

电脑本机：

```text
http://127.0.0.1:3000
```

同一个 Wi-Fi：

```text
http://电脑局域网IP:3000
```

酒店 / 办公室来回切换，推荐 Tailscale：

```text
http://电脑TailscaleIP:3000
```

## 编译

GitHub Actions 会自动编译：

```text
.github/workflows/build-substore-launcher.yml
```

编译产物在 workflow artifact 里：

```text
SubStoreLauncher-win-x64.exe
```

## 注意

- 这个 exe 不内置 Sub-Store 后端源码，它会使用或下载 `C:\Sub-Store`。
- 第一次运行仍然需要电脑能访问 GitHub 和 npm/pnpm 仓库。
- 如果手机无法访问电脑后端，右键“以管理员身份运行”这个 exe，或手动放行 Windows 防火墙 TCP 3000。
