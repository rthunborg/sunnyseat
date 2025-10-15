using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SunnySeat.Core.Models;
using SunnySeat.Core.Services;
using SunnySeat.DataImport.Commands;

namespace SunnySeat.DataImport.Tests.Commands;

public class ImportBuildingsCommandTests
{
    private readonly Mock<IBuildingImportService> _importServiceMock;
    private readonly Mock<ILogger<ImportBuildingsCommand>> _loggerMock;
    private readonly ImportBuildingsCommand _command;

    public ImportBuildingsCommandTests()
    {
        _importServiceMock = new Mock<IBuildingImportService>();
        _loggerMock = new Mock<ILogger<ImportBuildingsCommand>>();
        _command = new ImportBuildingsCommand(_importServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_WhenFileValidationFails_DoesNotProceedWithImport()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = false,
            Errors = new List<string> { "File not found" }
        };

        _importServiceMock.Setup(s => s.ValidateGpkgFileAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(validationResult);

        // Capture console output
        using var consoleOutput = new StringWriter();
        Console.SetOut(consoleOutput);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = consoleOutput.ToString();
        output.Should().Contain("File validation failed");
        output.Should().Contain("File not found");
        
        // Verify import was never called
        _importServiceMock.Verify(s => s.ImportFromGpkgAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), 
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_WhenDryRun_ValidatesButDoesNotImport()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = true,
            EstimatedBuildingCount = 1000,
            CoordinateSystem = "SWEREF99",
            Warnings = new List<string> { "Large dataset detected" }
        };

        _importServiceMock.Setup(s => s.ValidateGpkgFileAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(validationResult);

        // Capture console output
        using var consoleOutput = new StringWriter();
        Console.SetOut(consoleOutput);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: true);

        // Assert
        var output = consoleOutput.ToString();
        output.Should().Contain("File validation passed");
        output.Should().Contain("Estimated buildings: 1,000");
        output.Should().Contain("Coordinate system: SWEREF99");
        output.Should().Contain("Large dataset detected");
        output.Should().Contain("Dry run complete - no data imported");
        
        // Verify import was never called
        _importServiceMock.Verify(s => s.ImportFromGpkgAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), 
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_WhenImportSucceeds_DisplaysSuccessMessage()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult
        {
            IsValid = true,
            EstimatedBuildingCount = 500
        };

        var importResult = new ImportResult
        {
            Success = true,
            BuildingsImported = 485,
            BuildingsSkipped = 10,
            BuildingsWithErrors = 5,
            Duration = TimeSpan.FromMinutes(5.2),
            Warnings = new List<string> { "Some geometries simplified" }
        };

        _importServiceMock.Setup(s => s.ValidateGpkgFileAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(validationResult);
        _importServiceMock.Setup(s => s.ImportFromGpkgAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(importResult);

        // Simulate user confirming import
        using var consoleInput = new StringReader("y");
        Console.SetIn(consoleInput);
        
        using var consoleOutput = new StringWriter();
        Console.SetOut(consoleOutput);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = consoleOutput.ToString();
        output.Should().Contain("Import completed successfully");
        output.Should().Contain("Imported: 485 buildings");
        output.Should().Contain("Skipped: 10 buildings");
        output.Should().Contain("Errors: 5 buildings");
        output.Should().Contain("Duration: 5.2 minutes");
        output.Should().Contain("Some geometries simplified");
    }

    [Fact]
    public async Task ExecuteAsync_WhenImportFails_DisplaysErrorMessage()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult { IsValid = true };

        var importResult = new ImportResult
        {
            Success = false,
            Errors = new List<string> { "Database connection failed", "GDAL not available" },
            Duration = TimeSpan.FromSeconds(30)
        };

        _importServiceMock.Setup(s => s.ValidateGpkgFileAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(validationResult);
        _importServiceMock.Setup(s => s.ImportFromGpkgAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(importResult);

        // Simulate user confirming import
        using var consoleInput = new StringReader("y");
        Console.SetIn(consoleInput);
        
        using var consoleOutput = new StringWriter();
        Console.SetOut(consoleOutput);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = consoleOutput.ToString();
        output.Should().Contain("Import failed");
        output.Should().Contain("Database connection failed");
        output.Should().Contain("GDAL not available");
    }

    [Fact]
    public async Task ExecuteAsync_WhenUserCancels_DoesNotImport()
    {
        // Arrange
        var filePath = "test.gpkg";
        var validationResult = new ValidationResult { IsValid = true };

        _importServiceMock.Setup(s => s.ValidateGpkgFileAsync(filePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(validationResult);

        // Simulate user canceling import
        using var consoleInput = new StringReader("n");
        Console.SetIn(consoleInput);
        
        using var consoleOutput = new StringWriter();
        Console.SetOut(consoleOutput);

        // Act
        await _command.ExecuteAsync(filePath, dryRun: false);

        // Assert
        var output = consoleOutput.ToString();
        output.Should().Contain("Import cancelled");
        
        // Verify import was never called
        _importServiceMock.Verify(s => s.ImportFromGpkgAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), 
            Times.Never);
    }
}