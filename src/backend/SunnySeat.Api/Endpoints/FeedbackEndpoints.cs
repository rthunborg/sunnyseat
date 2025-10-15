using Microsoft.AspNetCore.Mvc;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;
using System.Net;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// Extension methods for mapping feedback and accuracy tracking API endpoints
/// </summary>
public static class FeedbackEndpoints
{
    /// <summary>
    /// Maps feedback and accuracy tracking endpoints to the route group
    /// </summary>
    public static RouteGroupBuilder MapFeedbackApi(this RouteGroupBuilder group)
    {
        // Submit user feedback
        group.MapPost("/", SubmitFeedback)
            .WithName("SubmitFeedback")
            .WithSummary("Submit user feedback on sun prediction accuracy")
            .WithDescription("Allows users to report whether sun predictions were accurate. " +
                           "Limited to 10 requests per minute per IP address.")
            .AllowAnonymous()
            .Produces<FeedbackResponse>(StatusCodes.Status201Created)
            .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces<ProblemDetails>(StatusCodes.Status429TooManyRequests)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        // Get feedback with filtering
        group.MapGet("/", GetFeedback)
            .WithName("GetFeedback")
            .WithSummary("Query feedback data with optional filters")
            .WithDescription("Retrieve feedback entries with optional filtering by date range and venue. Requires authentication.")
            .RequireAuthorization()
            .Produces<IEnumerable<FeedbackResponse>>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status401Unauthorized)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        // Get feedback by ID
        group.MapGet("/{id:int}", GetFeedbackById)
            .WithName("GetFeedbackById")
            .WithSummary("Get a specific feedback entry by ID")
            .WithDescription("Retrieve detailed information about a specific feedback entry. Requires authentication.")
            .RequireAuthorization()
            .Produces<FeedbackResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status401Unauthorized)
            .Produces<ProblemDetails>(StatusCodes.Status404NotFound)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        // Get accuracy metrics
        group.MapGet("/metrics", GetAccuracyMetrics)
            .WithName("GetAccuracyMetrics")
            .WithSummary("Get accuracy metrics for a date range")
            .WithDescription("Calculate aggregated accuracy metrics based on user feedback. Requires authentication.")
            .RequireAuthorization()
            .Produces<AccuracyMetricsResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status401Unauthorized)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        // Get accuracy trend
        group.MapGet("/metrics/trend", GetAccuracyTrend)
            .WithName("GetAccuracyTrend")
            .WithSummary("Get accuracy trend over time")
            .WithDescription("Retrieve daily accuracy metrics to identify trends. Requires authentication.")
            .RequireAuthorization()
            .Produces<AccuracyTrendResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status401Unauthorized)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        // Get problematic venues
        group.MapGet("/metrics/problematic-venues", GetProblematicVenues)
            .WithName("GetProblematicVenues")
            .WithSummary("Get venues with low accuracy rates")
            .WithDescription("Identify venues that consistently have low accuracy scores. Requires authentication.")
            .RequireAuthorization()
            .Produces<IEnumerable<ProblematicVenueResponse>>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status401Unauthorized)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        // Check alert status
        group.MapGet("/alerts/status", CheckAlertStatus)
            .WithName("CheckAlertStatus")
            .WithSummary("Check if accuracy alerts should be triggered")
            .WithDescription("Evaluate current accuracy metrics against alert thresholds. Requires authentication.")
            .RequireAuthorization()
            .Produces(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status401Unauthorized)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        return group;
    }

    private static async Task<IResult> SubmitFeedback(
        [FromBody] SubmitFeedbackRequest request,
        IAccuracyTrackingService accuracyTrackingService,
        HttpContext httpContext,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get user's IP address
            var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            // Submit feedback
            var result = await accuracyTrackingService.SubmitFeedbackAsync(request, ipAddress, cancellationToken);

            return Results.Created($"/api/feedback/{result.Id}", result);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(
                title: "Too many requests",
                detail: ex.Message,
                statusCode: 429); // Too Many Requests
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error submitting feedback",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> GetFeedback(
        IAccuracyTrackingService accuracyTrackingService,
        int? venueId = null,
        int? patioId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int limit = 100,
        int offset = 0,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new QueryFeedbackRequest
            {
                VenueId = venueId,
                PatioId = patioId,
                StartDate = startDate,
                EndDate = endDate,
                Limit = limit,
                Offset = offset
            };

            var feedback = await accuracyTrackingService.GetFeedbackAsync(request, cancellationToken);

            return Results.Ok(feedback);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error retrieving feedback",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> GetFeedbackById(
        int id,
        IAccuracyTrackingService accuracyTrackingService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var feedback = await accuracyTrackingService.GetFeedbackByIdAsync(id, cancellationToken);

            if (feedback == null)
                return Results.NotFound(new { error = $"Feedback with ID {id} not found" });

            return Results.Ok(feedback);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error retrieving feedback",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> GetAccuracyMetrics(
        IAccuracyTrackingService accuracyTrackingService,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? venueId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Default to last 14 days if no dates provided
            var end = endDate ?? DateTime.UtcNow;
            var start = startDate ?? end.AddDays(-14);

            var metrics = await accuracyTrackingService.GetAccuracyMetricsAsync(start, end, venueId, cancellationToken);

            return Results.Ok(metrics);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error calculating accuracy metrics",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> GetAccuracyTrend(
        IAccuracyTrackingService accuracyTrackingService,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? venueId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Default to last 14 days if no dates provided
            var end = endDate ?? DateTime.UtcNow;
            var start = startDate ?? end.AddDays(-14);

            var trend = await accuracyTrackingService.GetAccuracyTrendAsync(start, end, venueId, cancellationToken);

            return Results.Ok(trend);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error calculating accuracy trend",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> GetProblematicVenues(
        IAccuracyTrackingService accuracyTrackingService,
        double threshold = 80.0,
        int minFeedbackCount = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var venues = await accuracyTrackingService.GetProblematicVenuesAsync(threshold, minFeedbackCount, cancellationToken);

            return Results.Ok(venues);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error identifying problematic venues",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> CheckAlertStatus(
        IAccuracyTrackingService accuracyTrackingService,
        double threshold = 80.0,
        int consecutiveDays = 3,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var shouldAlert = await accuracyTrackingService.CheckAccuracyAlertThresholdAsync(threshold, consecutiveDays, cancellationToken);

            return Results.Ok(new
            {
                shouldAlert = shouldAlert,
                threshold = threshold,
                consecutiveDays = consecutiveDays,
                message = shouldAlert
                    ? $"Accuracy has been below {threshold}% for {consecutiveDays} consecutive days"
                    : "Accuracy is within acceptable range"
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error checking alert status",
                detail: ex.Message,
                statusCode: 500);
        }
    }
}
