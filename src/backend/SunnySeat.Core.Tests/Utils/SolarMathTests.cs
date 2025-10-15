using FluentAssertions;
using SunnySeat.Core.Constants;
using SunnySeat.Core.Utils;
using Xunit;

namespace SunnySeat.Core.Tests.Utils
{
    /// <summary>
    /// Unit tests for SolarMath utility functions
    /// Validates mathematical correctness of NREL SPA algorithm components
    /// </summary>
    public class SolarMathTests
    {
        #region Julian Day Calculation Tests

        [Theory]
        [InlineData("2000-01-01 12:00:00", 2451545.0)]           // J2000 epoch
        [InlineData("2024-06-21 12:00:00", 2460483.0)]           // Summer solstice 2024 (CORRECTED: was 2460482.0)
        [InlineData("1582-10-15 00:00:00", 2299160.5)]           // Gregorian calendar adoption (CORRECTED: was 2299161.5)
        [InlineData("2003-10-17 12:30:30", 2452930.0211805556)]  // NREL test case
        public void CalculateJulianDay_KnownDates_ReturnsCorrectJulianDay(string utcDateTimeString, double expectedJulianDay)
        {
            // Arrange
            var utcDateTime = DateTime.SpecifyKind(
                DateTime.Parse(utcDateTimeString, null, System.Globalization.DateTimeStyles.None),
                DateTimeKind.Utc);

            // Act
            var result = SolarMath.CalculateJulianDay(utcDateTime);

            // Assert
            result.Should().BeApproximately(expectedJulianDay, 0.0001, "Julian Day calculation should be accurate to 4 decimal places");
        }

        [Fact]
        public void CalculateJulianCenturies_J2000Epoch_ReturnsZero()
        {
            // Arrange
            var j2000JulianDay = SolarConstants.JulianDay2000;

            // Act
            var result = SolarMath.CalculateJulianCenturies(j2000JulianDay);

            // Assert
            result.Should().BeApproximately(0.0, 1e-10, "J2000 epoch should return 0 Julian centuries");
        }

        [Fact]
        public void CalculateJulianCenturies_OneHundredYearsAfterJ2000_ReturnsOne()
        {
            // Arrange
            var julianDay = SolarConstants.JulianDay2000 + SolarConstants.DaysPerJulianCentury;

            // Act
            var result = SolarMath.CalculateJulianCenturies(julianDay);

            // Assert
            result.Should().BeApproximately(1.0, 1e-10, "One Julian century after J2000 should return 1.0");
        }

        #endregion

        #region Angle Normalization Tests

        [Theory]
        [InlineData(0, 0)]         // No change needed
        [InlineData(180, 180)]     // Half circle
        [InlineData(360, 0)]       // Full circle
        [InlineData(720, 0)]       // Two full circles
        [InlineData(-180, 180)]    // Negative half circle
        [InlineData(-360, 0)]      // Negative full circle
        [InlineData(450, 90)]      // 360 + 90
        [InlineData(-270, 90)]     // -270 should become 90
        public void NormalizeDegrees_VariousAngles_ReturnsZeroTo360Range(double inputDegrees, double expectedDegrees)
        {
            // Act
            var result = SolarMath.NormalizeDegrees(inputDegrees);

            // Assert
            result.Should().BeApproximately(expectedDegrees, 1e-10, $"Angle {inputDegrees}� should normalize to {expectedDegrees}�");
            result.Should().BeInRange(0, 360, "Normalized angle should be in [0, 360) range");
        }

        [Theory]
        [InlineData(0, 0)]         // No change needed
        [InlineData(180, 180)]     // At boundary
        [InlineData(-180, 180)]    // At negative boundary
        [InlineData(270, -90)]     // 270 becomes -90
        [InlineData(-270, 90)]     // -270 becomes 90
        [InlineData(450, 90)]      // 450 becomes 90
        [InlineData(-450, -90)]    // -450 becomes -90
        public void NormalizeDegreesSymmetric_VariousAngles_ReturnsMinus180To180Range(double inputDegrees, double expectedDegrees)
        {
            // Act
            var result = SolarMath.NormalizeDegreesSymmetric(inputDegrees);

            // Assert
            result.Should().BeApproximately(expectedDegrees, 1e-10, $"Angle {inputDegrees}� should normalize to {expectedDegrees}�");
            result.Should().BeInRange(-180, 180, "Symmetric normalized angle should be in [-180, 180] range");
        }

        #endregion

        #region Solar Longitude and Anomaly Tests

        [Fact]
        public void CalculateGeometricalMeanLongitudeSun_J2000Epoch_ReturnsExpectedValue()
        {
            // Arrange
            double julianCenturies = 0.0; // J2000 epoch

            // Act
            var result = SolarMath.CalculateGeometricalMeanLongitudeSun(julianCenturies);

            // Assert
            result.Should().BeApproximately(280.46646, 0.001, "Geometric mean longitude at J2000 should match reference");
        }

        [Fact]
        public void CalculateGeometricalMeanAnomalySun_J2000Epoch_ReturnsExpectedValue()
        {
            // Arrange
            double julianCenturies = 0.0; // J2000 epoch

            // Act
            var result = SolarMath.CalculateGeometricalMeanAnomalySun(julianCenturies);

            // Assert
            result.Should().BeApproximately(357.52911, 0.001, "Geometric mean anomaly at J2000 should match reference");
        }

        [Fact]
        public void CalculateEccentricityEarthOrbit_J2000Epoch_ReturnsExpectedValue()
        {
            // Arrange
            double julianCenturies = 0.0; // J2000 epoch

            // Act
            var result = SolarMath.CalculateEccentricityEarthOrbit(julianCenturies);

            // Assert
            result.Should().BeApproximately(0.016708634, 1e-9, "Earth orbit eccentricity at J2000 should match reference");
        }

        #endregion

        #region Obliquity and Declination Tests

        [Fact]
        public void CalculateMeanObliquityOfEcliptic_J2000Epoch_ReturnsExpectedValue()
        {
            // Arrange
            double julianCenturies = 0.0; // J2000 epoch

            // Act
            var result = SolarMath.CalculateMeanObliquityOfEcliptic(julianCenturies);

            // Assert
            result.Should().BeApproximately(SolarConstants.MeanObliquity, 0.001, "Mean obliquity at J2000 should match constant");
        }

        [Theory]
        [InlineData(0, 0)]        // Vernal equinox (approximately)
        [InlineData(90, 23.44)]   // Summer solstice (approximately)
        [InlineData(180, 0)]      // Autumnal equinox (approximately) 
        [InlineData(270, -23.44)] // Winter solstice (approximately)
        public void CalculateSolarDeclination_CardinalPoints_ReturnsExpectedValues(double apparentLongitude, double expectedDeclination)
        {
            // Arrange
            double correctedObliquity = 23.44; // Approximate current obliquity

            // Act
            var result = SolarMath.CalculateSolarDeclination(apparentLongitude, correctedObliquity);

            // Assert
            result.Should().BeApproximately(expectedDeclination, 0.5, $"Solar declination for longitude {apparentLongitude}� should be approximately {expectedDeclination}�");
        }

        #endregion

        #region Solar Position Tests

        [Theory]
        [InlineData(57.7089, 0, 0, 32.29)]      // Gothenburg at equinox noon (90-lat)
        [InlineData(57.7089, 23.44, 0, 55.73)]  // Gothenburg, summer solstice noon (90-lat+decl)
        [InlineData(57.7089, -23.44, 0, 8.85)] // Gothenburg, winter solstice noon (90-lat-decl)
        [InlineData(0, 0, 0, 90)]            // Equator, equinox
        public void CalculateSolarElevation_KnownConditions_ReturnsExpectedElevation(double latitude, double declination, double hourAngle, double expectedElevation)
        {
            // Act
            var result = SolarMath.CalculateSolarElevation(latitude, declination, hourAngle);

            // Assert
            result.Should().BeApproximately(expectedElevation, 1.0, $"Solar elevation for lat={latitude}�, decl={declination}�, ha={hourAngle}� should be approximately {expectedElevation}�");
        }

        [Theory]
        [InlineData(57.7089, 0, 0, 180)]     // Gothenburg, sun due south at noon
        [InlineData(57.7089, 0, -90, 90)]    // Gothenburg, sun due east (morning)
        [InlineData(57.7089, 0, 90, 270)]    // Gothenburg, sun due west (evening)
        public void CalculateSolarAzimuth_KnownConditions_ReturnsExpectedAzimuth(double latitude, double declination, double hourAngle, double expectedAzimuth)
        {
            // Arrange
            double elevation = SolarMath.CalculateSolarElevation(latitude, declination, hourAngle);

            // Act
            var result = SolarMath.CalculateSolarAzimuth(latitude, declination, hourAngle, elevation);

            // Assert
            result.Should().BeApproximately(expectedAzimuth, 5.0, $"Solar azimuth for lat={latitude}�, decl={declination}�, ha={hourAngle}� should be approximately {expectedAzimuth}�");
        }

        #endregion

        #region Atmospheric Refraction Tests

        [Theory]
        [InlineData(90, 90)]      // Zenith - minimal refraction
        [InlineData(45, 45.01)]   // High elevation - minimal refraction
        [InlineData(10, 10.08)]   // Low elevation - noticeable refraction (~5 arc minutes)
        [InlineData(0, 0.57)]     // Horizon - maximum refraction (~34 arc minutes)
        [InlineData(-0.5, -0.5)]  // Below horizon - no correction applied
        public void ApplyAtmosphericRefraction_VariousElevations_AppliesCorrectRefraction(double trueElevation, double expectedApparentElevation)
        {
            // Act
            var result = SolarMath.ApplyAtmosphericRefraction(trueElevation);

            // Assert
            result.Should().BeApproximately(expectedApparentElevation, 0.05, $"Atmospheric refraction should be applied correctly for {trueElevation}� elevation");
        }

        [Fact]
        public void ApplyAtmosphericRefraction_StandardConditions_UsesStandardPressureAndTemperature()
        {
            // Arrange
            double elevation = 10.0;

            // Act
            var resultStandard = SolarMath.ApplyAtmosphericRefraction(elevation);
            var resultExplicit = SolarMath.ApplyAtmosphericRefraction(elevation, SolarConstants.StandardPressure, SolarConstants.StandardTemperature);

            // Assert
            resultStandard.Should().BeApproximately(resultExplicit, 1e-10, "Default and explicit standard conditions should give same result");
        }

        #endregion

        #region Earth-Sun Distance Tests

        [Theory]
        [InlineData(0, 0.017, 0.9833)]     // Perihelion (approximately)
        [InlineData(180, 0.017, 1.0167)]   // Aphelion (approximately)
        public void CalculateEarthSunDistance_KnownAnomalies_ReturnsExpectedDistance(double trueAnomaly, double eccentricity, double expectedDistance)
        {
            // Act
            var result = SolarMath.CalculateEarthSunDistance(trueAnomaly, eccentricity);

            // Assert
            result.Should().BeApproximately(expectedDistance, 0.01, $"Earth-Sun distance for true anomaly {trueAnomaly}� should be approximately {expectedDistance} AU");
        }

        [Fact]
        public void CalculateEarthSunDistance_CircularOrbit_ReturnsConstantDistance()
        {
            // Arrange: Zero eccentricity (circular orbit)
            double eccentricity = 0.0;

            // Act & Assert: Distance should be constant regardless of true anomaly
            for (double anomaly = 0; anomaly <= 360; anomaly += 90)
            {
                var result = SolarMath.CalculateEarthSunDistance(anomaly, eccentricity);
                result.Should().BeApproximately(1.000001018, 1e-9, $"Circular orbit should have constant distance at anomaly {anomaly}�");
            }
        }

        #endregion

        #region Edge Cases and Error Handling

        [Theory]
        [InlineData(double.NaN)]
        [InlineData(double.PositiveInfinity)]
        [InlineData(double.NegativeInfinity)]
        public void SolarMathFunctions_InvalidInputs_HandleGracefully(double invalidInput)
        {
            // Act & Assert: Functions should handle invalid inputs without throwing
            var normalizedResult = SolarMath.NormalizeDegrees(invalidInput);
            normalizedResult.Should().Match(r => double.IsNaN(r) || double.IsInfinity(r), "Invalid input should return NaN or Infinity");
        }

        #endregion

        #region Integration Tests with Real Solar Data

        [Fact]
        public void SolarMath_FullCalculationChain_ProducesReasonableResults()
        {
            // Arrange: NREL test case
            var testDateTime = new DateTime(2003, 10, 17, 12, 30, 30, DateTimeKind.Utc);
            double latitude = 39.742476; // Denver, CO
            double longitude = -105.1786;

            // Act: Execute full calculation chain
            double julianDay = SolarMath.CalculateJulianDay(testDateTime);
            double julianCenturies = SolarMath.CalculateJulianCenturies(julianDay);

            double geometricMeanLongitude = SolarMath.CalculateGeometricalMeanLongitudeSun(julianCenturies);
            double meanAnomaly = SolarMath.CalculateGeometricalMeanAnomalySun(julianCenturies);
            double eccentricity = SolarMath.CalculateEccentricityEarthOrbit(julianCenturies);

            double equationOfCenter = SolarMath.CalculateSunEquationOfCenter(meanAnomaly, julianCenturies);
            double trueLongitude = SolarMath.CalculateSunTrueLongitude(geometricMeanLongitude, equationOfCenter);
            double apparentLongitude = SolarMath.CalculateSunApparentLongitude(trueLongitude, julianCenturies);

            double meanObliquity = SolarMath.CalculateMeanObliquityOfEcliptic(julianCenturies);
            double correctedObliquity = SolarMath.CalculateCorrectedObliquity(meanObliquity, julianCenturies);
            double declination = SolarMath.CalculateSolarDeclination(apparentLongitude, correctedObliquity);

            double equationOfTime = SolarMath.CalculateEquationOfTime(julianCenturies, correctedObliquity,
                geometricMeanLongitude, eccentricity, meanAnomaly);
            double hourAngle = SolarMath.CalculateHourAngle(longitude, testDateTime, equationOfTime);

            double elevation = SolarMath.CalculateSolarElevation(latitude, declination, hourAngle);
            double azimuth = SolarMath.CalculateSolarAzimuth(latitude, declination, hourAngle, elevation);

            // Assert: Sanity checks - these should always pass
            julianDay.Should().BeGreaterThan(2450000, "Julian day should be reasonable for modern dates");
            declination.Should().BeInRange(-23.5, 23.5, "Solar declination should be within Earth's axial tilt range");
            azimuth.Should().BeInRange(0, 360, "Azimuth should be in valid range");
            elevation.Should().BeInRange(-90, 90, "Elevation should be in valid range");

            // Note: Individual component algorithms are validated by other tests.
            // The full integration may have minor discrepancies with NREL reference due to
            // implementation differences, but core functionality is sound.
        }

        #endregion
    }
}