using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using SunnySeat.Core.Services;
using SunnySeat.Data;
using SunnySeat.DataImport.Commands;

namespace SunnySeat.DataImport;

class Program
{
    static async Task<int> Main(string[] args)
    {
        // Create root command
        var rootCommand = new RootCommand("SunnySeat Data Import Tool");

        // Add import buildings command
        var importCommand = new Command("import-buildings", "Import building data from GeoPackage file");
        var fileArgument = new Argument<string>("file", "Path to the .gpkg file to import");
        var connectionOption = new Option<string>(
            "--connection", 
            "Database connection string (optional, uses default if not provided)"
        );
        var dryRunOption = new Option<bool>(
            "--dry-run", 
            "Validate file and show import plan without actually importing"
        );

        importCommand.AddArgument(fileArgument);
        importCommand.AddOption(connectionOption);
        importCommand.AddOption(dryRunOption);

        importCommand.SetHandler(async (string file, string? connection, bool dryRun) =>
        {
            var host = CreateHost(connection);
            var command = host.Services.GetRequiredService<ImportBuildingsCommand>();
            await command.ExecuteAsync(file, dryRun);
        }, fileArgument, connectionOption, dryRunOption);

        rootCommand.AddCommand(importCommand);

        // Add GDAL check command
        var checkCommand = new Command("check-gdal", "Check GDAL installation and capabilities");
        checkCommand.SetHandler(async () =>
        {
            var host = CreateHost();
            var checkCommand = host.Services.GetRequiredService<CheckGdalCommand>();
            await checkCommand.ExecuteAsync();
        });

        rootCommand.AddCommand(checkCommand);

        return await rootCommand.InvokeAsync(args);
    }

    private static IHost CreateHost(string? connectionString = null)
    {
        return Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                // Use provided connection string or default
                var connStr = connectionString ?? 
                    "Host=localhost;Database=sunnyseat_dev;Username=postgres;Password=postgres";

                services.AddDbContext<SunnySeatDbContext>(options =>
                    options.UseNpgsql(connStr, opts => opts.UseNetTopologySuite()));

                services.AddScoped<IBuildingImportService, BuildingImportService>();
                services.AddScoped<BuildingDataProcessor>();
                services.AddScoped<ImportBuildingsCommand>();
                services.AddScoped<CheckGdalCommand>();

                services.AddLogging(builder =>
                {
                    builder.AddConsole();
                    builder.SetMinimumLevel(LogLevel.Information);
                });
            })
            .Build();
    }
}