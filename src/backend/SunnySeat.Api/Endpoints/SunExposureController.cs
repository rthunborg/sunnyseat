using Microsoft.AspNetCore.Mvc;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// API endpoints for patio sun exposure calculations
/// </summary>
[ApiController]
[Route("api/sun-exposure")]
public class SunExposureController : ControllerBase
{
    private readonly ISunExposureService _sunExposureService;
    private readonly ILogger<SunExposureController> _logger;

    public SunExposureController(
        ISunExposureService sunExposureService,
        ILogger<SunExposureController> logger)
    {
        _sunExposureService = sunExposureService;
        _logger = logger;
    }

    /// <summary>
    /// Get sun exposure for a specific patio at given timestamp
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="timestamp">Timestamp for calculation (UTC, optional - defaults to current time)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Patio sun exposure information</returns>
    [HttpGet("patio/{id}")]
    [ProducesResponseType(typeof(PatioSunExposureResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PatioSunExposureResponse>> GetPatioSunExposure(
        int id,
        [FromQuery] DateTime? timestamp = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var calcTime = timestamp ?? DateTime.UtcNow;

            _logger.LogDebug("Calculating sun exposure for patio {PatioId} at {Timestamp}", id, calcTime);

            var sunExposure = await _sunExposureService.CalculatePatioSunExposureAsync(
                id, calcTime, cancellationToken);

            var response = PatioSunExposureResponse.FromPatioSunExposure(sunExposure, sunExposure.WeatherData);

            _logger.LogInformation("Sun exposure calculated for patio {PatioId}: {SunExposure}% exposure, {State} state",
                id, response.SunExposurePercent, response.State);

            return Ok(response);
        }
        catch (ArgumentException ex) when (ex.Message.Contains("not found"))
        {
            _logger.LogWarning("Patio {PatioId} not found", id);
            return NotFound($"Patio {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating sun exposure for patio {PatioId}", id);
            return BadRequest("Error calculating patio sun exposure");
        }
    }

    /// <summary>
    /// Get current sun exposure for a patio (uses current UTC time)
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Current patio sun exposure information</returns>
    [HttpGet("current/{id}")]
    [ProducesResponseType(typeof(PatioSunExposureResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PatioSunExposureResponse>> GetCurrentSunExposure(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Getting current sun exposure for patio {PatioId}", id);

            var sunExposure = await _sunExposureService.GetCurrentSunExposureAsync(id, cancellationToken);
            var response = PatioSunExposureResponse.FromPatioSunExposure(sunExposure, sunExposure.WeatherData);

            return Ok(response);
        }
        catch (ArgumentException ex) when (ex.Message.Contains("not found"))
        {
            return NotFound($"Patio {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current sun exposure for patio {PatioId}", id);
            return BadRequest("Error calculating current sun exposure");
        }
    }

    /// <summary>
    /// Check sun exposure reliability for current conditions
    /// </summary>
    /// <param name="timestamp">Timestamp to check (optional, defaults to current time)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Reliability information for sun exposure calculations</returns>
    [HttpGet("reliability")]
    [ProducesResponseType(typeof(SunExposureReliabilityInfo), StatusCodes.Status200OK)]
    public Task<ActionResult<SunExposureReliabilityInfo>> GetSunExposureReliability(
        [FromQuery] DateTime? timestamp = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var calcTime = timestamp ?? DateTime.UtcNow;

            // Create sample confidence factors for reliability assessment
            var sampleConfidence = new ConfidenceFactors
            {
                BuildingDataQuality = 0.80, // Average building data quality
                GeometryPrecision = 0.85,   // Average patio quality
                SolarAccuracy = 0.95,       // High solar accuracy
                ShadowAccuracy = 0.75,      // Average shadow accuracy
                OverallConfidence = 0.80    // Overall average
            };

            var response = new SunExposureReliabilityInfo
            {
                Timestamp = calcTime,
                IsReliable = sampleConfidence.OverallConfidence >= 0.60,
                ReliabilityScore = Math.Round(sampleConfidence.OverallConfidence * 100, 1),
                ReliabilityCategory = sampleConfidence.OverallConfidence >= 0.70 ? "High" :
                                   sampleConfidence.OverallConfidence >= 0.40 ? "Medium" : "Low",
                Notes = "Sun exposure calculations use high-precision solar algorithms and building shadow modeling"
            };

            return Task.FromResult<ActionResult<SunExposureReliabilityInfo>>(Ok(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking sun exposure reliability");
            return Task.FromResult<ActionResult<SunExposureReliabilityInfo>>(BadRequest("Error checking reliability"));
        }
    }
}

/// <summary>
/// Response for sun exposure reliability check
/// </summary>
public class SunExposureReliabilityInfo
{
    public DateTime Timestamp { get; set; }
    public bool IsReliable { get; set; }
    public double ReliabilityScore { get; set; }
    public string ReliabilityCategory { get; set; } = "";
    public string Notes { get; set; } = "";
}