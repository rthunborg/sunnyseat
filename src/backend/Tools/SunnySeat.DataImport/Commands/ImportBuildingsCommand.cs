using Microsoft.Extensions.Logging;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Commands;

/// <summary>
/// Command to import building data from GeoPackage files
/// </summary>
public class ImportBuildingsCommand
{
    private readonly IBuildingImportService _importService;
    private readonly ILogger<ImportBuildingsCommand> _logger;

    public ImportBuildingsCommand(IBuildingImportService importService, ILogger<ImportBuildingsCommand> logger)
    {
        _importService = importService;
        _logger = logger;
    }

    public async Task ExecuteAsync(string filePath, bool dryRun = false)
    {
        try
        {
            Console.WriteLine($"??  SunnySeat Building Import Tool");
            Console.WriteLine($"?? File: {filePath}");
            Console.WriteLine($"?? Mode: {(dryRun ? "Dry Run (validation only)" : "Full Import")}");
            Console.WriteLine();

            // Validate file first
            Console.WriteLine("?? Validating file...");
            var validation = await _importService.ValidateGpkgFileAsync(filePath);

            if (!validation.IsValid)
            {
                Console.WriteLine("? File validation failed:");
                foreach (var error in validation.Errors)
                {
                    Console.WriteLine($"   • {error}");
                }
                return;
            }

            // Show validation results
            Console.WriteLine("? File validation passed");
            if (validation.EstimatedBuildingCount.HasValue)
            {
                Console.WriteLine($"?? Estimated buildings: {validation.EstimatedBuildingCount:N0}");
            }
            if (!string.IsNullOrEmpty(validation.CoordinateSystem))
            {
                Console.WriteLine($"???  Coordinate system: {validation.CoordinateSystem}");
            }

            if (validation.Warnings.Any())
            {
                Console.WriteLine("??  Warnings:");
                foreach (var warning in validation.Warnings)
                {
                    Console.WriteLine($"   • {warning}");
                }
            }

            Console.WriteLine();

            if (dryRun)
            {
                Console.WriteLine("? Dry run complete - no data imported");
                return;
            }

            // Check GDAL availability before proceeding
            Console.WriteLine("?? Checking GDAL availability...");
            var gdalStatus = await _importService.CheckGdalAvailabilityAsync();
            if (!gdalStatus.IsAvailable)
            {
                Console.WriteLine($"? GDAL not available: {gdalStatus.ErrorMessage}");
                Console.WriteLine("Please ensure GDAL tools are installed and available in PATH");
                return;
            }
            Console.WriteLine($"? GDAL {gdalStatus.Version} available");
            Console.WriteLine();

            // Confirm before proceeding
            Console.Write("Continue with import? (y/N): ");
            var response = Console.ReadLine();
            if (!string.Equals(response, "y", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(response, "yes", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine("Import cancelled");
                return;
            }

            // Perform import
            Console.WriteLine();
            Console.WriteLine("?? Starting import...");
            
            var startTime = DateTime.UtcNow;
            
            // Progress reporting for long operations
            using var cts = new CancellationTokenSource();
            var progressTask = Task.Run(async () =>
            {
                while (!cts.Token.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromSeconds(15), cts.Token);
                    if (!cts.Token.IsCancellationRequested)
                    {
                        var elapsed = DateTime.UtcNow - startTime;
                        Console.WriteLine($"? Import running... {elapsed.TotalMinutes:F1} minutes elapsed");
                    }
                }
            }, cts.Token);

            var result = await _importService.ImportFromGpkgAsync(filePath);
            cts.Cancel();
            
            try { await progressTask; } catch (OperationCanceledException) { }

            // Display results
            Console.WriteLine();
            if (result.Success)
            {
                Console.WriteLine("?? Import completed successfully!");
                Console.WriteLine($"?? Imported: {result.BuildingsImported:N0} buildings");
                if (result.BuildingsSkipped > 0)
                {
                    Console.WriteLine($"??  Skipped: {result.BuildingsSkipped:N0} buildings");
                }
                if (result.BuildingsWithErrors > 0)
                {
                    Console.WriteLine($"? Errors: {result.BuildingsWithErrors:N0} buildings");
                }
                Console.WriteLine($"??  Duration: {result.Duration.TotalMinutes:F1} minutes");
                
                // Performance validation
                if (validation.EstimatedBuildingCount > 10000 && result.Duration > TimeSpan.FromMinutes(30))
                {
                    Console.WriteLine();
                    Console.WriteLine("??  Performance Notice:");
                    Console.WriteLine($"   Import took {result.Duration.TotalMinutes:F1} minutes for large dataset");
                    Console.WriteLine("   Consider optimization if this exceeds 30-minute target");
                }
            }
            else
            {
                Console.WriteLine("? Import failed:");
                foreach (var error in result.Errors)
                {
                    Console.WriteLine($"   • {error}");
                }
            }

            if (result.Warnings.Any())
            {
                Console.WriteLine("??  Warnings:");
                foreach (var warning in result.Warnings)
                {
                    Console.WriteLine($"   • {warning}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing import command");
            Console.WriteLine($"? Import failed: {ex.Message}");
        }
    }
}