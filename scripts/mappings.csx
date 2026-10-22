#!/usr/bin/env dotnet-script
#nullable enable
#r "nuget: CommandLineParser, 2.9.1"

// ============================================================================
// Monster Alchemy Mappings Generator (.usmap)
// Launches the game executable in headless mode and uses jmap_dumper to
// generate an Unreal asset type mappings file (.usmap).
// ============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CommandLine;

class Options
{
    [Option("exe", Default = "./depot/MonsterAlchemy/Binaries/Win64/MonsterAlchemy-Win64-Shipping.exe", HelpText = "Path to game executable")]
    public string ExePath { get; set; } = null!;

    [Option('o', "out", Default = "./MonsterAlchemy.usmap", HelpText = "Output .usmap file path")]
    public string OutputPath { get; set; } = null!;

    [Option("app", Default = 4013510u, HelpText = "SteamAppId environment variable")]
    public uint AppId { get; set; }

    [Option("jmap", Default = "jmap_dumper", HelpText = "Path/name of jmap binary")]
    public string JmapTool { get; set; } = null!;

    [Option("timeout", Default = 60, HelpText = "Timeout waiting for ready/dump (seconds)")]
    public int TimeoutSeconds { get; set; }
}

static async Task<(int ExitCode, string Stderr)> RunToolAsync(string tool, string args)
{
    using var proc = Process.Start(new ProcessStartInfo
    {
        FileName = tool,
        Arguments = args,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true
    });
    if (proc == null) return (-1, "Failed to start process");
    var stderr = await proc.StandardError.ReadToEndAsync();
    await proc.WaitForExitAsync();
    return (proc.ExitCode, stderr.Trim());
}

static (int Structs, int Enums, int Classes, int Total) InspectJmap(string path)
{
    if (!File.Exists(path)) return (0, 0, 0, 0);
    try
    {
        using var stream = File.OpenRead(path);
        using var doc = JsonDocument.Parse(stream);
        if (!doc.RootElement.TryGetProperty("objects", out var objs)) return (0, 0, 0, 0);

        int structs = 0, enums = 0, classes = 0, total = 0;
        foreach (var obj in objs.EnumerateObject())
        {
            total++;
            if (obj.Value.TryGetProperty("type", out var type))
            {
                var s = type.GetString();
                if (s == "ScriptStruct") structs++;
                else if (s == "Enum") enums++;
                else if (s == "Class") classes++;
            }
        }
        return (structs, enums, classes, total);
    }
    catch { return (0, 0, 0, 0); }
}

async Task<int> RunMappingsAsync(Options opts)
{
    string exePath = Path.GetFullPath(opts.ExePath);
    string outputPath = Path.GetFullPath(opts.OutputPath);
    uint appId = opts.AppId;
    int timeoutSeconds = opts.TimeoutSeconds;
    string jmapTool = opts.JmapTool;

    Console.WriteLine("========================================");
    Console.WriteLine(" Unreal Mapping File (.usmap) Dumper");
    Console.WriteLine("========================================");
    Console.WriteLine($" Executable:  {exePath}");
    Console.WriteLine($" Output Path: {outputPath}");
    Console.WriteLine($" SteamAppId:  {appId}");
    Console.WriteLine($" Dumper Tool: {jmapTool}");
    Console.WriteLine("========================================");
    Console.WriteLine();

    if (!File.Exists(exePath))
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"Error: Executable not found at '{exePath}'");
        Console.WriteLine("Please download the depot first or specify --exe <path>.");
        Console.ResetColor();
        return 1;
    }

    var outDir = Path.GetDirectoryName(outputPath);
    if (!string.IsNullOrEmpty(outDir)) Directory.CreateDirectory(outDir);
    if (File.Exists(outputPath)) File.Delete(outputPath);

    const string launchArgs = "-nullrhi -nosound";
    Console.WriteLine($"[Game] Launching '{Path.GetFileName(exePath)}' with args: {launchArgs}...");

    var psi = new ProcessStartInfo
    {
        FileName = exePath,
        Arguments = launchArgs,
        WorkingDirectory = Path.GetDirectoryName(exePath)!,
        UseShellExecute = false,
        CreateNoWindow = true
    };
    psi.EnvironmentVariables["SteamAppId"] = appId.ToString();

    Process? gameProc = null;
    string? tempJmapPath = null;
    try
    {
        gameProc = Process.Start(psi);
        if (gameProc == null)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Error: Failed to start game process.");
            Console.ResetColor();
            return 1;
        }

        Console.WriteLine($"[Game] Process started (PID: {gameProc.Id}).");

        var stopwatch = Stopwatch.StartNew();
        int initialWaitSeconds = 5;
        if (initialWaitSeconds > 0)
        {
            Console.WriteLine($"[Mappings] Waiting {initialWaitSeconds}s for game reflection structures to initialize in memory...");
            await Task.Delay(TimeSpan.FromSeconds(initialWaitSeconds));
        }

        int attempt = 0;
        tempJmapPath = Path.Combine(Path.GetTempPath(), $"MonsterAlchemy_{gameProc.Id}.jmap");

        while (stopwatch.Elapsed.TotalSeconds < timeoutSeconds)
        {
            if (gameProc.HasExited)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Error] Game process exited unexpectedly with code {gameProc.ExitCode}.");
                Console.ResetColor();
                return 1;
            }

            attempt++;
            Console.WriteLine($"[Mappings] Attempt #{attempt} via {jmapTool} (elapsed: {stopwatch.Elapsed.TotalSeconds:F0}s)...");

            var (dumpCode, dumpErr) = await RunToolAsync(jmapTool, $"--pid {gameProc.Id} --skip-vtables --format jmap \"{tempJmapPath}\"");
            var (structs, enums, classes, total) = InspectJmap(tempJmapPath);

            if (structs > 0)
            {
                Console.WriteLine($"[Mappings] Verified reflection table: {structs:N0} ScriptStructs, {enums:N0} Enums, {classes:N0} Classes ({total:N0} total). Converting to .usmap...");
                var (convCode, _) = await RunToolAsync(jmapTool, $"--jmap \"{tempJmapPath}\" \"{outputPath}\"");

                if (convCode == 0 && File.Exists(outputPath))
                {
                    var sizeKb = new FileInfo(outputPath).Length / 1024.0;
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"[Success] Mappings generated successfully: {outputPath} ({sizeKb:F1} KB, {total:N0} objects)");
                    Console.ResetColor();
                    return 0;
                }
            }
            else
            {
                Console.WriteLine($"[Mappings] Reflection not yet ready in memory ({total:N0} objects, {structs:N0} ScriptStructs). Retrying in 2s...");
                if (!string.IsNullOrWhiteSpace(dumpErr))
                {
                    Console.WriteLine($"[jmap stderr] {dumpErr}");
                }
            }

            await Task.Delay(2000);
        }

        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[Error] Timed out after {timeoutSeconds}s waiting for {jmapTool} to dump mappings.");
        Console.ResetColor();
        return 1;
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[Error] Mappings generation failed: {ex.Message}");
        Console.ResetColor();
        return 1;
    }
    finally
    {
        if (gameProc != null && !gameProc.HasExited)
        {
            Console.WriteLine("[Game] Terminating game process tree...");
            try
            {
                gameProc.Kill(entireProcessTree: true);
                gameProc.WaitForExit(3000);
            }
            catch { }
        }

        if (!string.IsNullOrEmpty(tempJmapPath) && File.Exists(tempJmapPath))
        {
            try { File.Delete(tempJmapPath); } catch { }
        }
    }
}

return await Parser.Default.ParseArguments<Options>(Args)
    .MapResult(RunMappingsAsync, errs => Task.FromResult(errs.Any(e => e is not HelpRequestedError and not VersionRequestedError) ? 1 : 0));
