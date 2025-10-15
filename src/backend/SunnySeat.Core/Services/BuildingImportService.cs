using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for importing building data from GeoPackage files using GDAL
/// </summary>
public class BuildingImportService : IBuildingImportService
{
    private readonly ILogger<BuildingImportService> _logger;
    private readonly IBuildingRepository _buildingRepository;

    public BuildingImportService(
        ILogger<BuildingImportService> logger,
        IBuildingRepository buildingRepository)
    {
        _logger = logger;
        _buildingRepository = buildingRepository;
    }

    public async Task<ImportResult> ImportFromGpkgAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = new ImportResult { SourceFile = filePath };
        var errors = new List<string>();
        var warnings = new List<string>();

        try
        {
            _logger.LogInformation("Starting building import from {FilePath}", filePath);

            // Validate file exists
            if (!File.Exists(filePath))
            {
                errors.Add($"File not found: {filePath}");
                return result with { Success = false, Errors = errors, Duration = stopwatch.Elapsed };
            }

            // Check GDAL availability
            var gdalStatus = await CheckGdalAvailabilityAsync();
            if (!gdalStatus.IsAvailable)
            {
                errors.Add($"GDAL not available: {gdalStatus.ErrorMessage}");
                return result with { Success = false, Errors = errors, Duration = stopwatch.Elapsed };
            }

            // Validate file structure
            var validation = await ValidateGpkgFileAsync(filePath, cancellationToken);
            if (!validation.IsValid)
            {
                errors.AddRange(validation.Errors);
                return result with { Success = false, Errors = errors, Duration = stopwatch.Elapsed };
            }

            warnings.AddRange(validation.Warnings);

            // Convert GPKG to GeoJSON for processing
            var tempGeoJsonFile = Path.GetTempFileName() + ".geojson";
            try
            {
                var conversionSuccess = await ConvertGpkgToGeoJsonAsync(filePath, tempGeoJsonFile, cancellationToken);
                if (!conversionSuccess)
                {
                    errors.Add("Failed to convert GPKG file to GeoJSON format");
                    return result with { Success = false, Errors = errors, Duration = stopwatch.Elapsed };
                }

                // Import buildings from converted data
                var importStats = await ImportBuildingsFromGeoJsonAsync(tempGeoJsonFile, cancellationToken);

                return result with
                {
                    Success = true,
                    BuildingsImported = importStats.Imported,
                    BuildingsSkipped = importStats.Skipped,
                    BuildingsWithErrors = importStats.Errors,
                    Errors = errors,
                    Warnings = warnings,
                    Duration = stopwatch.Elapsed
                };
            }
            finally
            {
                // Clean up temporary file
                if (File.Exists(tempGeoJsonFile))
                {
                    File.Delete(tempGeoJsonFile);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during building import from {FilePath}", filePath);
            errors.Add($"Import failed: {ex.Message}");
            return result with { Success = false, Errors = errors, Duration = stopwatch.Elapsed };
        }
    }

    public async Task<ValidationResult> ValidateGpkgFileAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        var warnings = new List<string>();
        var layers = new List<string>();

        try
        {
            // Check file exists and is readable
            if (!File.Exists(filePath))
            {
                errors.Add($"File not found: {filePath}");
                return new ValidationResult { IsValid = false, Errors = errors };
            }

            if (!filePath.EndsWith(".gpkg", StringComparison.OrdinalIgnoreCase))
            {
                warnings.Add("File does not have .gpkg extension");
            }

            // Use ogrinfo to get file information
            var processInfo = new ProcessStartInfo
            {
                FileName = "ogrinfo",
                Arguments = $"-so \"{filePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process == null)
            {
                errors.Add("Failed to start ogrinfo process");
                return new ValidationResult { IsValid = false, Errors = errors, Warnings = warnings };
            }

            var output = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            var errorOutput = await process.StandardError.ReadToEndAsync(cancellationToken);

            await process.WaitForExitAsync(cancellationToken);

            if (process.ExitCode != 0)
            {
                errors.Add($"ogrinfo failed: {errorOutput}");
                return new ValidationResult { IsValid = false, Errors = errors, Warnings = warnings };
            }

            // Parse output for layers and coordinate system info
            var layerMatches = Regex.Matches(output, @"^\d+:\s+(.+)\s+\(.*\)$", RegexOptions.Multiline);
            foreach (Match match in layerMatches)
            {
                layers.Add(match.Groups[1].Value);
            }

            var coordinateSystem = ExtractCoordinateSystem(output);
            var estimatedCount = EstimateFeatureCount(output);

            if (layers.Count == 0)
            {
                warnings.Add("No vector layers found in file");
            }

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors,
                Warnings = warnings,
                AvailableLayers = layers,
                CoordinateSystem = coordinateSystem,
                EstimatedBuildingCount = estimatedCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating GPKG file {FilePath}", filePath);
            errors.Add($"Validation failed: {ex.Message}");
            return new ValidationResult { IsValid = false, Errors = errors };
        }
    }

    public async Task<GdalStatus> CheckGdalAvailabilityAsync()
    {
        try
        {
            // Check ogr2ogr availability and version
            var processInfo = new ProcessStartInfo
            {
                FileName = "ogr2ogr",
                Arguments = "--version",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process == null)
            {
                return new GdalStatus
                {
                    IsAvailable = false,
                    ErrorMessage = "ogr2ogr executable not found in PATH"
                };
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var errorOutput = await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                return new GdalStatus
                {
                    IsAvailable = false,
                    ErrorMessage = $"ogr2ogr version check failed: {errorOutput}"
                };
            }

            var version = ExtractVersionFromOutput(output);
            var hasPostGIS = output.Contains("PostgreSQL") || output.Contains("PostGIS");

            return new GdalStatus
            {
                IsAvailable = true,
                Version = version,
                HasPostGISSupport = hasPostGIS,
                AvailableDrivers = ExtractDriversFromOutput(output)
            };
        }
        catch (Exception ex)
        {
            return new GdalStatus
            {
                IsAvailable = false,
                ErrorMessage = $"Error checking GDAL: {ex.Message}"
            };
        }
    }

    private async Task<bool> ConvertGpkgToGeoJsonAsync(string gpkgPath, string tempGeoJsonPath, CancellationToken cancellationToken)
    {
        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "ogr2ogr",
                Arguments = $"-f \"GeoJSON\" \"{tempGeoJsonPath}\" \"{gpkgPath}\" -t_srs EPSG:4326",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process == null) return false;

            var errorOutput = await process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            if (process.ExitCode != 0)
            {
                _logger.LogError("ogr2ogr conversion failed: {Error}", errorOutput);
                return false;
            }

            return File.Exists(tempGeoJsonPath) && new FileInfo(tempGeoJsonPath).Length > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting GPKG to GeoJSON");
            return false;
        }
    }

    private async Task<(int Imported, int Skipped, int Errors)> ImportBuildingsFromGeoJsonAsync(string geoJsonFilePath, CancellationToken cancellationToken)
    {
        var imported = 0;
        var skipped = 0;
        var errors = 0;

        try
        {
            _logger.LogInformation("Processing building data from GeoJSON file");

            var geoJsonText = await File.ReadAllTextAsync(geoJsonFilePath, cancellationToken);
            using var jsonDocument = JsonDocument.Parse(geoJsonText);

            var features = jsonDocument.RootElement.GetProperty("features");
            var wktReader = new WKTReader();

            // Batch processing for performance optimization
            const int batchSize = 1000; // Optimal batch size for performance
            var currentBatch = new List<Building>();
            var totalFeatures = features.GetArrayLength();
            var processedFeatures = 0;

            _logger.LogInformation("Processing {TotalFeatures} features in batches of {BatchSize}",
                totalFeatures, batchSize);

            foreach (var feature in features.EnumerateArray())
            {
                try
                {
                    // Extract geometry as WKT string 
                    var geometryElement = feature.GetProperty("geometry");

                    // Convert GeoJSON geometry to WKT for NetTopologySuite
                    var wkt = ConvertGeoJsonGeometryToWkt(geometryElement);
                    if (string.IsNullOrEmpty(wkt))
                    {
                        skipped++;
                        continue;
                    }

                    var geometry = wktReader.Read(wkt);

                    // Validate geometry is a polygon
                    if (geometry is not Polygon polygon)
                    {
                        skipped++;
                        continue;
                    }

                    // Validate polygon topology
                    if (!polygon.IsValid)
                    {
                        _logger.LogWarning("Invalid polygon geometry found, skipping");
                        errors++;
                        continue;
                    }

                    // Extract properties
                    var properties = feature.GetProperty("properties");

                    // Height estimation with heuristics
                    var height = EstimateHeight(properties);
                    var source = ExtractSource(properties);
                    var externalId = ExtractExternalId(properties);
                    var qualityScore = CalculateQualityScore(polygon, properties);

                    var building = new Building
                    {
                        Geometry = polygon,
                        Height = height,
                        Source = source,
                        QualityScore = qualityScore,
                        ExternalId = externalId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    currentBatch.Add(building);

                    // Process batch when full or at end
                    if (currentBatch.Count >= batchSize || processedFeatures == totalFeatures - 1)
                    {
                        var batchStats = await ProcessBatch(currentBatch, cancellationToken);
                        imported += batchStats.Imported;
                        skipped += batchStats.Skipped;
                        errors += batchStats.Errors;

                        // Progress reporting for large datasets
                        processedFeatures += currentBatch.Count;
                        var progressPercentage = (double)processedFeatures / totalFeatures * 100;
                        _logger.LogInformation("Progress: {ProcessedFeatures}/{TotalFeatures} ({Progress:F1}%) - Batch imported: {BatchImported}",
                            processedFeatures, totalFeatures, progressPercentage, batchStats.Imported);

                        currentBatch.Clear();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing building feature");
                    errors++;
                }

                processedFeatures++;
            }

            _logger.LogInformation("Import completed: {Imported} imported, {Skipped} skipped, {Errors} errors",
                imported, skipped, errors);

            return (imported, skipped, errors);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing buildings from GeoJSON");
            return (0, 0, 1);
        }
    }

    /// <summary>
    /// Process a batch of buildings for optimal performance
    /// </summary>
    private async Task<(int Imported, int Skipped, int Errors)> ProcessBatch(List<Building> buildings, CancellationToken cancellationToken)
    {
        if (buildings.Count == 0)
        {
            return (0, 0, 0);
        }

        try
        {
            // Use repository batch processing for optimal database performance
            var repositoryStats = await _buildingRepository.BulkImportAsync(buildings, cancellationToken);

            _logger.LogDebug("Batch processed: {Count} buildings -> {Imported} imported, {Skipped} skipped, {Errors} errors",
                buildings.Count, repositoryStats.Imported, repositoryStats.Skipped, repositoryStats.Errors);

            return repositoryStats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing batch of {Count} buildings", buildings.Count);
            return (0, 0, buildings.Count);
        }
    }

    /// <summary>
    /// Converts GeoJSON geometry to WKT format for NetTopologySuite
    /// </summary>
    private string? ConvertGeoJsonGeometryToWkt(JsonElement geometryElement)
    {
        try
        {
            var type = geometryElement.GetProperty("type").GetString();
            if (type != "Polygon")
            {
                return null;
            }

            var coordinates = geometryElement.GetProperty("coordinates");
            var rings = coordinates.EnumerateArray().ToList();
            if (rings.Count == 0)
            {
                return null;
            }

            // Build WKT polygon
            var exteriorRing = rings[0];
            var exteriorCoords = exteriorRing.EnumerateArray()
                .Select(coord =>
                {
                    var coords = coord.EnumerateArray().ToArray();
                    return $"{coords[0].GetDouble()} {coords[1].GetDouble()}";
                })
                .ToArray();

            var wkt = $"POLYGON(({string.Join(", ", exteriorCoords)}))";

            // TODO: Handle interior rings (holes) if needed
            return wkt;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error converting GeoJSON geometry to WKT");
            return null;
        }
    }

    private async Task<bool> ConvertGpkgToSqlAsync(string gpkgPath, string tempSqlPath, CancellationToken cancellationToken)
    {
        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "ogr2ogr",
                Arguments = $"-f \"PGDump\" \"{tempSqlPath}\" \"{gpkgPath}\" -t_srs EPSG:4326 -nln buildings",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process == null) return false;

            var errorOutput = await process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            if (process.ExitCode != 0)
            {
                _logger.LogError("ogr2ogr conversion failed: {Error}", errorOutput);
                return false;
            }

            return File.Exists(tempSqlPath) && new FileInfo(tempSqlPath).Length > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting GPKG to SQL");
            return false;
        }
    }

    private async Task<(int Imported, int Skipped, int Errors)> ImportBuildingsFromSqlAsync(string sqlFilePath, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing building data from converted SQL file");

        // TODO: Implement actual SQL parsing and building entity creation
        // This would involve:
        // 1. Reading the SQL file
        // 2. Parsing geometry data  
        // 3. Applying height estimation heuristics
        // 4. Creating Building entities
        // 5. Using the repository for database operations (when methods are added to IBuildingRepository)

        // For now, return mock statistics
        await Task.Delay(100, cancellationToken);

        return (Imported: 0, Skipped: 0, Errors: 0);
    }

    private string? ExtractCoordinateSystem(string ogrOutput)
    {
        var match = Regex.Match(ogrOutput, @"PROJCS\[""([^""]+)""", RegexOptions.IgnoreCase);
        if (match.Success)
            return match.Groups[1].Value;

        match = Regex.Match(ogrOutput, @"GEOGCS\[""([^""]+)""", RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    private int? EstimateFeatureCount(string ogrOutput)
    {
        var match = Regex.Match(ogrOutput, @"Feature Count:\s+(\d+)", RegexOptions.IgnoreCase);
        return match.Success && int.TryParse(match.Groups[1].Value, out var count) ? count : null;
    }

    private string? ExtractVersionFromOutput(string output)
    {
        var match = Regex.Match(output, @"GDAL\s+([\d\.]+)", RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    private List<string> ExtractDriversFromOutput(string output)
    {
        // Simple implementation - in reality you'd query available drivers
        return new List<string> { "GPKG", "PostgreSQL", "PostGIS" };
    }

    /// <summary>
    /// Estimates building height using available data and heuristics
    /// </summary>
    private double EstimateHeight(JsonElement properties)
    {
        // Try to extract floor count and convert to height
        if (properties.TryGetProperty("floors", out var floorsElement) &&
            floorsElement.TryGetInt32(out var floors) && floors > 0)
        {
            return floors * 3.5; // 3.5m per floor heuristic
        }

        // Try direct height property
        if (properties.TryGetProperty("height", out var heightElement))
        {
            if (heightElement.ValueKind == JsonValueKind.Number &&
                heightElement.TryGetDouble(out var height) && height > 0)
            {
                return height;
            }
        }

        // Default minimum height (2 floors)
        return 6.0;
    }

    private string ExtractSource(JsonElement properties)
    {
        if (properties.TryGetProperty("source", out var sourceElement) &&
            sourceElement.ValueKind == JsonValueKind.String)
        {
            return sourceElement.GetString() ?? "unknown";
        }
        return "lantmateriet"; // Default for Swedish building data
    }

    private string? ExtractExternalId(JsonElement properties)
    {
        if (properties.TryGetProperty("id", out var idElement) &&
            idElement.ValueKind == JsonValueKind.String)
        {
            return idElement.GetString();
        }

        if (properties.TryGetProperty("objectid", out var objIdElement) &&
            objIdElement.ValueKind == JsonValueKind.String)
        {
            return objIdElement.GetString();
        }

        return null;
    }

    /// <summary>
    /// Calculates data quality score based on geometry and metadata completeness
    /// </summary>
    private double CalculateQualityScore(Polygon polygon, JsonElement properties)
    {
        double score = 1.0;

        // Reduce score for very small or very large polygons (likely errors)
        var area = polygon.Area;
        if (area < 10 || area > 10000) // Square meters in WGS84 degrees
        {
            score -= 0.2;
        }

        // Reduce score for very simple geometries (likely simplified)
        if (polygon.ExteriorRing.NumPoints < 5)
        {
            score -= 0.1;
        }

        // Boost score for rich metadata
        var hasHeight = properties.TryGetProperty("height", out _) ||
                       properties.TryGetProperty("floors", out _);
        if (hasHeight)
        {
            score += 0.1;
        }

        // Ensure score is bounded
        return Math.Max(0.0, Math.Min(1.0, score));
    }
}