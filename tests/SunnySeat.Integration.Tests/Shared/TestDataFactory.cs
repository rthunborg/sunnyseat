namespace SunnySeat.Integration.Tests.Shared;

/// <summary>
/// Factory for creating test data objects with realistic Swedish location data
/// </summary>
public static class TestDataFactory
{
    /// <summary>
    /// Creates test coordinates for major Swedish cities
    /// </summary>
    public static class SwedishCities
    {
        public static readonly (double Latitude, double Longitude, string Name) Stockholm = (59.3293, 18.0686, "Stockholm");
        public static readonly (double Latitude, double Longitude, string Name) Gothenburg = (57.7089, 11.9746, "Gothenburg");
        public static readonly (double Latitude, double Longitude, string Name) Malmö = (55.6050, 13.0038, "Malmö");
        public static readonly (double Latitude, double Longitude, string Name) Uppsala = (59.8586, 17.6389, "Uppsala");
        public static readonly (double Latitude, double Longitude, string Name) Västerås = (59.6099, 16.5448, "Västerås");

        public static IEnumerable<(double Latitude, double Longitude, string Name)> All()
        {
            yield return Stockholm;
            yield return Gothenburg;
            yield return Malmö;
            yield return Uppsala;
            yield return Västerås;
        }
    }

    /// <summary>
    /// Creates test venue data for Swedish restaurants and cafés
    /// </summary>
    public static class TestVenues
    {
        public static object CreateRestaurant(string name, double latitude, double longitude)
        {
            return new
            {
                Id = Guid.NewGuid(),
                Name = name,
                Type = "Restaurant",
                Latitude = latitude,
                Longitude = longitude,
                CreatedAt = DateTime.UtcNow,
                HasPatio = true
            };
        }

        public static object CreateCafé(string name, double latitude, double longitude)
        {
            return new
            {
                Id = Guid.NewGuid(),
                Name = name,
                Type = "Café",
                Latitude = latitude,
                Longitude = longitude,
                CreatedAt = DateTime.UtcNow,
                HasPatio = true
            };
        }

        public static IEnumerable<object> GetStockholmVenues()
        {
            var stockholm = SwedishCities.Stockholm;
            
            yield return CreateRestaurant("Restaurang Tradition", stockholm.Latitude + 0.001, stockholm.Longitude + 0.001);
            yield return CreateRestaurant("Modern Matsal", stockholm.Latitude - 0.001, stockholm.Longitude + 0.001);
            yield return CreateCafé("Café Gamla Stan", stockholm.Latitude + 0.002, stockholm.Longitude - 0.001);
            yield return CreateCafé("Södermalm Coffee", stockholm.Latitude - 0.002, stockholm.Longitude - 0.002);
        }
    }

    /// <summary>
    /// Creates test patio geometries using PostGIS-compatible data
    /// </summary>
    public static class TestPatios
    {
        public static object CreateRectangularPatio(double centerLat, double centerLon, double widthMeters = 10, double heightMeters = 8)
        {
            // Simple rectangular patio - in real implementation would use proper PostGIS geometries
            var halfWidth = widthMeters / 111320.0; // Approximate meters to degrees
            var halfHeight = heightMeters / 110540.0;

            return new
            {
                Id = Guid.NewGuid(),
                CenterLatitude = centerLat,
                CenterLongitude = centerLon,
                WidthMeters = widthMeters,
                HeightMeters = heightMeters,
                Geometry = $"POLYGON(({centerLon - halfWidth} {centerLat - halfHeight}, {centerLon + halfWidth} {centerLat - halfHeight}, {centerLon + halfWidth} {centerLat + halfHeight}, {centerLon - halfWidth} {centerLat + halfHeight}, {centerLon - halfWidth} {centerLat - halfHeight}))",
                Area = widthMeters * heightMeters,
                CreatedAt = DateTime.UtcNow
            };
        }

        public static object CreateCircularPatio(double centerLat, double centerLon, double radiusMeters = 5)
        {
            // Approximate circular patio
            var radiusDegrees = radiusMeters / 111320.0;

            return new
            {
                Id = Guid.NewGuid(),
                CenterLatitude = centerLat,
                CenterLongitude = centerLon,
                RadiusMeters = radiusMeters,
                Geometry = $"POINT({centerLon} {centerLat})", // Simplified for testing
                Area = Math.PI * radiusMeters * radiusMeters,
                CreatedAt = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Creates test weather data for sun calculations
    /// </summary>
    public static class TestWeatherData
    {
        public static object CreateSunnyWeather(DateTime timestamp, double latitude, double longitude)
        {
            return new
            {
                Id = Guid.NewGuid(),
                Timestamp = timestamp,
                Latitude = latitude,
                Longitude = longitude,
                CloudCover = 0.1, // 10% clouds (mostly sunny)
                Temperature = 22.5,
                Humidity = 0.45,
                WindSpeed = 3.2,
                WeatherDescription = "Sunny",
                ConfidenceLevel = 0.95
            };
        }

        public static object CreateCloudyWeather(DateTime timestamp, double latitude, double longitude)
        {
            return new
            {
                Id = Guid.NewGuid(),
                Timestamp = timestamp,
                Latitude = latitude,
                Longitude = longitude,
                CloudCover = 0.8, // 80% clouds
                Temperature = 18.0,
                Humidity = 0.70,
                WindSpeed = 5.5,
                WeatherDescription = "Cloudy",
                ConfidenceLevel = 0.85
            };
        }

        public static IEnumerable<object> CreateDailyForecast(DateTime startDate, double latitude, double longitude, int days = 7)
        {
            for (int i = 0; i < days; i++)
            {
                var date = startDate.AddDays(i);
                
                // Alternate between sunny and cloudy for variety
                if (i % 2 == 0)
                {
                    yield return CreateSunnyWeather(date, latitude, longitude);
                }
                else
                {
                    yield return CreateCloudyWeather(date, latitude, longitude);
                }
            }
        }
    }

    /// <summary>
    /// Creates test sun exposure data
    /// </summary>
    public static class TestSunExposure
    {
        public static object CreateSunWindow(Guid patioId, DateTime startTime, DateTime endTime, double exposurePercentage)
        {
            return new
            {
                Id = Guid.NewGuid(),
                PatioId = patioId,
                Date = startTime.Date,
                StartTime = startTime.TimeOfDay,
                EndTime = endTime.TimeOfDay,
                ExposurePercentage = exposurePercentage,
                ConfidenceLevel = 0.90,
                CreatedAt = DateTime.UtcNow
            };
        }

        public static IEnumerable<object> CreateDailySunWindows(Guid patioId, DateTime date)
        {
            // Morning sun (7:00-10:00) - partial exposure
            yield return CreateSunWindow(patioId, 
                date.AddHours(7), 
                date.AddHours(10), 
                0.60);

            // Midday sun (10:00-14:00) - full exposure
            yield return CreateSunWindow(patioId, 
                date.AddHours(10), 
                date.AddHours(14), 
                1.0);

            // Afternoon sun (14:00-18:00) - partial exposure due to buildings
            yield return CreateSunWindow(patioId, 
                date.AddHours(14), 
                date.AddHours(18), 
                0.75);
        }
    }
}