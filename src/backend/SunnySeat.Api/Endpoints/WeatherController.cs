using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// Weather API endpoints for processed weather data
/// Provides access to processed weather forecasts with sun-relevant conditions
/// </summary>
[ApiController]
[Route("api/weather")]
[Produces("application/json")]
public class WeatherController : ControllerBase
{
    private readonly IWeatherProcessingService _weatherProcessingService;
    private readonly IWeatherRepository _weatherRepository;
    private readonly ILogger<WeatherController> _logger;
    private readonly GeometryFactory _geometryFactory;

    public WeatherController(
        IWeatherProcessingService weatherProcessingService,
        IWeatherRepository weatherRepository,
        ILogger<WeatherController> logger)
    {
        _weatherProcessingService = weatherProcessingService ?? throw new ArgumentNullException(nameof(weatherProcessingService));
        _weatherRepository = weatherRepository ?? throw new ArgumentNullException(nameof(weatherRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _geometryFactory = new GeometryFactory();
    }

    /// <summary>
    /// Get processed weather forecast for a specific location
    /// </summary>
    /// <param name="latitude">Latitude in decimal degrees</param>
    /// <param name="longitude">Longitude in decimal degrees</param>
    /// <param name="startTime">Start of forecast period (UTC)</param>
    /// <param name="endTime">End of forecast period (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Processed weather forecast data</returns>
    /// <response code="200">Weather forecast retrieved successfully</response>
    /// <response code="400">Invalid input parameters</response>
    /// <response code="404">No weather data available for requested time range</response>
    /// <response code="500">Internal server error</response>
    [HttpGet("forecast")]
    [ProducesResponseType(typeof(IReadOnlyList<ProcessedWeather>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<ProcessedWeather>>> GetForecast(
        [FromQuery][Required][Range(-90, 90)] double latitude,
        [FromQuery][Required][Range(-180, 180)] double longitude,
        [FromQuery][Required] DateTime startTime,
        [FromQuery][Required] DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate time range
            if (startTime >= endTime)
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "Start time must be before end time"
                });
            }

            if (endTime - startTime > TimeSpan.FromDays(7))
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "Time range cannot exceed 7 days"
                });
            }

            // Convert to UTC
            if (startTime.Kind == DateTimeKind.Unspecified)
                startTime = DateTime.SpecifyKind(startTime, DateTimeKind.Utc);
            if (endTime.Kind == DateTimeKind.Unspecified)
                endTime = DateTime.SpecifyKind(endTime, DateTimeKind.Utc);

            // Create location point
            var location = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));

            // Get processed weather for location
            var forecast = await _weatherProcessingService.GetProcessedWeatherForPatioAsync(
                location, startTime, endTime, cancellationToken);

            if (forecast.Count == 0)
            {
                _logger.LogWarning(
                    "No weather data available for location ({Lat}, {Lon}) from {Start} to {End}",
                    latitude, longitude, startTime, endTime);
                return NotFound("No weather data available for the requested time range");
            }

            _logger.LogDebug(
                "Retrieved {Count} processed weather entries for location ({Lat}, {Lon})",
                forecast.Count, latitude, longitude);

            return Ok(forecast);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for weather forecast request");
            return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving weather forecast for location ({Lat}, {Lon})",
                latitude, longitude);
            return StatusCode(500, "Internal server error retrieving weather forecast");
        }
    }

    /// <summary>
    /// Get current processed weather conditions for a specific location
    /// </summary>
    /// <param name="latitude">Latitude in decimal degrees</param>
    /// <param name="longitude">Longitude in decimal degrees</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Current processed weather data</returns>
    /// <response code="200">Current weather retrieved successfully</response>
    /// <response code="400">Invalid input parameters</response>
    /// <response code="404">No current weather data available</response>
    /// <response code="500">Internal server error</response>
    [HttpGet("current")]
    [ProducesResponseType(typeof(ProcessedWeather), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProcessedWeather>> GetCurrentWeather(
        [FromQuery][Required][Range(-90, 90)] double latitude,
        [FromQuery][Required][Range(-180, 180)] double longitude,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var now = DateTime.UtcNow;
            var location = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));

            // Get weather for current hour window
            var forecast = await _weatherProcessingService.GetProcessedWeatherForPatioAsync(
                location, now, now.AddHours(1), cancellationToken);

            if (forecast.Count == 0)
            {
                _logger.LogWarning(
                    "No current weather data available for location ({Lat}, {Lon})",
                    latitude, longitude);
                return NotFound("No current weather data available");
            }

            // Return the weather data closest to current time
            var currentWeather = forecast
                .OrderBy(w => Math.Abs((w.Timestamp - now).TotalSeconds))
                .First();

            _logger.LogDebug(
                "Retrieved current weather for location ({Lat}, {Lon}): {Condition}, {CloudCover}% cloud",
                latitude, longitude, currentWeather.Condition, currentWeather.NormalizedCloudCover);

            return Ok(currentWeather);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for current weather request");
            return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving current weather for location ({Lat}, {Lon})",
                latitude, longitude);
            return StatusCode(500, "Internal server error retrieving current weather");
        }
    }

    /// <summary>
    /// Get processed weather data by time range (no specific location)
    /// </summary>
    /// <param name="startTime">Start of time range (UTC)</param>
    /// <param name="endTime">End of time range (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Processed weather data for time range</returns>
    /// <response code="200">Weather data retrieved successfully</response>
    /// <response code="400">Invalid input parameters</response>
    /// <response code="500">Internal server error</response>
    [HttpGet("range")]
    [ProducesResponseType(typeof(IReadOnlyList<ProcessedWeather>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<ProcessedWeather>>> GetWeatherByTimeRange(
        [FromQuery][Required] DateTime startTime,
        [FromQuery][Required] DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate time range
            if (startTime >= endTime)
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "Start time must be before end time"
                });
            }

            // Convert to UTC
            if (startTime.Kind == DateTimeKind.Unspecified)
                startTime = DateTime.SpecifyKind(startTime, DateTimeKind.Utc);
            if (endTime.Kind == DateTimeKind.Unspecified)
                endTime = DateTime.SpecifyKind(endTime, DateTimeKind.Utc);

            // Get processed weather data
            var weatherData = await _weatherRepository.GetProcessedWeatherByTimeRangeAsync(
                startTime, endTime, cancellationToken);

            _logger.LogDebug(
                "Retrieved {Count} processed weather entries for time range {Start} to {End}",
                weatherData.Count, startTime, endTime);

            return Ok(weatherData);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for weather range request");
            return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving weather data for time range {Start} to {End}",
                startTime, endTime);
            return StatusCode(500, "Internal server error retrieving weather data");
        }
    }
}
