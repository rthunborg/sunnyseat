using FluentAssertions;
using SunnySeat.Core.Models;
using Xunit;

namespace SunnySeat.Core.Tests.Models;

/// <summary>
/// Unit tests for ConfidenceLevel enum and extensions
/// </summary>
public class ConfidenceLevelTests
{
    [Theory]
    [InlineData(85.0, ConfidenceLevel.High)]
    [InlineData(70.0, ConfidenceLevel.High)]
    [InlineData(65.0, ConfidenceLevel.Medium)]
    [InlineData(40.0, ConfidenceLevel.Medium)]
    [InlineData(35.0, ConfidenceLevel.Low)]
    [InlineData(0.0, ConfidenceLevel.Low)]
    public void FromPercentage_DifferentValues_ReturnCorrectLevel(
        double percentage, ConfidenceLevel expectedLevel)
    {
        // Act
        var result = ConfidenceLevelExtensions.FromPercentage(percentage);

        // Assert
        result.Should().Be(expectedLevel);
    }

    [Theory]
    [InlineData(0.85, ConfidenceLevel.High)]
    [InlineData(0.70, ConfidenceLevel.High)]
    [InlineData(0.65, ConfidenceLevel.Medium)]
    [InlineData(0.40, ConfidenceLevel.Medium)]
    [InlineData(0.35, ConfidenceLevel.Low)]
    [InlineData(0.0, ConfidenceLevel.Low)]
    public void FromScore_DifferentValues_ReturnCorrectLevel(
        double score, ConfidenceLevel expectedLevel)
    {
        // Act
        var result = ConfidenceLevelExtensions.FromScore(score);

        // Assert
        result.Should().Be(expectedLevel);
    }

    [Fact]
    public void GetBadgeColor_HighConfidence_ReturnsGreen()
    {
        // Arrange
        var level = ConfidenceLevel.High;

        // Act
        var color = level.GetBadgeColor();

        // Assert
        color.Should().Be("#28a745"); // Green
    }

    [Fact]
    public void GetBadgeColor_MediumConfidence_ReturnsYellow()
    {
        // Arrange
        var level = ConfidenceLevel.Medium;

        // Act
        var color = level.GetBadgeColor();

        // Assert
        color.Should().Be("#ffc107"); // Yellow
    }

    [Fact]
    public void GetBadgeColor_LowConfidence_ReturnsRed()
    {
        // Arrange
        var level = ConfidenceLevel.Low;

        // Act
        var color = level.GetBadgeColor();

        // Assert
        color.Should().Be("#dc3545"); // Red
    }

    [Fact]
    public void GetExplanation_AllLevels_ReturnsMeaningfulText()
    {
        // Act & Assert
        ConfidenceLevel.High.GetExplanation().Should().Contain("High reliability");
        ConfidenceLevel.Medium.GetExplanation().Should().Contain("Moderate reliability");
        ConfidenceLevel.Low.GetExplanation().Should().Contain("Low reliability");
    }

    [Fact]
    public void GetShortDescription_AllLevels_ReturnsDescriptions()
    {
        // Act & Assert
        ConfidenceLevel.High.GetShortDescription().Should().Contain("≥70%");
        ConfidenceLevel.Medium.GetShortDescription().Should().Contain("40-69%");
        ConfidenceLevel.Low.GetShortDescription().Should().Contain("<40%");
    }

    [Theory]
    [InlineData(69.9)]  // Edge case just below High threshold
    [InlineData(70.0)]  // Edge case at High threshold
    [InlineData(39.9)]  // Edge case just below Medium threshold
    [InlineData(40.0)]  // Edge case at Medium threshold
    public void FromPercentage_BoundaryConditions_CategorizeCorrectly(double percentage)
    {
        // Act
        var result = ConfidenceLevelExtensions.FromPercentage(percentage);

        // Assert
        if (percentage >= 70.0)
            result.Should().Be(ConfidenceLevel.High);
        else if (percentage >= 40.0)
            result.Should().Be(ConfidenceLevel.Medium);
        else
            result.Should().Be(ConfidenceLevel.Low);
    }
}
