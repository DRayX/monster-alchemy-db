#!/usr/bin/env dotnet-script
#nullable enable
#r "nuget: SteamKit2, 3.4.0"
#r "nuget: KeySharp, 1.0.5"
#r "nuget: QRCoder, 1.6.0"
#r "nuget: Spectre.Console, 0.49.1"
#r "nuget: CommandLineParser, 2.9.1"

// ============================================================================
// Monster Alchemy Depot Downloader
// Downloads game depot files directly from Steam using SteamKit2.
// ============================================================================

using System;
using System.Buffers;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CommandLine;
using KeySharp;
using QRCoder;
using Spectre.Console;
using Spectre.Console.Rendering;
using SteamKit2;
using SteamKit2.Authentication;
using SteamKit2.CDN;

const string KEYRING_TARGET = "MonsterAlchemy";
const string KEYRING_SERVICE = "SteamSession";
const string KEYRING_ACCOUNT = "Active";

class Options
{
    [Option('u', "username", HelpText = "Steam account username (defaults to QR code login if omitted)")]
    public string? Username { get; set; }

    [Option('p', "password", HelpText = "Steam account password (or STEAM_PASSWORD env)")]
    public string? Password { get; set; }

    [Option("no-cache", HelpText = "Do not read or store credentials in system keystore")]
    public bool NoCache { get; set; }

    [Option("clear-cache", HelpText = "Remove stored Steam session from system keystore and exit")]
    public bool ClearCache { get; set; }

    [Option("app", Default = 4013510u, HelpText = "App ID")]
    public uint AppId { get; set; }

    [Option("depot", Default = 4013511u, HelpText = "Depot ID")]
    public uint DepotId { get; set; }

    [Option("manifest", HelpText = "Manifest ID (default: latest public)")]
    public ulong? ManifestId { get; set; }

    [Option("buildid", HelpText = "Build ID (required when specifying --manifest)")]
    public string? BuildId { get; set; }

    [Option("branch", Default = "public", HelpText = "Branch name")]
    public string Branch { get; set; } = null!;

    [Option('o', "dir", Default = "./depot", HelpText = "Output directory")]
    public string OutputDir { get; set; } = null!;

    [Option("meta", Default = "./docs/meta", HelpText = "Metadata output directory")]
    public string MetaDir { get; set; } = null!;

    [Option("paks", HelpText = "Only download files in the Paks directory")]
    public bool OnlyPaks { get; set; }

    [Option('m', "max-downloads", Default = 8, HelpText = "Concurrent chunk download streams")]
    public int MaxDownloads { get; set; }
}

class StoredSession
{
    public string? Username { get; set; }
    public string? RefreshToken { get; set; }
}

sealed class DelegatingProgressColumn : ProgressColumn
{
    private readonly ProgressColumn _inner;
    private readonly Func<ProgressTask, bool> _skip;

    public DelegatingProgressColumn(ProgressColumn inner, Func<ProgressTask, bool> skip)
    {
        _inner = inner;
        _skip = skip;
    }

    public override int? GetColumnWidth(RenderOptions options) => _inner.GetColumnWidth(options);

    public override IRenderable Render(RenderOptions options, ProgressTask task, TimeSpan deltaTime)
    {
        if (_skip(task)) return Text.Empty;
        return _inner.Render(options, task, deltaTime);
    }
}

class ConsoleAuthenticator : IAuthenticator
{
    public Task<string> GetDeviceCodeAsync(bool previousCodeWasIncorrect)
    {
        var code = AnsiConsole.Prompt(new TextPrompt<string>("[yellow]Enter mobile 2FA code:[/]").PromptStyle("cyan"));
        return Task.FromResult(code.Trim());
    }

    public Task<string> GetEmailCodeAsync(string email, bool previousCodeWasIncorrect)
    {
        var code = AnsiConsole.Prompt(new TextPrompt<string>($"[yellow]Enter Steam Guard code sent to {Markup.Escape(email)}:[/]").PromptStyle("cyan"));
        return Task.FromResult(code.Trim());
    }

    public Task<bool> AcceptDeviceConfirmationAsync()
    {
        AnsiConsole.MarkupLine("[yellow]Please approve logon on your Steam Mobile App...[/]");
        return Task.FromResult(true);
    }
}

StoredSession? TryGetStoredSession()
{
    try
    {
        var raw = Keyring.GetPassword(KEYRING_TARGET, KEYRING_SERVICE, KEYRING_ACCOUNT);
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return System.Text.Json.JsonSerializer.Deserialize<StoredSession>(raw);
    }
    catch
    {
        return null;
    }
}

void TryStoreSession(string username, string refreshToken)
{
    try
    {
        var payload = System.Text.Json.JsonSerializer.Serialize(new StoredSession
        {
            Username = username,
            RefreshToken = refreshToken
        });
        Keyring.SetPassword(KEYRING_TARGET, KEYRING_SERVICE, KEYRING_ACCOUNT, payload);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Keystore] Note: Could not save session to system keystore: {ex.Message}");
    }
}

bool TryDeleteStoredSession()
{
    try
    {
        Keyring.DeletePassword(KEYRING_TARGET, KEYRING_SERVICE, KEYRING_ACCOUNT);
        return true;
    }
    catch
    {
        return false;
    }
}

void RenderAsciiQr(string text)
{
    try
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(text, QRCodeGenerator.ECCLevel.L);
        using var asciiQr = new AsciiQRCode(qrCodeData);
        var graphic = asciiQr.GetGraphic(1);
        Console.WriteLine(graphic);
    }
    catch
    {
        // Fallback: challenge URL is printed in text
    }
}

async Task<int> RunDownloadAsync(Options opts)
{
    if (opts.ClearCache)
    {
        if (TryDeleteStoredSession())
        {
            AnsiConsole.MarkupLine("[green][[Keystore]][/] Successfully cleared stored Steam session from system keystore.");
        }
        else
        {
            Console.WriteLine("[Keystore] No stored Steam session found to clear.");
        }
        return 0;
    }

    if (opts.ManifestId.HasValue && string.IsNullOrWhiteSpace(opts.BuildId))
    {
        AnsiConsole.MarkupLine("[red][[Error]][/] When specifying --manifest, you must also provide the matching --buildid <id>.");
        return 1;
    }

    string outputDir = Path.GetFullPath(opts.OutputDir);
    string metaDir = Path.GetFullPath(opts.MetaDir);

    Console.WriteLine();
    Console.WriteLine("========================================");
    Console.WriteLine(" Monster Alchemy Depot Downloader");
    Console.WriteLine("========================================");
    Console.WriteLine($" App ID:     {opts.AppId}");
    Console.WriteLine($" Depot ID:   {opts.DepotId}");
    Console.WriteLine($" Branch:     {opts.Branch}");
    Console.WriteLine($" Output Dir: {outputDir}");
    Console.WriteLine($" Meta Dir:   {metaDir}");
    Console.WriteLine($" Filter:     {(opts.OnlyPaks ? "Paks directory only" : "All files")}");
    Console.WriteLine($" Threads:    {opts.MaxDownloads} concurrent chunk streams");
    Console.WriteLine($" Keystore:   {(opts.NoCache ? "Disabled (--no-cache)" : "Enabled (KeySharp)")}");
    Console.WriteLine("========================================");
    Console.WriteLine();

    Directory.CreateDirectory(outputDir);

    var steamClient = new SteamClient();
    var manager = new CallbackManager(steamClient);
    var steamUser = steamClient.GetHandler<SteamUser>()!;
    var steamApps = steamClient.GetHandler<SteamApps>()!;
    var steamContent = steamClient.GetHandler<SteamContent>()!;

    var isRunning = true;
    var loginTcs = new TaskCompletionSource<bool>();
    var connectedTcs = new TaskCompletionSource<bool>();
    string? username = opts.Username;
    string? accessToken = null;

    manager.Subscribe<SteamClient.ConnectedCallback>(_ => connectedTcs.TrySetResult(true));

    manager.Subscribe<SteamClient.DisconnectedCallback>(_ =>
    {
        if (isRunning)
        {
            Console.WriteLine("[Steam] Disconnected from Steam. Reconnecting in 3s...");
            Thread.Sleep(3000);
            steamClient.Connect();
        }
    });

    manager.Subscribe<SteamUser.LoggedOnCallback>(cb =>
    {
        if (cb.Result == EResult.OK)
        {
            Console.WriteLine($"[Steam] Successfully logged in as '{username}'!");
            loginTcs.TrySetResult(true);
            return;
        }

        AnsiConsole.MarkupLine($"[red]\n[[Steam]][/] Logon failed: {cb.Result} (Extended: {cb.ExtendedResult})");
        if (!string.IsNullOrEmpty(accessToken))
        {
            Console.WriteLine("[Keystore] Tip: Your stored session token has expired. It has been cleared; please re-authenticate.");
            TryDeleteStoredSession();
        }
        loginTcs.TrySetResult(false);
        isRunning = false;
    });

    var callbackCts = new CancellationTokenSource();
    var callbackTask = Task.Run(() =>
    {
        while (!callbackCts.IsCancellationRequested)
        {
            manager.RunWaitCallbacks(TimeSpan.FromMilliseconds(50));
        }
    });

    try
    {
        // 1. Resolve Session Credentials
        if (!opts.NoCache)
        {
            var stored = TryGetStoredSession();
            if (stored != null && !string.IsNullOrWhiteSpace(stored.RefreshToken))
            {
                username = stored.Username;
                accessToken = stored.RefreshToken;
                Console.WriteLine($"[Keystore] Using saved session for '{username}'.");
            }
        }

        Console.WriteLine("[Steam] Connecting to Steam network...");
        steamClient.Connect();
        await connectedTcs.Task;

        if (string.IsNullOrEmpty(accessToken))
        {
            AuthSession authSession;
            if (string.IsNullOrWhiteSpace(username))
            {
                Console.WriteLine("[Steam] Initiating QR code authentication...");
                var qrSession = await steamClient.Authentication.BeginAuthSessionViaQRAsync(new AuthSessionDetails
                {
                    DeviceFriendlyName = "MonsterAlchemyDB",
                    IsPersistentSession = true
                });

                Console.WriteLine();
                Console.WriteLine("------------------------------------------------------------");
                Console.WriteLine("Scan the QR code below using your Steam Mobile App:");
                Console.WriteLine($"Or open this challenge URL: {qrSession.ChallengeURL}");
                Console.WriteLine("------------------------------------------------------------");
                Console.WriteLine();

                RenderAsciiQr(qrSession.ChallengeURL);
                Console.WriteLine("[Steam] Waiting for confirmation on your mobile device...");
                authSession = qrSession;
            }
            else
            {
                string? password = opts.Password ?? Environment.GetEnvironmentVariable("STEAM_PASSWORD");
                if (string.IsNullOrWhiteSpace(password))
                {
                    password = AnsiConsole.Prompt(new TextPrompt<string>($"Enter Password for '{username}':").Secret());
                }

                Console.WriteLine($"[Steam] Authenticating as '{username}'...");
                authSession = await steamClient.Authentication.BeginAuthSessionViaCredentialsAsync(new AuthSessionDetails
                {
                    Username = username,
                    Password = password,
                    DeviceFriendlyName = "MonsterAlchemyDB",
                    IsPersistentSession = true,
                    Authenticator = new ConsoleAuthenticator()
                });
            }

            var pollResult = await authSession.PollingWaitForResultAsync();
            if (pollResult == null || string.IsNullOrEmpty(pollResult.RefreshToken))
            {
                AnsiConsole.MarkupLine("[red][[Steam]][/] Authentication timed out or was rejected.");
                return 1;
            }

            username = pollResult.AccountName;
            accessToken = pollResult.RefreshToken;

            if (!opts.NoCache)
            {
                Console.WriteLine($"[Keystore] Saving session for '{username}' to system keystore...");
                TryStoreSession(username, accessToken);
            }
            Console.WriteLine($"[Steam] Authenticated as '{username}'.");
        }

        // 2. Log On with AccessToken
        Console.WriteLine($"[Steam] Logging on as '{username}'...");
        steamUser.LogOn(new SteamUser.LogOnDetails
        {
            Username = username,
            AccessToken = accessToken,
            ShouldRememberPassword = true
        });

        var loggedIn = await loginTcs.Task;
        if (!loggedIn) return 1;

        // 3. Resolve Product Info, Manifest ID, and Build ID
        Console.WriteLine($"[Steam] Querying product information for App {opts.AppId} (branch '{opts.Branch}')...");
        var productInfoJob = steamApps.PICSGetProductInfo(
            new[] { new SteamApps.PICSRequest(opts.AppId) },
            Enumerable.Empty<SteamApps.PICSRequest>()
        );
        var productInfo = await productInfoJob;

        var appData = productInfo.Results?.FirstOrDefault()?.Apps?.GetValueOrDefault(opts.AppId);
        var depotsKey = appData?.KeyValues?["depots"];
        var depotSection = depotsKey?[opts.DepotId.ToString()];
        var manifestsSection = depotSection?["manifests"];
        var branchesSection = depotsKey?["branches"];

        ulong manifestId;
        string? buildIdStr;

        if (opts.ManifestId.HasValue)
        {
            manifestId = opts.ManifestId.Value;
            buildIdStr = opts.BuildId;
            Console.WriteLine($"[Steam] Using specified Manifest ID: {manifestId}");
            Console.WriteLine($"[Steam] Using specified Build ID:    {buildIdStr}");
        }
        else
        {
            var branchGidStr = manifestsSection?[opts.Branch]?["gid"]?.AsString();
            if (!string.IsNullOrEmpty(branchGidStr) && ulong.TryParse(branchGidStr, out var resolvedGid))
            {
                manifestId = resolvedGid;
                Console.WriteLine($"[Steam] Resolved head manifest ID for branch '{opts.Branch}': {manifestId}");
            }
            else
            {
                AnsiConsole.MarkupLine($"[red][[Steam]][/] Could not resolve manifest ID automatically for depot {opts.DepotId} branch '{opts.Branch}'.");
                Console.WriteLine("Please specify --manifest <id> and --buildid <id> explicitly.");
                return 1;
            }

            buildIdStr = branchesSection?[opts.Branch]?["buildid"]?.AsString()
                      ?? branchesSection?["public"]?["buildid"]?.AsString();

            Console.WriteLine($"[Steam] Resolved head Build ID for branch '{opts.Branch}': {buildIdStr}");
        }

        try
        {
            Directory.CreateDirectory(metaDir);
            var buildInfoFile = Path.Combine(metaDir, "build_info.json");
            var buildMeta = new Dictionary<string, object?>
            {
                ["buildId"] = buildIdStr,
                ["manifestId"] = manifestId.ToString(),
                ["branch"] = opts.Branch,
                ["appId"] = opts.AppId,
                ["depotId"] = opts.DepotId
            };
            var json = System.Text.Json.JsonSerializer.Serialize(buildMeta, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(buildInfoFile, json + "\n");
            Console.WriteLine($"[Metadata] Wrote build info to: {buildInfoFile}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Metadata Warning] Could not write build_info.json: {ex.Message}");
        }

        // 4. Get Depot Decryption Key
        Console.WriteLine($"[Steam] Requesting decryption key for depot {opts.DepotId}...");
        var keyJob = steamApps.GetDepotDecryptionKey(opts.DepotId, opts.AppId);
        var keyCallback = await keyJob;

        if (keyCallback.Result != EResult.OK || keyCallback.DepotKey == null || keyCallback.DepotKey.Length == 0)
        {
            AnsiConsole.MarkupLine($"[red][[Steam]][/] Failed to get depot key: {keyCallback.Result}");
            Console.WriteLine("Ensure your account owns a license for this application.");
            return 1;
        }

        byte[] depotKey = keyCallback.DepotKey;
        Console.WriteLine("[Steam] Depot decryption key acquired.");

        // 5. Get Manifest Request Code
        Console.WriteLine("[Steam] Requesting manifest access code...");
        ulong manifestRequestCode = await steamContent.GetManifestRequestCode(opts.DepotId, opts.AppId, manifestId, opts.Branch);

        // 6. Select CDN Server
        Console.WriteLine("[Steam] Discovering CDN servers...");
        var servers = await ContentServerDirectoryService.LoadAsync(steamClient.Configuration);
        var server = servers.FirstOrDefault();
        if (server == null)
        {
            AnsiConsole.MarkupLine("[red][[Steam]][/] No CDN servers available.");
            return 1;
        }
        Console.WriteLine($"[Steam] Using CDN server: {server.Host}");

        // 7. Download Manifest
        Console.WriteLine($"[Steam] Downloading depot manifest {manifestId}...");
        var cdnClient = new Client(steamClient);
        var manifest = await cdnClient.DownloadManifestAsync(
            opts.DepotId,
            manifestId,
            manifestRequestCode,
            server,
            depotKey
        );

        if (manifest == null || manifest.Files == null)
        {
            AnsiConsole.MarkupLine("[red][[Steam]][/] Failed to download or decrypt manifest.");
            return 1;
        }

        Console.WriteLine($"[Steam] Manifest loaded successfully. Total files: {manifest.Files.Count}");

        // 8. Filter and Sort Files
        var filesToDownload = manifest.Files.Where(f => !f.Flags.HasFlag(EDepotFileFlag.Directory)).ToList();
        if (opts.OnlyPaks)
        {
            filesToDownload = filesToDownload.Where(f =>
            {
                var norm = f.FileName.Replace('\\', '/');
                return norm.Contains("/Paks/", StringComparison.OrdinalIgnoreCase) ||
                       norm.StartsWith("Paks/", StringComparison.OrdinalIgnoreCase) ||
                       norm.EndsWith(".pak", StringComparison.OrdinalIgnoreCase) ||
                       norm.EndsWith(".ucas", StringComparison.OrdinalIgnoreCase) ||
                       norm.EndsWith(".utoc", StringComparison.OrdinalIgnoreCase);
            }).ToList();
            Console.WriteLine($"[Steam] Filter applied (--paks): {filesToDownload.Count} matching files.");
        }

        filesToDownload = filesToDownload
            .OrderBy(f => (Path.GetDirectoryName(f.FileName) ?? "").Replace('\\', '/'), StringComparer.OrdinalIgnoreCase)
            .ThenBy(f => f.FileName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        long totalBytes = filesToDownload.Sum(f => (long)f.TotalSize);
        Console.WriteLine($"[Steam] Total download size: {totalBytes / 1024.0 / 1024.0:F2} MB");

        // 9. Download Chunks with Pinned Bottom Bar and Folder Headers
        Console.WriteLine("[Steam] Starting download...");
        Console.WriteLine();

        var headerTaskIds = new HashSet<int>();
        bool IsHeader(ProgressTask task) => headerTaskIds.Contains(task.Id);
        ProgressColumn SkipIfHeader(ProgressColumn inner) => new DelegatingProgressColumn(inner, IsHeader);

        await AnsiConsole.Progress()
            .AutoClear(false)
            .HideCompleted(false)
            .Columns(
                new TaskDescriptionColumn { Alignment = Justify.Left },
                SkipIfHeader(new ProgressBarColumn()),
                SkipIfHeader(new PercentageColumn()),
                SkipIfHeader(new RemainingTimeColumn()),
                SkipIfHeader(new DownloadedColumn()),
                SkipIfHeader(new TransferSpeedColumn()),
                SkipIfHeader(new SpinnerColumn())
            )
            .StartAsync(async ctx =>
            {
                var overallTask = ctx.AddTask("[bold green]Overall Depot[/]", maxValue: Math.Max(1, totalBytes));

                string? currentDir = null;
                int fileIndex = 0;
                foreach (var file in filesToDownload)
                {
                    fileIndex++;

                    var normalizedFile = file.FileName.Replace('\\', '/');
                    var fileDir = (Path.GetDirectoryName(normalizedFile) ?? "").Replace('\\', '/');
                    if (currentDir == null || !string.Equals(currentDir, fileDir, StringComparison.OrdinalIgnoreCase))
                    {
                        currentDir = fileDir;
                        string dirLabel = string.IsNullOrEmpty(fileDir) ? "(root)" : fileDir;
                        var headerTask = ctx.AddTaskBefore(
                            $"[dim]──[/] [bold yellow]{Markup.Escape(dirLabel)}[/]",
                            overallTask,
                            autoStart: false
                        );
                        headerTaskIds.Add(headerTask.Id);
                        headerTask.StopTask();
                    }

                    string shortName = Path.GetFileName(file.FileName);
                    if (string.IsNullOrEmpty(shortName)) shortName = file.FileName;

                    var fileDescription = $"  [cyan][[{fileIndex}/{filesToDownload.Count}]][/] {Markup.Escape(shortName)}";
                    var fileTask = ctx.AddTaskBefore(
                        fileDescription,
                        overallTask,
                        autoStart: true,
                        maxValue: Math.Max(1, (double)file.TotalSize)
                    );

                    var filePath = Path.Combine(outputDir, file.FileName);
                    var dir = Path.GetDirectoryName(filePath);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

                    using var fs = File.Open(filePath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite);
                    if (file.TotalSize > 0)
                    {
                        fs.SetLength((long)file.TotalSize);
                    }

                    var parallelOptions = new ParallelOptions
                    {
                        MaxDegreeOfParallelism = opts.MaxDownloads
                    };

                    await Parallel.ForEachAsync(file.Chunks, parallelOptions, async (chunk, ct) =>
                    {
                        int bufferSize = (int)chunk.UncompressedLength;
                        byte[] destinationBuffer = ArrayPool<byte>.Shared.Rent(bufferSize);

                        try
                        {
                            int maxRetries = 3;
                            int attempt = 0;
                            int bytesWritten = 0;

                            while (true)
                            {
                                attempt++;
                                try
                                {
                                    bytesWritten = await cdnClient.DownloadDepotChunkAsync(
                                        opts.DepotId,
                                        chunk,
                                        server,
                                        destinationBuffer,
                                        depotKey
                                    );
                                    break;
                                }
                                catch when (attempt <= maxRetries)
                                {
                                    await Task.Delay(500 * attempt, ct);
                                }
                            }

                            await RandomAccess.WriteAsync(fs.SafeFileHandle, destinationBuffer.AsMemory(0, bytesWritten), (long)chunk.Offset, ct);
                            overallTask.Increment(bytesWritten);
                            fileTask.Increment(bytesWritten);
                        }
                        finally
                        {
                            ArrayPool<byte>.Shared.Return(destinationBuffer);
                        }
                    });

                    fileTask.Value = fileTask.MaxValue;
                    fileTask.StopTask();
                }

                overallTask.Value = overallTask.MaxValue;
                overallTask.StopTask();
            });

        Console.WriteLine();
        AnsiConsole.MarkupLine($"[green][[Success]][/] Depot download complete! Files saved to: {Markup.Escape(outputDir)}");
        AnsiConsole.MarkupLine($"[green][[Success]][/] Build info saved to: {Markup.Escape(Path.Combine(metaDir, "build_info.json"))}");
        return 0;
    }
    catch (Exception ex)
    {
        AnsiConsole.MarkupLine($"[red][[Error]][/] Download failed: {Markup.Escape(ex.Message)}");
        return 1;
    }
    finally
    {
        isRunning = false;
        callbackCts.Cancel();
        try { await callbackTask; } catch { }
        steamUser.LogOff();
        steamClient.Disconnect();
    }
}

// Entry Point
return await Parser.Default.ParseArguments<Options>(Args)
    .MapResult(RunDownloadAsync, errs => Task.FromResult(errs.Any(e => e is not HelpRequestedError and not VersionRequestedError) ? 1 : 0));
