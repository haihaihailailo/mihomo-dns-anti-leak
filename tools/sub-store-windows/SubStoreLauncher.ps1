<#
Sub-Store Windows 一键启动器

作用：
- 自动检查 Node / Git / pnpm
- 自动拉取或更新 C:\Sub-Store
- 自动安装 backend 依赖
- 显示本机、局域网、Tailscale 后端地址
- 自动打开 Sub-Store 前端
- 启动 Sub-Store backend，窗口保持运行
#>

$ErrorActionPreference = "Stop"

$SubStoreRoot = "C:\Sub-Store"
$BackendPath = Join-Path $SubStoreRoot "backend"
$Port = 3000
$FrontendUrl = "https://sub-store.vercel.app"

function Write-Section($Text) {
    Write-Host ""
    Write-Host "==== $Text ====" -ForegroundColor Cyan
}

function Test-Command($Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-LanIPv4 {
    try {
        $cfg = Get-NetIPConfiguration |
            Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" } |
            Select-Object -First 1

        if ($cfg -and $cfg.IPv4Address) {
            return $cfg.IPv4Address.IPAddress
        }
    } catch {}
    return $null
}

function Get-TailscaleIPv4 {
    if (-not (Test-Command "tailscale")) {
        return $null
    }

    try {
        $ip = (& tailscale ip -4 2>$null | Select-Object -First 1).Trim()
        if ($ip -match "^100\.") {
            return $ip
        }
    } catch {}
    return $null
}

function Ensure-FirewallRule {
    try {
        $rule = Get-NetFirewallRule -DisplayName "Sub-Store Backend 3000" -ErrorAction SilentlyContinue
        if (-not $rule) {
            New-NetFirewallRule -DisplayName "Sub-Store Backend 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
            Write-Host "已添加 Windows 防火墙放行规则：TCP $Port" -ForegroundColor Green
        } else {
            Write-Host "Windows 防火墙规则已存在：TCP $Port" -ForegroundColor Green
        }
    } catch {
        Write-Host "未能自动添加防火墙规则。手机访问失败时，请用管理员 PowerShell 执行：" -ForegroundColor Yellow
        Write-Host "New-NetFirewallRule -DisplayName \"Sub-Store Backend 3000\" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port" -ForegroundColor Yellow
    }
}

Write-Section "检查环境"

if (-not (Test-Command "git")) {
    Write-Host "未找到 Git，请先安装：winget install --id Git.Git -e" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}

if (-not (Test-Command "node")) {
    Write-Host "未找到 Node.js，请先安装：winget install --id OpenJS.NodeJS.LTS -e" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}

if (-not (Test-Command "pnpm")) {
    Write-Host "未找到 pnpm，正在安装..." -ForegroundColor Yellow
    npm.cmd install -g pnpm
}

Write-Host "Node: $(& node -v)"
Write-Host "pnpm: $(& pnpm -v)"
Write-Host "Git: $(& git --version)"

Write-Section "准备 Sub-Store"

if (-not (Test-Path $SubStoreRoot)) {
    Write-Host "未找到 $SubStoreRoot，正在克隆 Sub-Store..." -ForegroundColor Yellow
    git clone https://github.com/sub-store-org/Sub-Store.git $SubStoreRoot
} else {
    Write-Host "已找到 $SubStoreRoot，尝试更新..." -ForegroundColor Green
    Push-Location $SubStoreRoot
    try {
        git pull --ff-only
    } catch {
        Write-Host "自动更新失败，继续使用当前版本。" -ForegroundColor Yellow
    }
    Pop-Location
}

if (-not (Test-Path $BackendPath)) {
    Write-Host "未找到 backend 目录：$BackendPath" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}

Push-Location $BackendPath

if (-not (Test-Path (Join-Path $BackendPath "node_modules"))) {
    Write-Host "首次运行，正在安装依赖..." -ForegroundColor Yellow
    pnpm install
} else {
    Write-Host "依赖已存在，跳过 pnpm install。" -ForegroundColor Green
}

Write-Section "网络地址"

Ensure-FirewallRule

$LocalUrl = "http://127.0.0.1:$Port"
$LanIp = Get-LanIPv4
$TailIp = Get-TailscaleIPv4

Write-Host "电脑本机后端：$LocalUrl" -ForegroundColor Green

if ($LanIp) {
    Write-Host "同一 Wi-Fi 后端：http://$LanIp`:$Port" -ForegroundColor Green
} else {
    Write-Host "未检测到局域网 IP。" -ForegroundColor Yellow
}

if ($TailIp) {
    Write-Host "Tailscale 后端：http://$TailIp`:$Port" -ForegroundColor Green
} else {
    Write-Host "未检测到 Tailscale IP。笔记本在酒店/办公室切换时，建议安装 Tailscale。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Sub-Store 前端：$FrontendUrl" -ForegroundColor Cyan
Write-Host "前端里 Backend 地址建议填：" -ForegroundColor Cyan
if ($TailIp) {
    Write-Host "  http://$TailIp`:$Port    （跨网络/多设备推荐）" -ForegroundColor Cyan
} elseif ($LanIp) {
    Write-Host "  http://$LanIp`:$Port    （同一 Wi-Fi 可用）" -ForegroundColor Cyan
} else {
    Write-Host "  $LocalUrl    （仅电脑本机可用）" -ForegroundColor Cyan
}

try {
    Start-Process $FrontendUrl
} catch {}

Write-Section "启动 Sub-Store 后端"
Write-Host "这个窗口不要关。关闭窗口后，Sub-Store 后端也会停止。" -ForegroundColor Yellow
Write-Host ""

$env:SUB_STORE_BACKEND_API_PORT = "$Port"
pnpm esbuild:dev

Pop-Location
