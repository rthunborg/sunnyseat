using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Commands;
using SunnySeat.Core.Services;

namespace SunnySeat.Api.Commands;

/// <summary>
/// Console command runner for development and admin tasks
/// </summary>
public static class ConsoleCommands
{
    /// <summary>
    /// Execute import-buildings command
    /// Usage: dotnet run import-buildings "path/to/file.gpkg" [--dry-run]
    /// </summary>
    public static async Task RunImportBuildingsAsync(string[] args, IServiceProvider services)
    {
        if (args.Length < 2 || args[0] != "import-buildings")
        {
            Console.WriteLine("Usage: dotnet run import-buildings \"path/to/file.gpkg\" [--dry-run]");
            return;
        }

        var filePath = args[1];
        var dryRun = args.Length > 2 && args[2] == "--dry-run";

        var logger = services.GetRequiredService<ILogger<ImportBuildingsCommand>>();
        var importService = services.GetRequiredService<IBuildingImportService>();
        
        var command = new ImportBuildingsCommand(importService, logger);
        await command.ExecuteAsync(filePath, dryRun);
    }

    /// <summary>
    /// Execute seed-venues command
    /// Usage: dotnet run seed-venues
    /// </summary>
    public static async Task RunSeedVenuesAsync(string[] args, IServiceProvider services)
    {
        if (args.Length == 0 || args[0] != "seed-venues")
        {
            Console.WriteLine("Usage: dotnet run seed-venues");
            return;
        }

        var logger = services.GetRequiredService<ILogger<VenueSeedingService>>();
        var seedingService = services.GetRequiredService<VenueSeedingService>();
        
        try
        {
            logger.LogInformation("Starting venue seeding process...");
            var count = await seedingService.SeedVenuesAsync();
            logger.LogInformation("Venue seeding completed successfully. {Count} venues imported.", count);
            Console.WriteLine($"? Successfully seeded {count} venues!");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Venue seeding failed");
            Console.WriteLine($"? Venue seeding failed: {ex.Message}");
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Execute create-sample-patios command
    /// Usage: dotnet run create-sample-patios
    /// </summary>
    public static async Task RunCreateSamplePatiosAsync(string[] args, IServiceProvider services)
    {
        if (args.Length == 0 || args[0] != "create-sample-patios")
        {
            Console.WriteLine("Usage: dotnet run create-sample-patios");
            return;
        }

        var logger = services.GetRequiredService<ILogger<VenueBuildingIntegrationService>>();
        var integrationService = services.GetRequiredService<VenueBuildingIntegrationService>();
        
        try
        {
            logger.LogInformation("Starting sample patio creation using building geodata...");
            var count = await integrationService.CreateSamplePatiosForVenuesAsync();
            logger.LogInformation("Sample patio creation completed. {Count} patios created.", count);
            Console.WriteLine($"? Successfully created {count} sample patios using building data!");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Sample patio creation failed");
            Console.WriteLine($"? Sample patio creation failed: {ex.Message}");
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Execute validate-venue-locations command
    /// Usage: dotnet run validate-venue-locations
    /// </summary>
    public static async Task RunValidateVenueLocationsAsync(string[] args, IServiceProvider services)
    {
        if (args.Length == 0 || args[0] != "validate-venue-locations")
        {
            Console.WriteLine("Usage: dotnet run validate-venue-locations");
            return;
        }

        var logger = services.GetRequiredService<ILogger<VenueBuildingIntegrationService>>();
        var integrationService = services.GetRequiredService<VenueBuildingIntegrationService>();
        
        try
        {
            logger.LogInformation("Starting venue location validation against building data...");
            var count = await integrationService.ValidateVenueLocationsAsync();
            logger.LogInformation("Venue location validation completed. {Count} venues validated.", count);
            Console.WriteLine($"? Successfully validated {count} venue locations against building data!");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Venue location validation failed");
            Console.WriteLine($"? Venue location validation failed: {ex.Message}");
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Show help for available commands
    /// </summary>
    public static void ShowHelp()
    {
        Console.WriteLine("Available commands:");
        Console.WriteLine("  import-buildings \"path/to/file.gpkg\" [--dry-run]  - Import building data from GeoPackage file");
        Console.WriteLine("  seed-venues                                         - Seed database with Gothenburg venue data");
        Console.WriteLine("  create-sample-patios                               - Create sample patios using building geodata");
        Console.WriteLine("  validate-venue-locations                           - Validate venue locations against building data");
        Console.WriteLine("  help                                                - Show this help message");
        Console.WriteLine();
        Console.WriteLine("Example workflow:");
        Console.WriteLine("  1. dotnet run import-buildings \"D:\\SunnySeat\\building_geodata\\byggnad_kn1480.gpkg\"");
        Console.WriteLine("  2. dotnet run seed-venues");
        Console.WriteLine("  3. dotnet run create-sample-patios");
        Console.WriteLine("  4. dotnet run validate-venue-locations");
    }

    /// <summary>
    /// Main command dispatcher
    /// </summary>
    public static async Task ExecuteCommandAsync(string[] args, IServiceProvider services)
    {
        if (args.Length == 0)
        {
            ShowHelp();
            return;
        }

        var command = args[0].ToLowerInvariant();
        
        switch (command)
        {
            case "import-buildings":
                await RunImportBuildingsAsync(args, services);
                break;
            case "seed-venues":
                await RunSeedVenuesAsync(args, services);
                break;
            case "create-sample-patios":
                await RunCreateSamplePatiosAsync(args, services);
                break;
            case "validate-venue-locations":
                await RunValidateVenueLocationsAsync(args, services);
                break;
            case "help":
            case "--help":
            case "-h":
                ShowHelp();
                break;
            default:
                Console.WriteLine($"Unknown command: {command}");
                ShowHelp();
                Environment.Exit(1);
                break;
        }
    }
}