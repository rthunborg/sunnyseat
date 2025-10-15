using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SunnySeat.Core.Constants;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Api.Endpoints
{
    /// <summary>
    /// Solar position calculation API endpoints
    /// Provides high-performance solar position data for sun exposure calculations
    /// </summary>
    [ApiController]
    [Route("api/solar")]
    [Produces("application/json")]
    public class SolarController : ControllerBase
    {
        private readonly ISolarCalculationService _solarCalculationService;
        private readonly ILogger<SolarController> _logger;

        public SolarController(
            ISolarCalculationService solarCalculationService,
            ILogger<SolarController> logger)
        {
            _solarCalculationService = solarCalculationService ?? throw new ArgumentNullException(nameof(solarCalculationService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Get solar position for a specific timestamp and location
        /// </summary>
        /// <param name="timestamp">UTC timestamp for calculation</param>
        /// <param name="lat">Latitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="lng">Longitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Solar position data</returns>
        /// <response code="200">Solar position calculated successfully</response>
        /// <response code="400">Invalid input parameters</response>
        /// <response code="500">Internal server error during calculation</response>
        [HttpGet("position")]
        [ProducesResponseType(typeof(SolarPosition), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SolarPosition>> GetSolarPosition(
            [FromQuery] DateTime timestamp,
            [FromQuery] [Range(-90, 90)] double lat = GothenburgCoordinates.Latitude,
            [FromQuery] [Range(-180, 180)] double lng = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Convert to UTC if not specified
                if (timestamp.Kind == DateTimeKind.Unspecified)
                {
                    timestamp = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc);
                }
                else if (timestamp.Kind == DateTimeKind.Local)
                {
                    timestamp = timestamp.ToUniversalTime();
                }

                var result = await _solarCalculationService.CalculateSolarPositionAsync(timestamp, lat, lng, cancellationToken);
                
                _logger.LogDebug("Solar position calculated for {Timestamp} at ({Lat}, {Lng}): Azimuth={Azimuth:F2}°, Elevation={Elevation:F2}°", 
                    timestamp, lat, lng, result.Azimuth, result.Elevation);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for solar position calculation");
                return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate solar position for {Timestamp} at ({Lat}, {Lng})", timestamp, lat, lng);
                return StatusCode(500, "Internal server error during solar position calculation");
            }
        }

        /// <summary>
        /// Get current solar position based on system time
        /// </summary>
        /// <param name="lat">Latitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="lng">Longitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Current solar position data</returns>
        /// <response code="200">Current solar position calculated successfully</response>
        /// <response code="400">Invalid input parameters</response>
        /// <response code="500">Internal server error during calculation</response>
        [HttpGet("current")]
        [ProducesResponseType(typeof(SolarPosition), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SolarPosition>> GetCurrentSolarPosition(
            [FromQuery] [Range(-90, 90)] double lat = GothenburgCoordinates.Latitude,
            [FromQuery] [Range(-180, 180)] double lng = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var result = await _solarCalculationService.GetCurrentSolarPositionAsync(lat, lng, cancellationToken);
                
                _logger.LogDebug("Current solar position calculated at ({Lat}, {Lng}): Azimuth={Azimuth:F2}°, Elevation={Elevation:F2}°", 
                    lat, lng, result.Azimuth, result.Elevation);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for current solar position calculation");
                return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate current solar position at ({Lat}, {Lng})", lat, lng);
                return StatusCode(500, "Internal server error during solar position calculation");
            }
        }

        /// <summary>
        /// Get solar position timeline for a time range with specified interval
        /// </summary>
        /// <param name="start">Start timestamp in UTC</param>
        /// <param name="end">End timestamp in UTC</param>
        /// <param name="intervalMinutes">Time interval between calculations in minutes (default: 10)</param>
        /// <param name="lat">Latitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="lng">Longitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Collection of solar position data points</returns>
        /// <response code="200">Solar timeline calculated successfully</response>
        /// <response code="400">Invalid input parameters</response>
        /// <response code="500">Internal server error during calculation</response>
        [HttpGet("timeline")]
        [ProducesResponseType(typeof(IEnumerable<SolarPosition>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<SolarPosition>>> GetSolarTimeline(
            [FromQuery] DateTime start,
            [FromQuery] DateTime end,
            [FromQuery] [Range(1, 1440)] int intervalMinutes = 10,
            [FromQuery] [Range(-90, 90)] double lat = GothenburgCoordinates.Latitude,
            [FromQuery] [Range(-180, 180)] double lng = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Convert to UTC if not specified
                if (start.Kind == DateTimeKind.Unspecified)
                    start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
                else if (start.Kind == DateTimeKind.Local)
                    start = start.ToUniversalTime();

                if (end.Kind == DateTimeKind.Unspecified)
                    end = DateTime.SpecifyKind(end, DateTimeKind.Utc);
                else if (end.Kind == DateTimeKind.Local)
                    end = end.ToUniversalTime();

                var interval = TimeSpan.FromMinutes(intervalMinutes);
                var result = await _solarCalculationService.CalculateSolarTimelineAsync(start, end, interval, lat, lng, cancellationToken);
                
                var positions = result.ToList();
                _logger.LogInformation("Solar timeline calculated: {Count} positions from {Start} to {End} at ({Lat}, {Lng})", 
                    positions.Count, start, end, lat, lng);
                
                return Ok(positions);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for solar timeline calculation");
                return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate solar timeline from {Start} to {End} at ({Lat}, {Lng})", start, end, lat, lng);
                return StatusCode(500, "Internal server error during solar timeline calculation");
            }
        }

        /// <summary>
        /// Get sunrise, sunset, and solar noon times for a specific date
        /// </summary>
        /// <param name="date">Date for sun times calculation (YYYY-MM-DD format)</param>
        /// <param name="lat">Latitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="lng">Longitude in decimal degrees (default: Gothenburg)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Sun times data including sunrise, sunset, and solar noon</returns>
        /// <response code="200">Sun times calculated successfully</response>
        /// <response code="400">Invalid input parameters</response>
        /// <response code="500">Internal server error during calculation</response>
        [HttpGet("sun-times")]
        [ProducesResponseType(typeof(SunTimes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SunTimes>> GetSunTimes(
            [FromQuery] DateOnly date,
            [FromQuery] [Range(-90, 90)] double lat = GothenburgCoordinates.Latitude,
            [FromQuery] [Range(-180, 180)] double lng = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var result = await _solarCalculationService.GetSunTimesAsync(date, lat, lng, cancellationToken);
                
                _logger.LogDebug("Sun times calculated for {Date} at ({Lat}, {Lng}): Sunrise={Sunrise}, Sunset={Sunset}, DayLength={DayLength}", 
                    date, lat, lng, result.SunriseLocal, result.SunsetLocal, result.DayLength);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for sun times calculation");
                return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate sun times for {Date} at ({Lat}, {Lng})", date, lat, lng);
                return StatusCode(500, "Internal server error during sun times calculation");
            }
        }

        /// <summary>
        /// Get solar position for a specific venue
        /// </summary>
        /// <param name="venueId">Venue ID</param>
        /// <param name="timestamp">UTC timestamp for calculation</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Solar position for the venue location</returns>
        /// <response code="200">Solar position calculated successfully</response>
        /// <response code="400">Invalid venue ID or timestamp</response>
        /// <response code="404">Venue not found or has no location data</response>
        /// <response code="500">Internal server error during calculation</response>
        [HttpGet("venue/{venueId}")]
        [ProducesResponseType(typeof(SolarPosition), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SolarPosition>> GetSolarPositionForVenue(
            [FromRoute] int venueId,
            [FromQuery] DateTime timestamp,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (venueId <= 0)
                {
                    return BadRequest(new ValidationProblemDetails { Detail = "Venue ID must be positive" });
                }

                // Convert to UTC if not specified
                if (timestamp.Kind == DateTimeKind.Unspecified)
                    timestamp = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc);
                else if (timestamp.Kind == DateTimeKind.Local)
                    timestamp = timestamp.ToUniversalTime();

                var result = await _solarCalculationService.CalculateForVenueAsync(venueId, timestamp, cancellationToken);
                
                _logger.LogDebug("Solar position calculated for venue {VenueId} at {Timestamp}: Azimuth={Azimuth:F2}°, Elevation={Elevation:F2}°", 
                    venueId, timestamp, result.Azimuth, result.Elevation);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for venue solar position calculation");
                
                if (ex.Message.Contains("has no location data"))
                    return NotFound($"Venue {venueId} not found or has no location data");
                
                return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate solar position for venue {VenueId} at {Timestamp}", venueId, timestamp);
                return StatusCode(500, "Internal server error during solar position calculation");
            }
        }

        /// <summary>
        /// Get solar position for a specific patio
        /// </summary>
        /// <param name="patioId">Patio ID</param>
        /// <param name="timestamp">UTC timestamp for calculation</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Solar position for the patio centroid location</returns>
        /// <response code="200">Solar position calculated successfully</response>
        /// <response code="400">Invalid patio ID or timestamp</response>
        /// <response code="404">Patio not found or has no geometry data</response>
        /// <response code="500">Internal server error during calculation</response>
        [HttpGet("patio/{patioId}")]
        [ProducesResponseType(typeof(SolarPosition), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SolarPosition>> GetSolarPositionForPatio(
            [FromRoute] int patioId,
            [FromQuery] DateTime timestamp,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (patioId <= 0)
                {
                    return BadRequest(new ValidationProblemDetails { Detail = "Patio ID must be positive" });
                }

                // Convert to UTC if not specified
                if (timestamp.Kind == DateTimeKind.Unspecified)
                    timestamp = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc);
                else if (timestamp.Kind == DateTimeKind.Local)
                    timestamp = timestamp.ToUniversalTime();

                var result = await _solarCalculationService.CalculateForPatioAsync(patioId, timestamp, cancellationToken);
                
                _logger.LogDebug("Solar position calculated for patio {PatioId} at {Timestamp}: Azimuth={Azimuth:F2}°, Elevation={Elevation:F2}°", 
                    patioId, timestamp, result.Azimuth, result.Elevation);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for patio solar position calculation");
                
                if (ex.Message.Contains("has no geometry data"))
                    return NotFound($"Patio {patioId} not found or has no geometry data");
                
                return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate solar position for patio {PatioId} at {Timestamp}", patioId, timestamp);
                return StatusCode(500, "Internal server error during solar position calculation");
            }
        }
    }
}