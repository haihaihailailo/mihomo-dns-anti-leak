using System.Text;

namespace SubStoreDesktop;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm(autoStart: args.Any(a => a.Equals("--start", StringComparison.OrdinalIgnoreCase))));
    }
}
