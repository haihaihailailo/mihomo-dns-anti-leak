using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;

Console.OutputEncoding = Encoding.UTF8;
Console.Title = "Sub-Store Launcher";

var app = new SubStoreLauncher.App();
return app.Run();

namespace SubStoreLauncher;

internal sealed class App
{
    private const string SubStoreRoot = @"C:\Sub-Store";
    private const string BackendPath = @"C:\Sub-Store\backend";
    private const int Port = 3000;
    private const string FrontendUrl = "https://sub-store.vercel.app";

    public int Run()
    {
        try
        {
            Section("Sub-Store Windows 启动器");
            Info("这个窗口不要关。关闭窗口后，Sub-Store 后端也会停止。\n");

            CheckEnvironment();
            PrepareSubStore();
            EnsureDependencies();
            ShowAddresses();
            OpenFrontend();
            StartBackend();
            return 0;
        }
        catch (Exception ex)
        {
            Error("启动失败：" + ex.Message);
            Console.WriteLine();
            Console.WriteLine(ex);
            Pause();
            return 1;
        }
    }

    private void CheckEnvironment()
    {
        Section("检查环境");

        if (!CommandExists("git"))
        {
            throw new InvalidOperationException("未找到 Git。请先执行：winget install --id Git.Git -e");
        }

        if (!CommandExists("node"))
        {
            throw new InvalidOperationException("未找到 Node.js。请先执行：winget install --id OpenJS.NodeJS.LTS -e");
        }

        if (!CommandExists("pnpm"))
        {
            Warn("未找到 pnpm，正在安装...");
            RunProcess("npm.cmd", "install -g pnpm", Environment.CurrentDirectory, true);
        }

        Info("Node: " + Capture("node", "-v"));
        Info("pnpm: " + Capture("pnpm.cmd", "-v"));
        Info("Git: " + Capture("git", "--version"));
    }

    private void PrepareSubStore()
    {
        Section("准备 Sub-Store");

        if (!Directory.Exists(SubStoreRoot))
        {
            Warn($"未找到 {SubStoreRoot}，正在克隆 Sub-Store...");
            RunProcess("git", $"clone https://github.com/sub-store-org/Sub-Store.git \"{SubStoreRoot}\"", @"C:\", true);
        }
        else
        {
            Success($"已找到 {SubStoreRoot}，尝试更新...");
            var code = RunProcess("git", "pull --ff-only", SubStoreRoot, true, throwOnError: false);
            if (code != 0)
            {
                Warn("自动更新失败，继续使用当前版本。");
            }
        }

        if (!Directory.Exists(BackendPath))
        {
            throw new DirectoryNotFoundException($"未找到 backend 目录：{BackendPath}");
        }
    }

    private void EnsureDependencies()
    {
        Section("检查依赖");

        var nodeModules = Path.Combine(BackendPath, "node_modules");
        if (!Directory.Exists(nodeModules))
        {
            Warn("首次运行，正在安装依赖...");
            RunProcess("pnpm.cmd", "install", BackendPath, true);
        }
        else
        {
            Success("依赖已存在，跳过 pnpm install。");
        }
    }

    private void ShowAddresses()
    {
        Section("后端地址");

        EnsureFirewallRule();

        var localUrl = $"http://127.0.0.1:{Port}";
        var lanIp = GetLanIPv4();
        var tailIp = GetTailscaleIPv4();

        Success("电脑本机后端：" + localUrl);

        if (!string.IsNullOrWhiteSpace(lanIp))
        {
            Success($"同一 Wi-Fi 后端：http://{lanIp}:{Port}");
        }
        else
        {
            Warn("未检测到局域网 IP。");
        }

        if (!string.IsNullOrWhiteSpace(tailIp))
        {
            Success($"Tailscale 后端：http://{tailIp}:{Port}");
        }
        else
        {
            Warn("未检测到 Tailscale IP。酒店/办公室来回切换时，建议安装 Tailscale。");
        }

        Console.WriteLine();
        Info("Sub-Store 前端：" + FrontendUrl);
        Info("前端 Backend 地址建议填：");
        if (!string.IsNullOrWhiteSpace(tailIp))
        {
            Console.WriteLine($"  http://{tailIp}:{Port}    （跨网络/多设备推荐）");
        }
        else if (!string.IsNullOrWhiteSpace(lanIp))
        {
            Console.WriteLine($"  http://{lanIp}:{Port}    （同一 Wi-Fi 可用）");
        }
        else
        {
            Console.WriteLine($"  {localUrl}    （仅电脑本机可用）");
        }
    }

    private void OpenFrontend()
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = FrontendUrl,
                UseShellExecute = true
            });
        }
        catch
        {
            // Ignore browser launch failures.
        }
    }

    private void StartBackend()
    {
        Section("启动 Sub-Store 后端");
        Warn("这个窗口不要关。关闭窗口后，Sub-Store 后端也会停止。");
        Console.WriteLine();

        var psi = new ProcessStartInfo
        {
            FileName = "pnpm.cmd",
            Arguments = "esbuild:dev",
            WorkingDirectory = BackendPath,
            UseShellExecute = false
        };
        psi.Environment["SUB_STORE_BACKEND_API_PORT"] = Port.ToString();

        using var process = Process.Start(psi) ?? throw new InvalidOperationException("无法启动 pnpm esbuild:dev");
        process.WaitForExit();
    }

    private static bool CommandExists(string command)
    {
        try
        {
            var output = Capture("where.exe", command);
            return !string.IsNullOrWhiteSpace(output);
        }
        catch
        {
            return false;
        }
    }

    private static string Capture(string fileName, string arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(psi) ?? throw new InvalidOperationException($"无法执行 {fileName}");
        var stdout = process.StandardOutput.ReadToEnd();
        var stderr = process.StandardError.ReadToEnd();
        process.WaitForExit();

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException($"{fileName} {arguments} 执行失败：{stderr}");
        }

        return stdout.Trim();
    }

    private static int RunProcess(string fileName, string arguments, string workingDirectory, bool streamOutput, bool throwOnError = true)
    {
        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = !streamOutput,
            RedirectStandardError = !streamOutput
        };

        using var process = Process.Start(psi) ?? throw new InvalidOperationException($"无法执行 {fileName}");

        string stdout = string.Empty;
        string stderr = string.Empty;
        if (!streamOutput)
        {
            stdout = process.StandardOutput.ReadToEnd();
            stderr = process.StandardError.ReadToEnd();
        }

        process.WaitForExit();

        if (throwOnError && process.ExitCode != 0)
        {
            throw new InvalidOperationException($"命令失败：{fileName} {arguments}\n{stdout}\n{stderr}");
        }

        return process.ExitCode;
    }

    private static string? GetLanIPv4()
    {
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up)
                    continue;

                var props = ni.GetIPProperties();
                if (!props.GatewayAddresses.Any(g => g.Address.AddressFamily == AddressFamily.InterNetwork))
                    continue;

                var ip = props.UnicastAddresses
                    .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork && !a.Address.ToString().StartsWith("169.254."))
                    ?.Address.ToString();

                if (!string.IsNullOrWhiteSpace(ip))
                    return ip;
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static string? GetTailscaleIPv4()
    {
        if (!CommandExists("tailscale"))
            return null;

        try
        {
            var ip = Capture("tailscale", "ip -4")
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault()
                ?.Trim();

            return !string.IsNullOrWhiteSpace(ip) && ip.StartsWith("100.") ? ip : null;
        }
        catch
        {
            return null;
        }
    }

    private static void EnsureFirewallRule()
    {
        try
        {
            var check = RunProcess(
                "powershell.exe",
                "-NoProfile -ExecutionPolicy Bypass -Command \"if (Get-NetFirewallRule -DisplayName 'Sub-Store Backend 3000' -ErrorAction SilentlyContinue) { exit 0 } else { exit 2 }\"",
                Environment.CurrentDirectory,
                streamOutput: false,
                throwOnError: false);

            if (check == 0)
            {
                Success("Windows 防火墙规则已存在：TCP 3000");
                return;
            }

            var add = RunProcess(
                "powershell.exe",
                "-NoProfile -ExecutionPolicy Bypass -Command \"New-NetFirewallRule -DisplayName 'Sub-Store Backend 3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000\"",
                Environment.CurrentDirectory,
                streamOutput: false,
                throwOnError: false);

            if (add == 0)
                Success("已添加 Windows 防火墙放行规则：TCP 3000");
            else
                Warn("未能自动添加防火墙规则。手机访问失败时，请右键以管理员身份运行本程序，或手动放行 TCP 3000。");
        }
        catch
        {
            Warn("未能自动添加防火墙规则。手机访问失败时，请手动放行 TCP 3000。");
        }
    }

    private static void Section(string text)
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine();
        Console.WriteLine("==== " + text + " ====");
        Console.ResetColor();
    }

    private static void Info(string text) => Console.WriteLine(text);

    private static void Success(string text)
    {
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine(text);
        Console.ResetColor();
    }

    private static void Warn(string text)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine(text);
        Console.ResetColor();
    }

    private static void Error(string text)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine(text);
        Console.ResetColor();
    }

    private static void Pause()
    {
        Console.WriteLine();
        Console.Write("按回车退出...");
        Console.ReadLine();
    }
}
