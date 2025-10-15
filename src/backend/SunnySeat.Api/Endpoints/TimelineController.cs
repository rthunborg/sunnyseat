using Microsoft.AspNetCore.Mvc;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Responses;
using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// API controller for sun exposure timelines and forecasts
/// </summary>
[ApiController]
[Route("api/timeline")]
[Produces("application/json")]
public class TimelineController : ControllerBase
{
    private readonly ISunTimelineService _timelineService;
    private readonly ILogger<TimelineController> _logger;

    public TimelineController(
        ISunTimelineService timelineService,
        ILogger<TimelineController> logger)
    {
        _timelineService = timelineService;
        _logger = logger;
    }

    /// <summary>
    /// Get sun exposure timeline for a specific patio
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="start">Start time (UTC). If not provided, defaults to current time</param>
    /// <param name="end">End time (UTC). If not provided, defaults to 12 hours from start</param>
    /// <param name="resolutionMinutes">Data point resolution in minutes (default: 10)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Complete sun exposure timeline with confidence data</returns>
    [HttpGet("patio/{id}")]
    [ProducesResponseType(typeof(SunExposureTimelineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SunExposureTimelineResponse>> GetPatioTimeline(
        int id,
        [FromQuery] DateTime? start = null,
        [FromQuery] DateTime? end = null,
        [FromQuery][Range(1, 60)] int resolutionMinutes = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = start ?? DateTime.UtcNow;
            var endTime = end ?? startTime.AddHours(12); // Default 12-hour timeline
            var resolution = TimeSpan.FromMinutes(resolutionMinutes);

            _logger.LogInformation("Generating timeline for patio {PatioId} from {StartTime} to {EndTime}",
                id, startTime, endTime);

            var timeline = await _timelineService.GenerateTimelineAsync(
                id, startTime, endTime, resolution, cancellationToken);

            var response = SunExposureTimelineResponse.FromSunExposureTimeline(timeline);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid timeline request for patio {PatioId}", id);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating timeline for patio {PatioId}", id);
            return StatusCode(500, "Internal server error generating timeline");
        }
    }

    /// <summary>
    /// Get today's sun exposure timeline for a patio
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Today's complete timeline from sunrise to sunset with weather-enhanced confidence</returns>
    [HttpGet("patio/{id}/today")]
    [ProducesResponseType(typeof(SunExposureTimelineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SunExposureTimelineResponse>> GetTodayTimeline(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Generating today's timeline for patio {PatioId}", id);

            var timeline = await _timelineService.GetTodayTimelineAsync(id, cancellationToken);
            var response = SunExposureTimelineResponse.FromSunExposureTimeline(timeline);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating today's timeline for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get tomorrow's sun exposure timeline for a patio
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Tomorrow's complete timeline with forecast weather data and confidence</returns>
    [HttpGet("patio/{id}/tomorrow")]
    [ProducesResponseType(typeof(SunExposureTimelineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SunExposureTimelineResponse>> GetTomorrowTimeline(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Generating tomorrow's timeline for patio {PatioId}", id);

            var timeline = await _timelineService.GetTomorrowTimelineAsync(id, cancellationToken);
            var response = SunExposureTimelineResponse.FromSunExposureTimeline(timeline);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating tomorrow's timeline for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get next 12 hours timeline for a patio
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Timeline for the next 12 hours with weather-enhanced predictions</returns>
    [HttpGet("patio/{id}/next12h")]
    [ProducesResponseType(typeof(SunExposureTimelineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SunExposureTimelineResponse>> GetNext12HoursTimeline(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Generating next 12 hours timeline for patio {PatioId}", id);

            var timeline = await _timelineService.GetNext12HoursTimelineAsync(id, cancellationToken);
            var response = SunExposureTimelineResponse.FromSunExposureTimeline(timeline);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating next 12 hours timeline for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get the best sun windows for a patio within a time range
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="start">Search start time (UTC). If not provided, defaults to current time</param>
    /// <param name="end">Search end time (UTC). If not provided, defaults to 24 hours from start</param>
    /// <param name="maxWindows">Maximum number of windows to return (default: 3)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Best sun windows sorted by quality</returns>
    [HttpGet("patio/{id}/windows")]
    [ProducesResponseType(typeof(IEnumerable<SunWindow>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<SunWindow>>> GetBestSunWindows(
        int id,
        [FromQuery] DateTime? start = null,
        [FromQuery] DateTime? end = null,
        [FromQuery][Range(1, 10)] int maxWindows = 3,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = start ?? DateTime.UtcNow;
            var endTime = end ?? startTime.AddHours(24);

            _logger.LogInformation("Finding best sun windows for patio {PatioId} from {StartTime} to {EndTime}",
                id, startTime, endTime);

            var windows = await _timelineService.GetBestSunWindowsAsync(
                id, startTime, endTime, maxWindows, cancellationToken);

            return Ok(windows);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding sun windows for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get today's recommended sun windows for a patio
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Today's recommended sun windows</returns>
    [HttpGet("patio/{id}/recommendations")]
    [ProducesResponseType(typeof(IEnumerable<SunWindow>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<SunWindow>>> GetTodayRecommendations(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Getting today's recommendations for patio {PatioId}", id);

            var windows = await _timelineService.GetTodayRecommendationsAsync(id, cancellationToken);
            return Ok(windows);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendations for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Generate timelines for multiple patios (batch operation)
    /// </summary>
    /// <param name="request">Batch timeline request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of sun exposure timelines</returns>
    [HttpPost("batch")]
    [ProducesResponseType(typeof(IEnumerable<SunExposureTimeline>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<SunExposureTimeline>>> GetBatchTimelines(
        [FromBody] BatchTimelineRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request?.PatioIds == null || !request.PatioIds.Any())
                return BadRequest("PatioIds are required");

            if (request.PatioIds.Count() > 20)
                return BadRequest("Maximum 20 patios allowed in batch request");

            _logger.LogInformation("Generating batch timelines for {PatioCount} patios",
                request.PatioIds.Count());

            var timelines = await _timelineService.GenerateBatchTimelinesAsync(
                request.PatioIds,
                request.StartTime,
                request.EndTime,
                TimeSpan.FromMinutes(request.ResolutionMinutes),
                cancellationToken);

            return Ok(timelines);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating batch timelines");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Compare sun exposure timelines between multiple patios
    /// </summary>
    /// <param name="patioIds">Comma-separated patio IDs (e.g., "1,2,3")</param>
    /// <param name="start">Comparison start time (UTC)</param>
    /// <param name="end">Comparison end time (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Timeline comparison with recommendations</returns>
    [HttpGet("compare")]
    [ProducesResponseType(typeof(TimelineComparison), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TimelineComparison>> CompareTimelines(
        [FromQuery][Required] string patioIds,
        [FromQuery][Required] DateTime start,
        [FromQuery][Required] DateTime end,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(patioIds))
                return BadRequest("PatioIds parameter is required");

            var ids = patioIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                             .Select(id => int.TryParse(id.Trim(), out var patioId) ? patioId : (int?)null)
                             .Where(id => id.HasValue)
                             .Select(id => id!.Value)
                             .ToList();

            if (!ids.Any())
                return BadRequest("Valid patio IDs are required");

            if (ids.Count > 10)
                return BadRequest("Maximum 10 patios allowed for comparison");

            _logger.LogInformation("Comparing timelines for {PatioCount} patios from {StartTime} to {EndTime}",
                ids.Count, start, end);

            var comparison = await _timelineService.CompareVenueTimelinesAsync(
                ids, start, end, cancellationToken);

            return Ok(comparison);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing timelines");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Find the best patio among a collection for a specific time range
    /// </summary>
    /// <param name="patioIds">Comma-separated patio IDs to evaluate</param>
    /// <param name="start">Evaluation start time (UTC)</param>
    /// <param name="end">Evaluation end time (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Recommended patio with reasoning</returns>
    [HttpGet("best")]
    [ProducesResponseType(typeof(RecommendedTime), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecommendedTime>> FindBestPatio(
        [FromQuery][Required] string patioIds,
        [FromQuery][Required] DateTime start,
        [FromQuery][Required] DateTime end,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(patioIds))
                return BadRequest("PatioIds parameter is required");

            var ids = patioIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                             .Select(id => int.TryParse(id.Trim(), out var patioId) ? patioId : (int?)null)
                             .Where(id => id.HasValue)
                             .Select(id => id!.Value)
                             .ToList();

            if (!ids.Any())
                return BadRequest("Valid patio IDs are required");

            _logger.LogInformation("Finding best patio among {PatioCount} patios for time range {StartTime} to {EndTime}",
                ids.Count, start, end);

            var bestPatio = await _timelineService.FindBestPatioAsync(ids, start, end, cancellationToken);
            return Ok(bestPatio);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding best patio");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get timeline summary statistics
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="start">Timeline start time (UTC)</param>
    /// <param name="end">Timeline end time (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Timeline summary statistics</returns>
    [HttpGet("patio/{id}/summary")]
    [ProducesResponseType(typeof(SunExposureTimelineSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SunExposureTimelineSummary>> GetTimelineSummary(
        int id,
        [FromQuery][Required] DateTime start,
        [FromQuery][Required] DateTime end,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Generating timeline summary for patio {PatioId} from {StartTime} to {EndTime}",
                id, start, end);

            var timeline = await _timelineService.GenerateTimelineAsync(
                id, start, end, TimeSpan.FromMinutes(10), cancellationToken);

            var summary = _timelineService.GenerateTimelineSummary(timeline);
            return Ok(summary);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating timeline summary for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Validate timeline data quality and completeness
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="start">Timeline start time (UTC)</param>
    /// <param name="end">Timeline end time (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Timeline quality assessment</returns>
    [HttpGet("patio/{id}/quality")]
    [ProducesResponseType(typeof(TimelineQualityAssessment), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TimelineQualityAssessment>> ValidateTimelineQuality(
        int id,
        [FromQuery][Required] DateTime start,
        [FromQuery][Required] DateTime end,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Validating timeline quality for patio {PatioId} from {StartTime} to {EndTime}",
                id, start, end);

            var timeline = await _timelineService.GenerateTimelineAsync(
                id, start, end, TimeSpan.FromMinutes(10), cancellationToken);

            var quality = await _timelineService.ValidateTimelineQualityAsync(timeline);
            return Ok(quality);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating timeline quality for patio {PatioId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get timeline service performance metrics
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Performance metrics for monitoring</returns>
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(TimelinePerformanceMetrics), StatusCodes.Status200OK)]
    public async Task<ActionResult<TimelinePerformanceMetrics>> GetPerformanceMetrics(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _timelineService.GetPerformanceMetricsAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting timeline performance metrics");
            return StatusCode(500, "Internal server error");
        }
    }
}

/// <summary>
/// Request model for batch timeline generation
/// </summary>
public class BatchTimelineRequest
{
    /// <summary>
    /// Collection of patio IDs to generate timelines for
    /// </summary>
    [Required]
    public IEnumerable<int> PatioIds { get; set; } = new List<int>();

    /// <summary>
    /// Timeline start time (UTC)
    /// </summary>
    [Required]
    public DateTime StartTime { get; set; }

    /// <summary>
    /// Timeline end time (UTC)
    /// </summary>
    [Required]
    public DateTime EndTime { get; set; }

    /// <summary>
    /// Data point resolution in minutes (default: 10)
    /// </summary>
    [Range(1, 60)]
    public int ResolutionMinutes { get; set; } = 10;
}