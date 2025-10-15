using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models;
using SunnySeat.Core.Commands;
using Xunit;

namespace SunnySeat.Core.Tests.Commands;

/// <summary>
/// Tests for ImportBuildingsCommand console functionality
/// </summary>
public class ImportBuildingsCommandTests
{
    private readonly Mock<IBuildingImportService> _importServiceMock;
    private readonly Mock<ILogger<ImportBuildingsCommand>> _loggerMock;
    private readonly ImportBuildingsCommand _command;
    private readonly StringWriter _consoleOutput;
    private readonly TextWriter _originalConsoleOut;

    public ImportBuildingsCommandTests()
    {
        _importServiceMock = new Mock<IBuildingImportService>();
        _loggerMock = new Mock<ILogger<ImportBuildingsCommand>>();
        _command = new ImportBuildingsCommand(_importServiceMock.Object, _loggerMock.Object);

        // Capture console output for testing
        _originalConsoleOut = Console.Out;
        _consoleOutput = new StringWriter();
        Console.SetOut(_consoleOutput);
    }

    private void Dispose()
    {
        Console.SetOut(_originalConsoleOut);
        _consoleOutput?.Dispose();
    }

    [Fact]
    public async Task ExecuteAsync_WhenFileValidationFails_DisplaysErrorsAndExits()
    {
        // Arrange
        var filePath = "invalid.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = false,
            Errors = new List<string> { "File not found", "Invalid format" }
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("File validation failed");
        output.Should().Contain("File not found");
        output.Should().Contain("Invalid format");

        // Verify import was not called
        _importServiceMock.Verify(x => x.ImportFromGpkgAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_DryRunMode_ValidatesOnlyAndExits()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = true,
            EstimatedBuildingCount = 1000,
            CoordinateSystem = "WGS84"
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: true);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("Dry Run (validation only)");
        output.Should().Contain("File validation passed");
        // Accept Swedish formatting with non-breaking space or comma: "1,000" or "1 000" (where space might be U+00A0)
        output.Should().MatchRegex(@"Estimated buildings: 1[\s,]000");
        output.Should().Contain("Dry run complete - no data imported");

        // Verify import was not called in dry run
        _importServiceMock.Verify(x => x.ImportFromGpkgAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_WhenGdalUnavailable_DisplaysErrorAndExits()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult { IsValid = true };
        var gdalStatus = new GdalStatus
        {
            IsAvailable = false,
            ErrorMessage = "GDAL not found in PATH"
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);
        _importServiceMock.Setup(x => x.CheckGdalAvailabilityAsync())
            .ReturnsAsync(gdalStatus);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("GDAL not available: GDAL not found in PATH");
        output.Should().Contain("Please ensure GDAL tools are installed");

        // Verify import was not called when GDAL unavailable
        _importServiceMock.Verify(x => x.ImportFromGpkgAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_SuccessfulImport_DisplaysResults()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = true,
            EstimatedBuildingCount = 5000
        };
        var gdalStatus = new GdalStatus
        {
            IsAvailable = true,
            Version = "3.4.1"
        };
        var importResult = new ImportResult
        {
            Success = true,
            BuildingsImported = 4850,
            BuildingsSkipped = 100,
            BuildingsWithErrors = 50,
            Duration = TimeSpan.FromMinutes(15.5),
            Warnings = new List<string> { "Some geometries were simplified" }
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);
        _importServiceMock.Setup(x => x.CheckGdalAvailabilityAsync())
            .ReturnsAsync(gdalStatus);

        // Mock console input for confirmation
        var consoleInput = new StringReader("y\n");
        Console.SetIn(consoleInput);

        _importServiceMock.Setup(x => x.ImportFromGpkgAsync(filePath, default))
            .ReturnsAsync(importResult);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("Import completed successfully!");
        // Accept Swedish formatting with non-breaking space or comma: "4,850" or "4 850"
        output.Should().MatchRegex(@"Imported: 4[\s,]850 buildings");
        output.Should().MatchRegex(@"Skipped: 100 buildings");
        output.Should().MatchRegex(@"Errors: 50 buildings");
        output.Should().MatchRegex(@"Duration: 15[.,]5 minutes");
        output.Should().Contain("Some geometries were simplified");
    }

    [Fact]
    public async Task ExecuteAsync_LargeDatasetSlowImport_ShowsPerformanceWarning()
    {
        // Arrange - Simulate large dataset that takes longer than 30 minutes
        var filePath = "large.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = true,
            EstimatedBuildingCount = 50000 // Large Gothenburg-size dataset
        };
        var gdalStatus = new GdalStatus { IsAvailable = true, Version = "3.4.1" };
        var importResult = new ImportResult
        {
            Success = true,
            BuildingsImported = 48000,
            BuildingsSkipped = 1500,
            BuildingsWithErrors = 500,
            Duration = TimeSpan.FromMinutes(35), // Exceeds 30-minute target
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);
        _importServiceMock.Setup(x => x.CheckGdalAvailabilityAsync())
            .ReturnsAsync(gdalStatus);

        var consoleInput = new StringReader("y\n");
        Console.SetIn(consoleInput);

        _importServiceMock.Setup(x => x.ImportFromGpkgAsync(filePath, default))
            .ReturnsAsync(importResult);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("Performance Notice:");
        // Accept either format: "35.0" or "35,0"
        output.Should().MatchRegex(@"Import took 35[.,]0 minutes for large dataset");
        output.Should().Contain("Consider optimization if this exceeds 30-minute target");
    }

    [Fact]
    public async Task ExecuteAsync_ImportFailure_DisplaysErrors()
    {
        // Arrange
        var filePath = "problematic.gpkg";
        var validationResult = new ValidationResult { IsValid = true };
        var gdalStatus = new GdalStatus { IsAvailable = true, Version = "3.4.1" };
        var importResult = new ImportResult
        {
            Success = false,
            Errors = new List<string>
            {
                "Database connection failed",
                "Invalid geometry in feature 1234"
            }
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);
        _importServiceMock.Setup(x => x.CheckGdalAvailabilityAsync())
            .ReturnsAsync(gdalStatus);

        var consoleInput = new StringReader("y\n");
        Console.SetIn(consoleInput);

        _importServiceMock.Setup(x => x.ImportFromGpkgAsync(filePath, default))
            .ReturnsAsync(importResult);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("Import failed:");
        output.Should().Contain("Database connection failed");
        output.Should().Contain("Invalid geometry in feature 1234");
    }

    [Fact]
    public async Task ExecuteAsync_WithValidationWarnings_DisplaysWarnings()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = true,
            Warnings = new List<string>
            {
                "File does not have .gpkg extension",
                "Some features may be simplified"
            }
        };

        _importServiceMock.Setup(x => x.ValidateGpkgFileAsync(filePath, default))
            .ReturnsAsync(validationResult);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: true);

        // Assert
        var output = _consoleOutput.ToString();
        output.Should().Contain("Warnings:");
        output.Should().Contain("File does not have .gpkg extension");
        output.Should().Contain("Some features may be simplified");
    }
}