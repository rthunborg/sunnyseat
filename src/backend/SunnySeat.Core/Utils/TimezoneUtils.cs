using System;
using SunnySeat.Core.Constants;

namespace SunnySeat.Core.Utils
{
    /// <summary>
    /// Utility functions for timezone conversions and DST handling
    /// Specialized for Swedish/European timezone handling
    /// </summary>
    public static class TimezoneUtils
    {
        private static readonly TimeZoneInfo StockholmTimeZone = GetStockholmTimeZone();

        /// <summary>
        /// Get Stockholm timezone info (handles both Windows and Linux)
        /// </summary>
        /// <returns>Stockholm TimeZoneInfo</returns>
        private static TimeZoneInfo GetStockholmTimeZone()
        {
            try
            {
                // Try Windows timezone ID first
                return TimeZoneInfo.FindSystemTimeZoneById(GothenburgCoordinates.WindowsTimeZone);
            }
            catch (TimeZoneNotFoundException)
            {
                // Try Linux/Mac timezone ID
                return TimeZoneInfo.FindSystemTimeZoneById(GothenburgCoordinates.TimeZone);
            }
        }

        /// <summary>
        /// Create Stockholm timezone manually if system timezone not found
        /// </summary>
        /// <returns>Stockholm TimeZoneInfo</returns>
        private static TimeZoneInfo CreateStockholmTimeZone()
        {
            var standardOffset = TimeSpan.FromHours(1); // CET = UTC+1
            var daylightDelta = TimeSpan.FromHours(1); // DST adds 1 hour (CET to CEST)

            // DST rules for Europe: Last Sunday in March to Last Sunday in October
            var startTransition = TimeZoneInfo.TransitionTime.CreateFloatingDateRule(
                new DateTime(1, 1, 1, 2, 0, 0), 3, 5, DayOfWeek.Sunday); // March, last Sunday, 2:00 AM

            var endTransition = TimeZoneInfo.TransitionTime.CreateFloatingDateRule(
                new DateTime(1, 1, 1, 3, 0, 0), 10, 5, DayOfWeek.Sunday); // October, last Sunday, 3:00 AM

            var adjustment = TimeZoneInfo.AdjustmentRule.CreateAdjustmentRule(
                DateTime.MinValue.Date, DateTime.MaxValue.Date, daylightDelta, startTransition, endTransition);

            return TimeZoneInfo.CreateCustomTimeZone("Europe/Stockholm", standardOffset, "Central European Time", "CET", "CEST", new[] { adjustment });
        }

        /// <summary>
        /// Convert UTC time to Stockholm local time
        /// </summary>
        /// <param name="utcDateTime">UTC DateTime</param>
        /// <returns>Stockholm local DateTime</returns>
        public static DateTime ConvertUtcToStockholm(DateTime utcDateTime)
        {
            if (utcDateTime.Kind != DateTimeKind.Utc)
            {
                utcDateTime = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            }

            return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, StockholmTimeZone);
        }

        /// <summary>
        /// Convert Stockholm local time to UTC
        /// </summary>
        /// <param name="stockholmDateTime">Stockholm local DateTime</param>
        /// <returns>UTC DateTime</returns>
        public static DateTime ConvertStockholmToUtc(DateTime stockholmDateTime)
        {
            return TimeZoneInfo.ConvertTimeToUtc(stockholmDateTime, StockholmTimeZone);
        }

        /// <summary>
        /// Check if a given UTC time falls during Daylight Saving Time in Stockholm
        /// </summary>
        /// <param name="utcDateTime">UTC DateTime to check</param>
        /// <returns>True if DST is active</returns>
        public static bool IsDaylightSavingTime(DateTime utcDateTime)
        {
            if (utcDateTime.Kind != DateTimeKind.Utc)
            {
                utcDateTime = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            }

            // Use UTC offset to determine DST status to avoid ambiguity during transitions
            // CET = UTC+1, CEST = UTC+2
            var offset = StockholmTimeZone.GetUtcOffset(utcDateTime);
            return offset.TotalHours > 1.0; // DST active if offset > UTC+1
        }

        /// <summary>
        /// Get the UTC offset for Stockholm at a specific UTC time
        /// </summary>
        /// <param name="utcDateTime">UTC DateTime</param>
        /// <returns>UTC offset (including DST)</returns>
        public static TimeSpan GetUtcOffset(DateTime utcDateTime)
        {
            if (utcDateTime.Kind != DateTimeKind.Utc)
            {
                utcDateTime = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            }

            return StockholmTimeZone.GetUtcOffset(utcDateTime);
        }

        /// <summary>
        /// Get DST transition dates for a specific year
        /// </summary>
        /// <param name="year">Year to get transitions for</param>
        /// <returns>Tuple of (DST Start UTC, DST End UTC)</returns>
        public static (DateTime DstStart, DateTime DstEnd) GetDstTransitions(int year)
        {
            // DST starts last Sunday in March at 1:00 UTC (2:00 CET -> 3:00 CEST)
            var marchStart = new DateTime(year, 3, 1, 1, 0, 0, DateTimeKind.Utc);
            var dstStart = GetLastSundayInMonth(marchStart);

            // DST ends last Sunday in October at 1:00 UTC (3:00 CEST -> 2:00 CET)  
            var octoberStart = new DateTime(year, 10, 1, 1, 0, 0, DateTimeKind.Utc);
            var dstEnd = GetLastSundayInMonth(octoberStart);

            return (dstStart, dstEnd);
        }

        /// <summary>
        /// Find the last Sunday in a month
        /// </summary>
        /// <param name="monthStart">First day of the month</param>
        /// <returns>DateTime of last Sunday in that month</returns>
        private static DateTime GetLastSundayInMonth(DateTime monthStart)
        {
            var lastDay = new DateTime(monthStart.Year, monthStart.Month, DateTime.DaysInMonth(monthStart.Year, monthStart.Month),
                monthStart.Hour, monthStart.Minute, monthStart.Second, monthStart.Kind);

            // Find last Sunday by going back from the last day until we hit a Sunday
            while (lastDay.DayOfWeek != DayOfWeek.Sunday)
            {
                lastDay = lastDay.AddDays(-1);
            }

            return lastDay;
        }

        /// <summary>
        /// Validate if a DateTime represents a valid local time (handles DST gaps)
        /// </summary>
        /// <param name="localDateTime">Local DateTime to validate</param>
        /// <returns>True if the local time is valid</returns>
        public static bool IsValidLocalTime(DateTime localDateTime)
        {
            try
            {
                TimeZoneInfo.ConvertTimeToUtc(localDateTime, StockholmTimeZone);
                return true;
            }
            catch (ArgumentException)
            {
                // Time falls in DST gap (e.g., 2:30 AM on DST transition day)
                return false;
            }
        }

        /// <summary>
        /// Adjust invalid local time caused by DST transitions
        /// </summary>
        /// <param name="localDateTime">Potentially invalid local DateTime</param>
        /// <returns>Valid local DateTime (adjusted if necessary)</returns>
        public static DateTime AdjustForDstGap(DateTime localDateTime)
        {
            if (IsValidLocalTime(localDateTime))
            {
                return localDateTime;
            }

            // Time falls in DST gap - advance by 1 hour
            return localDateTime.AddHours(1);
        }

        /// <summary>
        /// Get timezone abbreviation for a specific UTC time
        /// </summary>
        /// <param name="utcDateTime">UTC DateTime</param>
        /// <returns>Timezone abbreviation (CET or CEST)</returns>
        public static string GetTimezoneAbbreviation(DateTime utcDateTime)
        {
            return IsDaylightSavingTime(utcDateTime) ? "CEST" : "CET";
        }

        /// <summary>
        /// Format DateTime with timezone information
        /// </summary>
        /// <param name="utcDateTime">UTC DateTime</param>
        /// <returns>Formatted string with local time and timezone</returns>
        public static string FormatWithTimezone(DateTime utcDateTime)
        {
            var localTime = ConvertUtcToStockholm(utcDateTime);
            var abbreviation = GetTimezoneAbbreviation(utcDateTime);
            var offset = GetUtcOffset(utcDateTime);

            var sign = offset < TimeSpan.Zero ? "-" : "+";
            return $"{localTime:yyyy-MM-dd HH:mm:ss} {abbreviation} (UTC{sign}{Math.Abs(offset.Hours):D2}:{Math.Abs(offset.Minutes):D2})";
        }
    }
}