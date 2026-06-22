using System.Diagnostics;
using System.IO.Compression;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.Json;

namespace SubStoreDesktop;

public sealed class MainForm : Form
{
    private const int Port = 3000;
    private const string FrontendUrl = "https://sub-store.vercel.app";
    private static readonly string AppRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SubStoreDesktop");
    private static readonly string NodeDir = Path.Combine(AppRoot, "node");
    private static readonly string PnpmPrefix = Path.Combine(AppRoot, "pnpm");
    private static readonly string SubStoreRoot = Path.Combine(AppRoot, "Sub-Store");
    private static readonly string BackendPath = Path.Combine(SubStoreRoot, "backend");

    private readonly bool _autoStart;
    private readonly TextBox _logBox = new();
    private readonly Label _statusLabel = new();
    private readonly TextBox _backendBox = new();
    private readonly Button _prepareStartButton = new();
    private readonly Button _stopButton = new();
    private readonly Button _openFrontendButton = new();
    private readonly Button _copyBackendButton = new();
    private readonly Button _autoStartButton = new();
    private readonly Button _refreshAddressButton = new();

    private Process? _backendProcess;
    private bool _busy;

    public MainForm(bool autoStart)
    {
        _autoStart = autoStart;
        BuildUi();
        Load += async (_, _) =>
        {
            RefreshBackendAddress();
            if (_autoStart)
            {
                await PrepareAndStartAsync();
            }
        };
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        StopBackend();
        base.OnFormClosing(e);
    }

    private void BuildUi()
    {
        Text = "Sub-Store Desktop";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 920;
        Height = 650;
        MinimumSize = new Size(820, 560);
        Font = new Font("Microsoft YaHei UI", 9F);

        var title = new Label
        {
            Text = "Sub-Store Windows 一体化应用",
            Font = new Font(Font.FontFamily, 16F, FontStyle.Bold),
            AutoSize = true,
            Left = 20,
            Top = 18
        };
        Controls.Add(title);

        var subtitle = new Label
        {
            Text = "一键准备环境、启动后端、显示 Tailscale / Wi-Fi 后端地址。首次运行会下载便携版 Node 和 Sub-Store。",
            AutoSize = true,
            Left = 22,
            Top = 55,
            ForeColor = Color.DimGray
        };
        Controls.Add(subtitle);

        _statusLabel.Text = "状态：未启动";
        _statusLabel.AutoSize = true;
        _statusLabel.Left = 22;
        _statusLabel.Top = 88;
        _statusLabel.ForeColor = Color.DarkOrange;
        Controls.Add(_statusLabel);

        var backendLabel = new Label
        {
            Text = "推荐后端地址：",
            AutoSize = true,
            Left = 22,
            Top = 122
        };
        Controls.Add(backendLabel);

        _backendBox.Left = 120;
        _backendBox.Top = 118;
        _backendBox.Width = 520;
        _backendBox.ReadOnly = true;
        Controls.Add(_backendBox);

        _copyBackendButton.Text = "复制地址";
        _copyBackendButton.Left = 650;
        _copyBackendButton.Top = 116;
        _copyBackendButton.Width = 90;
        _copyBackendButton.Click += (_, _) =>
        {
            if (!string.IsNullOrWhiteSpace(_backendBox.Text))
            {
                Clipboard.SetText(_backendBox.Text);
                AppendLog("已复制后端地址：" + _backendBox.Text);
            }
        };
        Controls.Add(_copyBackendButton);

        _refreshAddressButton.Text = "刷新地址";
        _refreshAddressButton.Left = 750;
        _refreshAddressButton.Top = 116;
        _refreshAddressButton.Width = 90;
        _refreshAddressButton.Click += (_, _) => RefreshBackendAddress();
        Controls.Add(_refreshAddressButton);

        _prepareStartButton.Text = "一键准备并启动";
        _prepareStartButton.Left = 22;
        _prepareStartButton.Top = 160;
        _prepareStartButton.Width = 140;
        _prepareStartButton.Height = 36;
        _prepareStartButton.Click += async (_, _) => await PrepareAndStartAsync();
        Controls.Add(_prepareStartButton);

        _stopButton.Text = "停止后端";
        _stopButton.Left = 175;
        _stopButton.Top = 160;
        _stopButton.Width = 110;
        _stopButton.Height = 36;
        _stopButton.Enabled = false;
        _stopButton.Click += (_, _) => StopBackend();
        Controls.Add(_stopButton);

        _openFrontendButton.Text = "打开前端";
        _openFrontendButton.Left = 298;
        _openFrontendButton.Top = 160;
        _openFrontendButton.Width = 110;
        _openFrontendButton.Height = 36;
        _openFrontendButton.Click += (_, _) => OpenUrl(FrontendUrl);
        Controls.Add(_openFrontendButton);

        _autoStartButton.Text = "安装开机自启";
        _autoStartButton.Left = 421;
        _autoStartButton.Top = 160;
        _autoStartButton.Width = 130;
        _autoStartButton.Height = 36;
        _autoStartButton.Click += (_, _) => InstallAutoStart();
        Controls.Add(_autoStartButton);

        var tips = new Label
        {
            Text = "提示：窗口关闭后后端会停止。酒店/办公室切换网络时，建议用 Tailscale 地址 100.x.x.x:3000。",
            AutoSize = true,
            Left = 22,
            Top = 210,
            ForeColor = Color.DarkSlateBlue
        };
        Controls.Add(tips);

        _logBox.Left = 22;
        _logBox.Top = 240;
        _logBox.Width = 850;
        _logBox.Height = 350;
        _logBox.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
        _logBox.Multiline = true;
        _logBox.ScrollBars = ScrollBars.Vertical;
        _logBox.ReadOnly = true;
        _logBox.Font = new Font("Consolas", 9F);
        Controls.Add(_logBox);
    }

    private async Task PrepareAndStartAsync()
    {
        if (_busy) return;
        if (_backendProcess is { HasExited: false })
        {
            AppendLog("后端已经在运行。终端地址：" + _backendBox.Text);
            return;
        }

        _busy = true;
        SetButtonsEnabled(false);
        try
        {
            Directory.CreateDirectory(AppRoot);
            SetStatus("准备环境中...", Color.DarkOrange);
            AppendLog("应用目录：" + AppRoot);

            await Task.Run(async () =>
            {
                await EnsurePortableNodeAsync();
                await EnsurePnpmAsync();
                await EnsureSubStoreAsync();
                EnsureFirewallRule();
                await EnsureBackendDependenciesAsync();
            });

            RefreshBackendAddress();
            StartBackend();
            OpenUrl(FrontendUrl);
        }
        catch (Exception ex)
        {
            SetStatus("启动失败", Color.Red);
            AppendLog("启动失败：" + ex.Message);
            MessageBox.Show(this, ex.Message, "Sub-Store Desktop", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            _busy = false;
            SetButtonsEnabled(true);
        }
    }

    private async Task EnsurePortableNodeAsync()
    {
        var nodeExe = Path.Combine(NodeDir, "node.exe");
        var npmCmd = Path.Combine(NodeDir, "npm.cmd");
        if (File.Exists(nodeExe) && File.Exists(npmCmd))
        {
            AppendLog("便携版 Node 已存在：" + Capture(nodeExe, "-v"));
            return;
        }

        AppendLog("未检测到便携版 Node，开始下载 Node LTS win-x64 zip...");
        var (version, url) = await GetLatestNodeLtsWinX64Async();
        AppendLog("Node LTS：" + version);
        AppendLog("下载地址：" + url);

        var tempRoot = Path.Combine(Path.GetTempPath(), "SubStoreDesktop-Node-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);
        var zipPath = Path.Combine(tempRoot, "node.zip");

        using (var http = new HttpClient())
        {
            http.Timeout = TimeSpan.FromMinutes(10);
            await using var stream = await http.GetStreamAsync(url);
            await using var file = File.Create(zipPath);
            await stream.CopyToAsync(file);
        }

        ZipFile.ExtractToDirectory(zipPath, tempRoot);
        var extracted = Directory.GetDirectories(tempRoot)
            .FirstOrDefault(d => File.Exists(Path.Combine(d, "node.exe")))
            ?? throw new InvalidOperationException("Node zip 解压后未找到 node.exe");

        if (Directory.Exists(NodeDir)) Directory.Delete(NodeDir, true);
        Directory.Move(extracted, NodeDir);
        Directory.Delete(tempRoot, true);
        AppendLog("便携版 Node 已准备好：" + Capture(nodeExe, "-v"));
    }

    private static async Task<(string Version, string Url)> GetLatestNodeLtsWinX64Async()
    {
        using var http = new HttpClient();
        http.Timeout = TimeSpan.FromSeconds(30);
        var json = await http.GetStringAsync("https://nodejs.org/dist/index.json");
        using var doc = JsonDocument.Parse(json);

        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (!item.TryGetProperty("lts", out var lts) || lts.ValueKind == JsonValueKind.False)
                continue;

            var version = item.GetProperty("version").GetString();
            if (string.IsNullOrWhiteSpace(version)) continue;

            var hasWinX64 = item.GetProperty("files").EnumerateArray()
                .Any(f => string.Equals(f.GetString(), "win-x64-zip", StringComparison.OrdinalIgnoreCase));
            if (!hasWinX64) continue;

            return (version, $"https://nodejs.org/dist/{version}/node-{version}-win-x64.zip");
        }

        throw new InvalidOperationException("无法从 nodejs.org 获取 Node LTS win-x64 下载地址");
    }

    private async Task EnsurePnpmAsync()
    {
        var pnpmCmd = Path.Combine(PnpmPrefix, "pnpm.cmd");
        if (File.Exists(pnpmCmd))
        {
            AppendLog("pnpm 已存在：" + Capture(pnpmCmd, "-v", GetToolPath()));
            return;
        }

        AppendLog("正在安装便携 pnpm...");
        Directory.CreateDirectory(PnpmPrefix);
        var npmCmd = Path.Combine(NodeDir, "npm.cmd");
        var code = RunProcess(npmCmd, $"install -g pnpm --prefix \"{PnpmPrefix}\"", AppRoot, GetToolPath(), true);
        if (code != 0) throw new InvalidOperationException("pnpm 安装失败");
        AppendLog("pnpm 已安装：" + Capture(pnpmCmd, "-v", GetToolPath()));
        await Task.CompletedTask;
    }

    private async Task EnsureSubStoreAsync()
    {
        if (Directory.Exists(BackendPath) && File.Exists(Path.Combine(BackendPath, "package.json")))
        {
            AppendLog("Sub-Store 已存在：" + SubStoreRoot);
            return;
        }

        AppendLog("未检测到 Sub-Store，开始下载源码 zip...");
        var tempRoot = Path.Combine(Path.GetTempPath(), "SubStoreDesktop-Repo-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);
        var zipPath = Path.Combine(tempRoot, "sub-store.zip");

        var urls = new[]
        {
            "https://github.com/sub-store-org/Sub-Store/archive/refs/heads/master.zip",
            "https://github.com/sub-store-org/Sub-Store/archive/refs/heads/main.zip"
        };

        Exception? last = null;
        foreach (var url in urls)
        {
            try
            {
                AppendLog("尝试下载：" + url);
                using var http = new HttpClient();
                http.Timeout = TimeSpan.FromMinutes(10);
                await using var stream = await http.GetStreamAsync(url);
                await using var file = File.Create(zipPath);
                await stream.CopyToAsync(file);
                last = null;
                break;
            }
            catch (Exception ex)
            {
                last = ex;
            }
        }

        if (last != null) throw new InvalidOperationException("Sub-Store 源码下载失败：" + last.Message);

        ZipFile.ExtractToDirectory(zipPath, tempRoot);
        var extracted = Directory.GetDirectories(tempRoot)
            .FirstOrDefault(d => File.Exists(Path.Combine(d, "backend", "package.json")))
            ?? throw new InvalidOperationException("Sub-Store zip 解压后未找到 backend/package.json");

        if (Directory.Exists(SubStoreRoot)) Directory.Delete(SubStoreRoot, true);
        Directory.Move(extracted, SubStoreRoot);
        Directory.Delete(tempRoot, true);
        AppendLog("Sub-Store 已准备好：" + SubStoreRoot);
    }

    private async Task EnsureBackendDependenciesAsync()
    {
        var nodeModules = Path.Combine(BackendPath, "node_modules");
        var pnpmCmd = Path.Combine(PnpmPrefix, "pnpm.cmd");
        if (Directory.Exists(nodeModules))
        {
            AppendLog("backend 依赖已存在，跳过 pnpm install。需要重装时删除 node_modules 后再启动。 ");
            return;
        }

        AppendLog("首次运行，正在安装 backend 依赖。这个步骤可能需要几分钟...");
        var code = RunProcess(pnpmCmd, "install", BackendPath, GetToolPath(), true);
        if (code != 0) throw new InvalidOperationException("backend 依赖安装失败");
        AppendLog("backend 依赖安装完成。 ");
        await Task.CompletedTask;
    }

    private void StartBackend()
    {
        if (_backendProcess is { HasExited: false }) return;

        var pnpmCmd = Path.Combine(PnpmPrefix, "pnpm.cmd");
        var psi = new ProcessStartInfo
        {
            FileName = pnpmCmd,
            Arguments = "esbuild:dev",
            WorkingDirectory = BackendPath,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        psi.Environment["SUB_STORE_BACKEND_API_PORT"] = Port.ToString();
        psi.Environment["PATH"] = GetToolPath();

        _backendProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
        _backendProcess.OutputDataReceived += (_, e) => { if (e.Data != null) AppendLog(e.Data); };
        _backendProcess.ErrorDataReceived += (_, e) => { if (e.Data != null) AppendLog(e.Data); };
        _backendProcess.Exited += (_, _) => BeginInvoke(() =>
        {
            SetStatus("状态：后端已停止", Color.DarkOrange);
            _stopButton.Enabled = false;
            _prepareStartButton.Enabled = true;
        });

        _backendProcess.Start();
        _backendProcess.BeginOutputReadLine();
        _backendProcess.BeginErrorReadLine();

        SetStatus("状态：后端运行中", Color.Green);
        _stopButton.Enabled = true;
        AppendLog("Sub-Store 后端已启动，端口：" + Port);
    }

    private void StopBackend()
    {
        try
        {
            if (_backendProcess is { HasExited: false })
            {
                AppendLog("正在停止 Sub-Store 后端...");
                _backendProcess.Kill(entireProcessTree: true);
                _backendProcess.WaitForExit(3000);
            }
        }
        catch (Exception ex)
        {
            AppendLog("停止失败：" + ex.Message);
        }
        finally
        {
            _backendProcess = null;
            SetStatus("状态：未启动", Color.DarkOrange);
            _stopButton.Enabled = false;
        }
    }

    private void RefreshBackendAddress()
    {
        var tail = GetTailscaleIPv4();
        var lan = GetLanIPv4();
        var preferred = !string.IsNullOrWhiteSpace(tail)
            ? $"http://{tail}:{Port}"
            : !string.IsNullOrWhiteSpace(lan)
                ? $"http://{lan}:{Port}"
                : $"http://127.0.0.1:{Port}";

        _backendBox.Text = preferred;
        AppendLog("推荐后端地址：" + preferred);
        if (!string.IsNullOrWhiteSpace(tail)) AppendLog("Tailscale 地址适合酒店/办公室/手机跨网络使用。 ");
    }

    private static string? GetLanIPv4()
    {
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up) continue;
                var props = ni.GetIPProperties();
                if (!props.GatewayAddresses.Any(g => g.Address.AddressFamily == AddressFamily.InterNetwork)) continue;

                var ip = props.UnicastAddresses
                    .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork && !a.Address.ToString().StartsWith("169.254."))
                    ?.Address.ToString();
                if (!string.IsNullOrWhiteSpace(ip)) return ip;
            }
        }
        catch { }
        return null;
    }

    private string? GetTailscaleIPv4()
    {
        try
        {
            var path = GetToolPath();
            var output = Capture("tailscale", "ip -4", path);
            var ip = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
            return !string.IsNullOrWhiteSpace(ip) && ip.StartsWith("100.") ? ip : null;
        }
        catch
        {
            return null;
        }
    }

    private void InstallAutoStart()
    {
        try
        {
            var exe = Application.ExecutablePath;
            var taskName = "SubStoreDesktop";
            var tr = $"\\\"{exe}\\\" --start";
            var code = RunProcess("schtasks.exe", $"/Create /F /SC ONLOGON /TN \"{taskName}\" /TR \"{tr}\"", AppRoot, GetToolPath(), false);
            if (code == 0)
            {
                AppendLog("已安装开机自启任务：" + taskName);
                MessageBox.Show(this, "已安装开机自启。下次登录 Windows 后会自动启动。", "Sub-Store Desktop", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                throw new InvalidOperationException("schtasks 返回非 0 状态");
            }
        }
        catch (Exception ex)
        {
            AppendLog("安装开机自启失败：" + ex.Message);
            MessageBox.Show(this, "安装失败。可以右键以管理员身份运行后再试。\n" + ex.Message, "Sub-Store Desktop", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private void EnsureFirewallRule()
    {
        try
        {
            var check = RunProcess("netsh.exe", "advfirewall firewall show rule name=\"Sub-Store Backend 3000\"", AppRoot, GetToolPath(), false);
            if (check == 0)
            {
                AppendLog("防火墙规则已存在：TCP 3000");
                return;
            }

            var add = RunProcess("netsh.exe", "advfirewall firewall add rule name=\"Sub-Store Backend 3000\" dir=in action=allow protocol=TCP localport=3000", AppRoot, GetToolPath(), false);
            AppendLog(add == 0 ? "已添加防火墙规则：TCP 3000" : "未能自动添加防火墙规则。手机访问失败时，请右键以管理员身份运行。 ");
        }
        catch
        {
            AppendLog("未能自动添加防火墙规则。手机访问失败时，请右键以管理员身份运行。 ");
        }
    }

    private string GetToolPath()
    {
        var nodePath = NodeDir;
        var pnpmPath = PnpmPrefix;
        var existing = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        return nodePath + ";" + pnpmPath + ";" + existing;
    }

    private static string Capture(string fileName, string arguments, string? path = null)
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
        if (!string.IsNullOrWhiteSpace(path)) psi.Environment["PATH"] = path;
        using var p = Process.Start(psi) ?? throw new InvalidOperationException("无法执行：" + fileName);
        var stdout = p.StandardOutput.ReadToEnd();
        var stderr = p.StandardError.ReadToEnd();
        p.WaitForExit();
        if (p.ExitCode != 0) throw new InvalidOperationException(stderr);
        return stdout.Trim();
    }

    private static int RunProcess(string fileName, string arguments, string workingDirectory, string? path, bool streamOutput)
    {
        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = !streamOutput,
            RedirectStandardError = !streamOutput,
            CreateNoWindow = !streamOutput
        };
        if (!string.IsNullOrWhiteSpace(path)) psi.Environment["PATH"] = path;
        using var p = Process.Start(psi) ?? throw new InvalidOperationException("无法执行：" + fileName);
        p.WaitForExit();
        return p.ExitCode;
    }

    private void SetButtonsEnabled(bool enabled)
    {
        _prepareStartButton.Enabled = enabled;
        _openFrontendButton.Enabled = enabled;
        _copyBackendButton.Enabled = enabled;
        _refreshAddressButton.Enabled = enabled;
        _autoStartButton.Enabled = enabled;
        _stopButton.Enabled = enabled && _backendProcess is { HasExited: false };
    }

    private void SetStatus(string text, Color color)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => SetStatus(text, color));
            return;
        }
        _statusLabel.Text = text;
        _statusLabel.ForeColor = color;
    }

    private void AppendLog(string text)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => AppendLog(text));
            return;
        }
        _logBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {text}{Environment.NewLine}");
    }

    private static void OpenUrl(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
        }
        catch { }
    }
}
