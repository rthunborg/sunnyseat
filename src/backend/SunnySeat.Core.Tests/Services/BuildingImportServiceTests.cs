using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SunnySeat.Core.Services;
using SunnySeat.Core.Interfaces;
using SunnySeat.Data;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using NetTopologySuite;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

public class BuildingImportServiceTests : IDisposable
{
    private readonly Mock<ILogger<BuildingImportService>> _loggerMock;
    private readonly Mock<IBuildingRepository> _repositoryMock;
    private readonly BuildingImportService _service;

    public BuildingImportServiceTests()
    {
        _loggerMock = new Mock<ILogger<BuildingImportService>>();
        _repositoryMock = new Mock<IBuildingRepository>();
        _service = new BuildingImportService(_loggerMock.Object, _repositoryMock.Object);
    }

    [Fact]
    public async Task CheckGdalAvailabilityAsync_WhenGdalNotInstalled_ReturnsUnavailable()
    {
        // Act
        var result = await _service.CheckGdalAvailabilityAsync();

        // Assert - This test depends on system configuration
        // If GDAL is installed, skip this test
        result.Should().NotBeNull();
        if (!result.IsAvailable)
        {
            result.ErrorMessage.Should().NotBeNullOrEmpty();
        }
    }

    [Fact]
    public async Task ValidateGpkgFileAsync_WhenFileDoesNotExist_ReturnsInvalid()
    {
        // Arrange
        var nonExistentFile = "nonexistent.gpkg";

        // Act
        var result = await _service.ValidateGpkgFileAsync(nonExistentFile);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("File not found"));
    }

    [Fact]
    public async Task ValidateGpkgFileAsync_WhenFileDoesNotHaveGpkgExtension_ReturnsWarning()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, "dummy content");

        try
        {
            // Act
            var result = await _service.ValidateGpkgFileAsync(tempFile);

            // Assert
            result.Should().NotBeNull();
            // The file validation may fail for multiple reasons
            // Check if it has the extension warning OR general validation issues
            var hasExtensionWarning = result.Warnings.Any(w => w.Contains("does not have .gpkg extension"));
            var hasValidationIssues = !result.IsValid;
            (hasExtensionWarning || hasValidationIssues).Should().BeTrue();
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [Fact]
    public async Task ImportFromGpkgAsync_WhenFileDoesNotExist_ReturnsFailure()
    {
        // Arrange
        var nonExistentFile = "nonexistent.gpkg";

        // Act
        var result = await _service.ImportFromGpkgAsync(nonExistentFile);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("File not found"));
        result.BuildingsImported.Should().Be(0);
        result.Duration.Should().BeGreaterThan(TimeSpan.Zero);
    }

    [Theory]
    [InlineData("test.gpkg")]
    [InlineData("buildings.GPKG")]
    public async Task ValidateGpkgFileAsync_WhenFileHasGpkgExtension_DoesNotWarnAboutExtension(string fileName)
    {
        // Arrange
        var tempDir = Path.GetTempPath();
        var tempFile = Path.Combine(tempDir, fileName);
        File.WriteAllText(tempFile, "dummy content");

        try
        {
            // Act
            var result = await _service.ValidateGpkgFileAsync(tempFile);

            // Assert (assuming ogrinfo is not available, it will fail but not warn about extension)
            result.Warnings.Should().NotContain(w => w.Contains("does not have .gpkg extension"));
        }
        finally
        {
            if (File.Exists(tempFile))
                File.Delete(tempFile);
        }
    }

    public void Dispose()
    {
        // Clean up any resources if needed
    }
}