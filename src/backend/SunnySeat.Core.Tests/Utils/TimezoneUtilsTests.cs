using FluentAssertions;
using SunnySeat.Core.Utils;
using Xunit;

namespace SunnySeat.Core.Tests.Utils
{
    /// <summary>
    /// Unit tests for TimezoneUtils
    /// Validates Swedish timezone handling and DST transitions
    /// </summary>
    public class TimezoneUtilsTests
    {
        #region Timezone Conversion Tests

        [Theory]
        [InlineData("2024-06-15 12:00:00", "2024-06-15 14:00:00")] // Summer (CEST = UTC+2)
        [InlineData("2024-01-15 12:00:00", "2024-01-15 13:00:00")] // Winter (CET = UTC+1)
        [InlineData("2024-12-21 00:00:00", "2024-12-21 01:00:00")] // Winter solstice
        [InlineData("2024-06-21 23:59:59", "2024-06-22 01:59:59")] // Summer solstice, day boundary
        public void ConvertUtcToStockholm_VariousDates_ConvertsCorrectly(string utcTimeString, string expectedLocalTimeString)
        {
            // Arrange
            // Parse as UTC without timezone interpretation
            var utcTime = DateTime.SpecifyKind(DateTime.Parse(utcTimeString), DateTimeKind.Utc);
            var expectedLocalTime = DateTime.Parse(expectedLocalTimeString);

            // Act
            var result = TimezoneUtils.ConvertUtcToStockholm(utcTime);

            // Assert
            // Compare components instead of DateTime objects to avoid machine timezone issues
            result.Year.Should().Be(expectedLocalTime.Year);
            result.Month.Should().Be(expectedLocalTime.Month);
            result.Day.Should().Be(expectedLocalTime.Day);
            result.Hour.Should().Be(expectedLocalTime.Hour);
            result.Minute.Should().Be(expectedLocalTime.Minute);
            result.Second.Should().Be(expectedLocalTime.Second,
                $"UTC {utcTimeString} should convert to local {expectedLocalTimeString}");
        }
        [Theory]
        [InlineData("2024-06-15 14:00:00", "2024-06-15 12:00:00")] // Summer (CEST = UTC+2)
        [InlineData("2024-01-15 13:00:00", "2024-01-15 12:00:00")] // Winter (CET = UTC+1)
        public void ConvertStockholmToUtc_VariousDates_ConvertsCorrectly(string localTimeString, string expectedUtcTimeString)
        {
            // Arrange
            var localTime = DateTime.Parse(localTimeString);
            var expectedUtcTime = DateTime.Parse(expectedUtcTimeString);

            // Act
            var result = TimezoneUtils.ConvertStockholmToUtc(localTime);

            // Assert
            result.Kind.Should().Be(DateTimeKind.Utc, "Converted time should be UTC");
            // Compare components instead of DateTime objects to avoid machine timezone issues
            result.Year.Should().Be(expectedUtcTime.Year);
            result.Month.Should().Be(expectedUtcTime.Month);
            result.Day.Should().Be(expectedUtcTime.Day);
            result.Hour.Should().Be(expectedUtcTime.Hour);
            result.Minute.Should().Be(expectedUtcTime.Minute);
            result.Second.Should().Be(expectedUtcTime.Second,
                $"Local {localTimeString} should convert to UTC {expectedUtcTimeString}");
        }

        [Fact]
        public void ConvertUtcToStockholm_UnspecifiedKind_TreatsAsUtc()
        {
            // Arrange
            var unspecifiedTime = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Unspecified);

            // Act
            var result = TimezoneUtils.ConvertUtcToStockholm(unspecifiedTime);

            // Assert
            result.Should().NotBe(unspecifiedTime, "Should convert assuming UTC input");
            result.Hour.Should().Be(14, "Should add 2 hours for summer time (CEST = UTC+2)");
        }

        #endregion

        #region DST Detection Tests

        [Theory]
        [InlineData("2024-07-15 12:00:00", true)]  // Summer - DST active
        [InlineData("2024-01-15 12:00:00", false)] // Winter - DST not active
        [InlineData("2024-03-31 00:30:00", false)] // Just before DST starts (1:00 UTC = 2:00 CET)
        [InlineData("2024-03-31 01:30:00", true)]  // Just after DST starts (1:30 UTC = 3:30 CEST)
        [InlineData("2024-10-27 00:30:00", true)]  // Just before DST ends (0:30 UTC = 2:30 CEST)
        [InlineData("2024-10-27 01:30:00", false)] // Just after DST ends (1:30 UTC = 2:30 CET)
        public void IsDaylightSavingTime_VariousDates_ReturnsCorrectDstStatus(string utcTimeString, bool expectedDstActive)
        {
            // Arrange
            var utcTime = DateTime.SpecifyKind(DateTime.Parse(utcTimeString), DateTimeKind.Utc);

            // Act
            var result = TimezoneUtils.IsDaylightSavingTime(utcTime);

            // Assert
            result.Should().Be(expectedDstActive, $"DST status for {utcTimeString} UTC should be {expectedDstActive}");
        }

        [Theory]
        [InlineData("2024-07-15 12:00:00", 2)] // Summer - UTC+2
        [InlineData("2024-01-15 12:00:00", 1)] // Winter - UTC+1
        public void GetUtcOffset_SeasonalVariation_ReturnsCorrectOffset(string utcTimeString, int expectedOffsetHours)
        {
            // Arrange
            var utcTime = DateTime.SpecifyKind(DateTime.Parse(utcTimeString), DateTimeKind.Utc);

            // Act
            var result = TimezoneUtils.GetUtcOffset(utcTime);

            // Assert
            result.Should().Be(TimeSpan.FromHours(expectedOffsetHours),
                $"UTC offset for {utcTimeString} should be +{expectedOffsetHours} hours");
        }

        #endregion

        #region DST Transition Tests

        [Theory]
        [InlineData(2024)] // Test current year
        [InlineData(2025)] // Test future year
        [InlineData(2023)] // Test past year
        public void GetDstTransitions_VariousYears_ReturnsValidTransitionDates(int year)
        {
            // Act
            var (dstStart, dstEnd) = TimezoneUtils.GetDstTransitions(year);

            // Assert
            dstStart.Year.Should().Be(year);
            dstEnd.Year.Should().Be(year);

            dstStart.Month.Should().Be(3, "DST should start in March");
            dstEnd.Month.Should().Be(10, "DST should end in October");

            dstStart.DayOfWeek.Should().Be(DayOfWeek.Sunday, "DST should start on Sunday");
            dstEnd.DayOfWeek.Should().Be(DayOfWeek.Sunday, "DST should end on Sunday");

            dstStart.Should().BeBefore(dstEnd, "DST start should be before DST end");

            // Should be last Sundays in their respective months
            var nextWeek = dstStart.AddDays(7);
            nextWeek.Month.Should().NotBe(3, "DST start should be the last Sunday in March");

            var nextWeekEnd = dstEnd.AddDays(7);
            nextWeekEnd.Month.Should().NotBe(10, "DST end should be the last Sunday in October");
        }

        [Fact]
        public void GetDstTransitions_2024_ReturnsKnownTransitionDates()
        {
            // Act
            var (dstStart, dstEnd) = TimezoneUtils.GetDstTransitions(2024);

            // Assert
            dstStart.Should().Be(new DateTime(2024, 3, 31, 1, 0, 0, DateTimeKind.Utc),
                "2024 DST should start on March 31 at 1:00 UTC");
            dstEnd.Should().Be(new DateTime(2024, 10, 27, 1, 0, 0, DateTimeKind.Utc),
                "2024 DST should end on October 27 at 1:00 UTC");
        }

        #endregion

        #region DST Gap and Overlap Handling

        [Theory]
        [InlineData("2024-03-31 02:30:00", false)] // DST gap (this time doesn't exist)
        [InlineData("2024-03-31 01:30:00", true)]  // Before DST gap
        [InlineData("2024-03-31 03:30:00", true)]  // After DST gap
        [InlineData("2024-10-27 02:30:00", true)]  // DST overlap (this time exists twice)
        [InlineData("2024-01-15 12:00:00", true)]  // Normal winter time
        [InlineData("2024-07-15 12:00:00", true)]  // Normal summer time
        public void IsValidLocalTime_VariousLocalTimes_ReturnsCorrectValidity(string localTimeString, bool expectedValid)
        {
            // Arrange
            var localTime = DateTime.Parse(localTimeString);

            // Act
            var result = TimezoneUtils.IsValidLocalTime(localTime);

            // Assert
            result.Should().Be(expectedValid, $"Local time {localTimeString} validity should be {expectedValid}");
        }

        [Fact]
        public void AdjustForDstGap_TimeInGap_AdjustsForward()
        {
            // Arrange: Time that falls in DST gap (2:30 AM becomes 3:30 AM)
            var timeInGap = new DateTime(2024, 3, 31, 2, 30, 0);

            // Act
            var result = TimezoneUtils.AdjustForDstGap(timeInGap);

            // Assert
            result.Should().Be(timeInGap.AddHours(1), "Time in DST gap should be adjusted forward by 1 hour");
        }

        [Fact]
        public void AdjustForDstGap_ValidTime_NoAdjustment()
        {
            // Arrange: Valid time outside DST gap
            var validTime = new DateTime(2024, 6, 15, 12, 30, 0);

            // Act
            var result = TimezoneUtils.AdjustForDstGap(validTime);

            // Assert
            result.Should().Be(validTime, "Valid time should not be adjusted");
        }

        #endregion

        #region Timezone Abbreviation Tests

        [Theory]
        [InlineData("2024-07-15 12:00:00", "CEST")] // Summer time
        [InlineData("2024-01-15 12:00:00", "CET")]  // Standard time
        [InlineData("2024-03-31 00:30:00", "CET")]  // Just before DST
        [InlineData("2024-03-31 01:30:00", "CEST")] // Just after DST starts
        [InlineData("2024-10-27 00:30:00", "CEST")] // Just before DST ends
        [InlineData("2024-10-27 01:30:00", "CET")]  // Just after DST ends
        public void GetTimezoneAbbreviation_VariousDates_ReturnsCorrectAbbreviation(string utcTimeString, string expectedAbbreviation)
        {
            // Arrange
            var utcTime = DateTime.SpecifyKind(DateTime.Parse(utcTimeString), DateTimeKind.Utc);

            // Act
            var result = TimezoneUtils.GetTimezoneAbbreviation(utcTime);

            // Assert
            result.Should().Be(expectedAbbreviation, $"Timezone abbreviation for {utcTimeString} UTC should be {expectedAbbreviation}");
        }

        #endregion

        #region Formatting Tests

        [Theory]
        [InlineData("2024-07-15 12:00:00", "2024-07-15 14:00:00 CEST (UTC+02:00)")]
        [InlineData("2024-01-15 12:00:00", "2024-01-15 13:00:00 CET (UTC+01:00)")]
        public void FormatWithTimezone_VariousDates_FormatsCorrectly(string utcTimeString, string expectedFormat)
        {
            // Arrange
            var utcTime = DateTime.SpecifyKind(DateTime.Parse(utcTimeString), DateTimeKind.Utc);

            // Act
            var result = TimezoneUtils.FormatWithTimezone(utcTime);

            // Assert
            result.Should().Be(expectedFormat, $"Formatted time for {utcTimeString} UTC should match expected format");
        }

        #endregion

        #region Edge Cases and Robustness

        [Fact]
        public void TimezoneUtils_ExtremeDates_HandlesGracefully()
        {
            // Arrange: Test with extreme but valid dates
            var earlyDate = new DateTime(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var lateDate = new DateTime(2100, 12, 31, 23, 59, 59, DateTimeKind.Utc);

            // Act & Assert: Should not throw exceptions
            var earlyLocal = TimezoneUtils.ConvertUtcToStockholm(earlyDate);
            var lateLocal = TimezoneUtils.ConvertUtcToStockholm(lateDate);

            earlyLocal.Should().NotBe(earlyDate, "Early date should be converted");
            lateLocal.Should().NotBe(lateDate, "Late date should be converted");
        }

        [Fact]
        public void TimezoneUtils_LeapYear_HandlesDstCorrectly()
        {
            // Arrange: Test DST in leap year
            var leapYearDst = new DateTime(2024, 3, 31, 1, 30, 0, DateTimeKind.Utc); // 2024 is leap year

            // Act
            var isDst = TimezoneUtils.IsDaylightSavingTime(leapYearDst);
            var offset = TimezoneUtils.GetUtcOffset(leapYearDst);

            // Assert
            isDst.Should().BeTrue("Should correctly detect DST in leap year");
            offset.Should().Be(TimeSpan.FromHours(2), "Should have correct offset during DST in leap year");
        }

        #endregion

        #region Historical DST Accuracy

        [Theory]
        [InlineData(2020, 3, 29)] // 2020 DST start
        [InlineData(2021, 3, 28)] // 2021 DST start
        [InlineData(2022, 3, 27)] // 2022 DST start
        [InlineData(2023, 3, 26)] // 2023 DST start
        public void GetDstTransitions_HistoricalYears_ReturnsCorrectDates(int year, int expectedMonth, int expectedDay)
        {
            // Act
            var (dstStart, dstEnd) = TimezoneUtils.GetDstTransitions(year);

            // Assert
            dstStart.Month.Should().Be(expectedMonth);
            dstStart.Day.Should().Be(expectedDay);
            dstStart.DayOfWeek.Should().Be(DayOfWeek.Sunday);
            dstStart.Hour.Should().Be(1); // 1:00 UTC
        }

        #endregion
    }
}