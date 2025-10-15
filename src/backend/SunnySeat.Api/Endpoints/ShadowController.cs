using Microsoft.AspNetCore.Mvc;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;
using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// Shadow calculation API endpoints
/// Provides shadow analysis data for patios including single, batch, and timeline calculations
/// </summary>
[ApiController]
[Route("api/shadow")]
[Produces("application/json")]
public class ShadowController : ControllerBase
{
    private readonly IShadowCalculationService _shadowService;
    private readonly ILogger<ShadowController> _logger;

    public ShadowController(
        IShadowCalculationService shadowService,
        ILogger<ShadowController> logger)
    {
        _shadowService = shadowService ?? throw new ArgumentNullException(nameof(shadowService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Get shadow information for a specific patio at given timestamp
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="timestamp">Timestamp for calculation (UTC, optional - defaults to current time)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Patio shadow information</returns>
    /// <response code="200">Shadow information calculated successfully</response>
    /// <response code="404">Patio not found</response>
    /// <response code="400">Invalid input parameters</response>
    /// <response code="500">Internal server error during calculation</response>
    [HttpGet("patio/{id}")]
    [ProducesResponseType(typeof(PatioShadowInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PatioShadowInfo>> GetPatioShadow(
        int id,
        [FromQuery] DateTime? timestamp = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var calcTime = timestamp ?? DateTime.UtcNow;

            // Ensure UTC
            if (calcTime.Kind == DateTimeKind.Unspecified)
            {
                calcTime = DateTime.SpecifyKind(calcTime, DateTimeKind.Utc);
            }
            else if (calcTime.Kind == DateTimeKind.Local)
            {
                calcTime = calcTime.ToUniversalTime();
            }

            _logger.LogDebug("Calculating shadow for patio {PatioId} at {Timestamp}", id, calcTime);

            var shadowInfo = await _shadowService.CalculatePatioShadowAsync(id, calcTime, cancellationToken);

            _logger.LogInformation(
                "Shadow calculated for patio {PatioId}: {ShadowPercent:F1}% shadowed, confidence {Confidence:F2}",
                id, shadowInfo.ShadowedAreaPercent, shadowInfo.Confidence);

            return Ok(shadowInfo);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Patio {PatioId} not found", id);
            return NotFound(new { Message = $"Patio with ID {id} not found" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for shadow calculation");
            return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate shadow for patio {PatioId}", id);
            return StatusCode(500, "Internal server error during shadow calculation");
        }
    }

    /// <summary>
    /// Get shadow information for multiple patios at once (batch operation)
    /// </summary>
    /// <param name="request">Batch shadow request containing patio IDs and timestamp</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Batch shadow response with results for all patios</returns>
    /// <response code="200">Shadow information calculated successfully for all patios</response>
    /// <response code="400">Invalid request parameters (e.g., too many patios, invalid IDs)</response>
    /// <response code="500">Internal server error during calculation</response>
    [HttpPost("patios/batch")]
    [ProducesResponseType(typeof(BatchShadowResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<BatchShadowResponse>> GetBatchPatioShadow(
        [FromBody] BatchShadowRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate batch size
            if (request.PatioIds == null || !request.PatioIds.Any())
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "At least one patio ID must be provided"
                });
            }

            if (request.PatioIds.Count() > 100)
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "Maximum 100 patios allowed per batch request"
                });
            }

            var calcTime = request.Timestamp ?? DateTime.UtcNow;

            // Ensure UTC
            if (calcTime.Kind == DateTimeKind.Unspecified)
            {
                calcTime = DateTime.SpecifyKind(calcTime, DateTimeKind.Utc);
            }
            else if (calcTime.Kind == DateTimeKind.Local)
            {
                calcTime = calcTime.ToUniversalTime();
            }

            _logger.LogDebug("Calculating shadow for {Count} patios at {Timestamp}",
                request.PatioIds.Count(), calcTime);

            var startTime = DateTime.UtcNow;
            var shadowResults = await _shadowService.CalculatePatioBatchShadowAsync(
                request.PatioIds, calcTime, cancellationToken);
            var calculationTimeMs = (DateTime.UtcNow - startTime).TotalMilliseconds;

            var response = new BatchShadowResponse
            {
                Timestamp = calcTime,
                Results = shadowResults.Values.ToList(),
                CalculationTimeMs = calculationTimeMs
            };

            _logger.LogInformation(
                "Batch shadow calculated for {Count} patios in {Duration:F1}ms",
                shadowResults.Count, calculationTimeMs);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for batch shadow calculation");
            return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate batch shadow");
            return StatusCode(500, "Internal server error during batch shadow calculation");
        }
    }

    /// <summary>
    /// Get shadow timeline for a patio over a time period
    /// </summary>
    /// <param name="id">Patio ID</param>
    /// <param name="start">Start time for timeline (UTC)</param>
    /// <param name="end">End time for timeline (UTC)</param>
    /// <param name="intervalMinutes">Interval between data points in minutes (default: 10, range: 1-60)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Shadow timeline data with multiple time points</returns>
    /// <response code="200">Shadow timeline calculated successfully</response>
    /// <response code="404">Patio not found</response>
    /// <response code="400">Invalid parameters (e.g., time range too large, invalid interval)</response>
    /// <response code="500">Internal server error during calculation</response>
    [HttpGet("patio/{id}/timeline")]
    [ProducesResponseType(typeof(ShadowTimeline), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ShadowTimeline>> GetPatioShadowTimeline(
        int id,
        [FromQuery][Required] DateTime start,
        [FromQuery][Required] DateTime end,
        [FromQuery][Range(1, 60)] int intervalMinutes = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Ensure UTC
            if (start.Kind == DateTimeKind.Unspecified)
            {
                start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
            }
            else if (start.Kind == DateTimeKind.Local)
            {
                start = start.ToUniversalTime();
            }

            if (end.Kind == DateTimeKind.Unspecified)
            {
                end = DateTime.SpecifyKind(end, DateTimeKind.Utc);
            }
            else if (end.Kind == DateTimeKind.Local)
            {
                end = end.ToUniversalTime();
            }

            // Validate time range
            if (end <= start)
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "End time must be after start time"
                });
            }

            var timeRange = end - start;
            if (timeRange.TotalHours > 48)
            {
                return BadRequest(new ValidationProblemDetails
                {
                    Detail = "Maximum time range is 48 hours"
                });
            }

            _logger.LogDebug(
                "Calculating shadow timeline for patio {PatioId} from {Start} to {End} with {Interval}min intervals",
                id, start, end, intervalMinutes);

            var interval = TimeSpan.FromMinutes(intervalMinutes);
            var timeline = await _shadowService.CalculatePatioShadowTimelineAsync(
                id, start, end, interval, cancellationToken);

            _logger.LogInformation(
                "Shadow timeline calculated for patio {PatioId}: {PointCount} data points, avg confidence {Confidence:F2}",
                id, timeline.Points.Count(), timeline.AverageConfidence);

            return Ok(timeline);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Patio {PatioId} not found", id);
            return NotFound(new { Message = $"Patio with ID {id} not found" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for shadow timeline calculation");
            return BadRequest(new ValidationProblemDetails { Detail = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate shadow timeline for patio {PatioId}", id);
            return StatusCode(500, "Internal server error during shadow timeline calculation");
        }
    }
}
