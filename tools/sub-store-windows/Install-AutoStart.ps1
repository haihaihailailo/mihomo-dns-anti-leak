<#
安装 Sub-Store 开机自启任务。

用法：
1. 右键 PowerShell，选择“以管理员身份运行”
2. cd 到本目录
3. 执行：powershell -ExecutionPolicy Bypass -File .\Install-AutoStart.ps1

效果：
- Windows 登录后自动打开 SubStoreLauncher.ps1
- 适合笔记本每天开机后自动启动后端
#>

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $ScriptDir "SubStoreLauncher.ps1"
$TaskName = "Sub-Store Backend Launcher"

if (-not (Test-Path $Launcher)) {
    Write-Host "找不到启动器：$Launcher" -ForegroundColor Red
    exit 1
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Launcher`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 0)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null

Write-Host "已安装开机自启任务：$TaskName" -ForegroundColor Green
Write-Host "下次登录 Windows 后会自动启动 Sub-Store 后端。" -ForegroundColor Green
