using Microsoft.Extensions.Logging;
using SunnySeat.Core.Services;

namespace SunnySeat.DataImport.Commands;

/// <summary>
/// Command to check GDAL installation and capabilities
/// </summary>
public class CheckGdalCommand
{
    private readonly IBuildingImportService _importService;
    private readonly ILogger<CheckGdalCommand> _logger;

    public CheckGdalCommand(IBuildingImportService importService, ILogger<CheckGdalCommand> logger)
    {
        _importService = importService;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        try
        {
            Console.WriteLine("?? Checking GDAL installation...");
            Console.WriteLine();

            var status = await _importService.CheckGdalAvailabilityAsync();

            if (status.IsAvailable)
            {
                Console.WriteLine("? GDAL is available");
                if (!string.IsNullOrEmpty(status.Version))
                {
                    Console.WriteLine($"?? Version: {status.Version}");
                }
                Console.WriteLine($"???  PostGIS support: {(status.HasPostGISSupport ? "Yes" : "No")}");
                
                if (status.AvailableDrivers.Any())
                {
                    Console.WriteLine("?? Available drivers:");
                    foreach (var driver in status.AvailableDrivers)
                    {
                        Console.WriteLine($"   • {driver}");
                    }
                }
            }
            else
            {
                Console.WriteLine("? GDAL is not available");
                if (!string.IsNullOrEmpty(status.ErrorMessage))
                {
                    Console.WriteLine($"?? Error: {status.ErrorMessage}");
                }
                
                Console.WriteLine();
                Console.WriteLine("?? Installation guidance:");
                Console.WriteLine("   Windows: Install GDAL using OSGeo4W or conda");
                Console.WriteLine("   Linux: sudo apt-get install gdal-bin");
                Console.WriteLine("   macOS: brew install gdal");
                Console.WriteLine("   Ensure ogr2ogr is in your PATH");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking GDAL status");
            Console.WriteLine($"? GDAL check failed: {ex.Message}");
        }
    }
}