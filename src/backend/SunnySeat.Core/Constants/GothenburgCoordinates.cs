namespace SunnySeat.Core.Constants
{
    /// <summary>
    /// Gothenburg-specific coordinate constants and optimization parameters
    /// </summary>
    public static class GothenburgCoordinates
    {
        /// <summary>
        /// Gothenburg city center latitude in decimal degrees
        /// </summary>
        public const double Latitude = 57.7089;

        /// <summary>
        /// Gothenburg city center longitude in decimal degrees
        /// </summary>
        public const double Longitude = 11.9746;

        /// <summary>
        /// Average elevation above sea level in meters
        /// </summary>
        public const double Elevation = 12.0;

        /// <summary>
        /// Timezone identifier for Gothenburg (Sweden)
        /// </summary>
        public const string TimeZone = "Europe/Stockholm";

        /// <summary>
        /// Windows timezone identifier for Gothenburg
        /// </summary>
        public const string WindowsTimeZone = "W. Europe Standard Time";

        // Solar calculation optimization bounds for Gothenburg area

        /// <summary>
        /// Southern boundary of Gothenburg area for optimization
        /// </summary>
        public const double MinLatitude = 57.6;

        /// <summary>
        /// Northern boundary of Gothenburg area for optimization
        /// </summary>
        public const double MaxLatitude = 57.8;

        /// <summary>
        /// Western boundary of Gothenburg area for optimization
        /// </summary>
        public const double MinLongitude = 11.8;

        /// <summary>
        /// Eastern boundary of Gothenburg area for optimization
        /// </summary>
        public const double MaxLongitude = 12.1;

        /// <summary>
        /// Validate if coordinates are within Gothenburg bounds
        /// </summary>
        /// <param name="latitude">Latitude to validate</param>
        /// <param name="longitude">Longitude to validate</param>
        /// <returns>True if coordinates are within Gothenburg optimization area</returns>
        public static bool IsWithinGothenburgBounds(double latitude, double longitude)
        {
            return latitude >= MinLatitude && latitude <= MaxLatitude &&
                   longitude >= MinLongitude && longitude <= MaxLongitude;
        }
    }
}