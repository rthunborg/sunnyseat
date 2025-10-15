using SunnySeat.Core.Models;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service interface for importing building data from external sources
/// </summary>
public interface IBuildingImportService
{
    /// <summary>
    /// Imports building data from a GeoPackage (.gpkg) file
    /// </summary>
    /// <param name="filePath">Path to the .gpkg file</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Import result with statistics and any errors</returns>
    Task<ImportResult> ImportFromGpkgAsync(string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a GeoPackage file structure and content
    /// </summary>
    /// <param name="filePath">Path to the .gpkg file</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Validation result with any issues found</returns>
    Task<ValidationResult> ValidateGpkgFileAsync(string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if GDAL tools are available and properly configured
    /// </summary>
    /// <returns>GDAL availability status and version info</returns>
    Task<GdalStatus> CheckGdalAvailabilityAsync();
}