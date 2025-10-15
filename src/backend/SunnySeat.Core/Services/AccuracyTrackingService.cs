using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service implementation for accuracy tracking and feedback operations
/// </summary>
public class AccuracyTrackingService : IAccuracyTrackingService
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IPatioRepository _patioRepository;
    private readonly IVenueRepository _venueRepository;
    private readonly ISunExposureService _sunExposureService;
    private const int MaxFeedbackPerIpPerHour = 20;
    private const int DuplicateFeedbackWindowMinutes = 5;

    public AccuracyTrackingService(
        IFeedbackRepository feedbackRepository,
        IPatioRepository patioRepository,
        IVenueRepository venueRepository,
        ISunExposureService sunExposureService)
    {
        _feedbackRepository = feedbackRepository;
        _patioRepository = patioRepository;
        _venueRepository = venueRepository;
        _sunExposureService = sunExposureService;
    }

    public async Task<FeedbackResponse> SubmitFeedbackAsync(SubmitFeedbackRequest request, string ipAddress, CancellationToken cancellationToken = default)
    {
        // Validate patio exists
        var patio = await _patioRepository.GetByIdAsync(request.PatioId, cancellationToken);
        if (patio == null)
            throw new ArgumentException($"Patio with ID {request.PatioId} not found");

        // Validate submission (spam prevention)
        var isValid = await ValidateFeedbackSubmissionAsync(request.PatioId, request.Timestamp, ipAddress, cancellationToken);
        if (!isValid)
            throw new InvalidOperationException("Feedback submission validation failed. Please wait before submitting more feedback.");

        // Get the predicted sun exposure at the time if not provided
        string predictedState = "unknown";
        double confidence = request.PredictedConfidence ?? 0.0;

        if (request.PredictedSunExposure.HasValue)
        {
            // Map sun exposure percentage to state
            if (request.PredictedSunExposure.Value >= 70)
                predictedState = "sunny";
            else if (request.PredictedSunExposure.Value >= 30)
                predictedState = "partial";
            else
                predictedState = "shaded";
        }

        // Create feedback entity
        var feedback = new Feedback
        {
            PatioId = request.PatioId,
            VenueId = patio.VenueId,
            UserTimestamp = request.Timestamp,
            PredictedState = predictedState,
            ConfidenceAtPrediction = confidence,
            WasSunny = request.WasSunny,
            BinnedTimestamp = RoundToFiveMinutes(request.Timestamp),
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        // Save feedback
        var savedFeedback = await _feedbackRepository.CreateAsync(feedback, cancellationToken);

        // Load related entities for response
        savedFeedback.Patio = patio;
        if (patio.Venue != null)
        {
            savedFeedback.Venue = patio.Venue;
        }
        else
        {
            var venue = await _venueRepository.GetByIdAsync(patio.VenueId, cancellationToken);
            if (venue != null)
                savedFeedback.Venue = venue;
        }

        return FeedbackResponse.FromFeedback(savedFeedback);
    }

    public async Task<bool> ValidateFeedbackSubmissionAsync(int patioId, DateTime timestamp, string ipAddress, CancellationToken cancellationToken = default)
    {
        // Check rate limiting - max submissions per IP per hour
        var recentCount = await _feedbackRepository.CountRecentFeedbackByIpAsync(ipAddress, TimeSpan.FromHours(1), cancellationToken);
        if (recentCount >= MaxFeedbackPerIpPerHour)
            return false;

        // Check for duplicate submissions - same patio, timestamp, and IP within time window
        var hasDuplicate = await _feedbackRepository.HasRecentDuplicateFeedbackAsync(
            patioId,
            timestamp,
            ipAddress,
            TimeSpan.FromMinutes(DuplicateFeedbackWindowMinutes),
            cancellationToken);

        return !hasDuplicate;
    }

    public async Task<IEnumerable<FeedbackResponse>> GetFeedbackAsync(QueryFeedbackRequest request, CancellationToken cancellationToken = default)
    {
        IEnumerable<Feedback> feedbackList;

        // Apply filters based on request
        if (request.VenueId.HasValue && request.StartDate.HasValue && request.EndDate.HasValue)
        {
            feedbackList = await _feedbackRepository.GetByVenueAndDateRangeAsync(
                request.VenueId.Value,
                request.StartDate.Value,
                request.EndDate.Value,
                cancellationToken);
        }
        else if (request.StartDate.HasValue && request.EndDate.HasValue)
        {
            feedbackList = await _feedbackRepository.GetByDateRangeAsync(
                request.StartDate.Value,
                request.EndDate.Value,
                cancellationToken);
        }
        else if (request.PatioId.HasValue)
        {
            feedbackList = await _feedbackRepository.GetByPatioIdAsync(request.PatioId.Value, cancellationToken);
        }
        else if (request.VenueId.HasValue)
        {
            feedbackList = await _feedbackRepository.GetByVenueIdAsync(request.VenueId.Value, cancellationToken);
        }
        else
        {
            feedbackList = await _feedbackRepository.GetAllAsync(cancellationToken);
        }

        // Apply pagination
        var paginatedList = feedbackList
            .Skip(request.Offset)
            .Take(request.Limit);

        return paginatedList.Select(FeedbackResponse.FromFeedback);
    }

    public async Task<FeedbackResponse?> GetFeedbackByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var feedback = await _feedbackRepository.GetByIdAsync(id, cancellationToken);
        return feedback != null ? FeedbackResponse.FromFeedback(feedback) : null;
    }

    public async Task<AccuracyMetricsResponse> GetAccuracyMetricsAsync(DateTime startDate, DateTime endDate, int? venueId = null, CancellationToken cancellationToken = default)
    {
        int totalFeedback;
        int correctPredictions;
        double accuracyRate;
        string? venueName = null;

        if (venueId.HasValue)
        {
            var venue = await _venueRepository.GetByIdAsync(venueId.Value, cancellationToken);
            venueName = venue?.Name;

            totalFeedback = await _feedbackRepository.GetByVenueAndDateRangeAsync(venueId.Value, startDate, endDate, cancellationToken)
                .ContinueWith(t => t.Result.Count(), cancellationToken);

            accuracyRate = await _feedbackRepository.CalculateAccuracyRateByVenueAsync(venueId.Value, startDate, endDate, cancellationToken);
            correctPredictions = totalFeedback > 0 ? (int)Math.Round(totalFeedback * (accuracyRate / 100.0)) : 0;
        }
        else
        {
            totalFeedback = await _feedbackRepository.CountByDateRangeAsync(startDate, endDate, cancellationToken);
            correctPredictions = await _feedbackRepository.CountCorrectPredictionsAsync(startDate, endDate, cancellationToken);
            accuracyRate = await _feedbackRepository.CalculateAccuracyRateAsync(startDate, endDate, cancellationToken);
        }

        return new AccuracyMetricsResponse
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalFeedback = totalFeedback,
            CorrectPredictions = correctPredictions,
            AccuracyRate = Math.Round(accuracyRate, 2),
            VenueId = venueId,
            VenueName = venueName
        };
    }

    public async Task<IEnumerable<AccuracyTrendResponse>> GetAccuracyTrendAsync(DateTime startDate, DateTime endDate, int? venueId = null, CancellationToken cancellationToken = default)
    {
        var trendData = new List<AccuracyTrendResponse>();
        var currentDate = startDate.Date;

        while (currentDate <= endDate.Date)
        {
            var dayStart = currentDate;
            var dayEnd = currentDate.AddDays(1).AddTicks(-1);

            var metrics = await GetAccuracyMetricsAsync(dayStart, dayEnd, venueId, cancellationToken);

            trendData.Add(new AccuracyTrendResponse
            {
                Date = currentDate,
                AccuracyRate = metrics.AccuracyRate,
                FeedbackCount = metrics.TotalFeedback
            });

            currentDate = currentDate.AddDays(1);
        }

        return trendData;
    }

    public async Task<IEnumerable<ProblematicVenueResponse>> GetProblematicVenuesAsync(double thresholdAccuracy = 80.0, int minFeedbackCount = 10, CancellationToken cancellationToken = default)
    {
        var venues = await _venueRepository.GetAllAsync(cancellationToken);
        var problematicVenues = new List<ProblematicVenueResponse>();
        var endDate = DateTime.UtcNow;
        var startDate = endDate.AddDays(-14); // 14-day rolling window

        foreach (var venue in venues)
        {
            var metrics = await GetAccuracyMetricsAsync(startDate, endDate, venue.Id, cancellationToken);

            if (metrics.TotalFeedback >= minFeedbackCount && metrics.AccuracyRate < thresholdAccuracy)
            {
                // Calculate days below threshold
                var daysBelowThreshold = await CalculateDaysBelowThresholdAsync(venue.Id, thresholdAccuracy, cancellationToken);

                problematicVenues.Add(new ProblematicVenueResponse
                {
                    VenueId = venue.Id,
                    VenueName = venue.Name,
                    AccuracyRate = metrics.AccuracyRate,
                    FeedbackCount = metrics.TotalFeedback,
                    DaysBelowThreshold = daysBelowThreshold
                });
            }
        }

        return problematicVenues.OrderBy(v => v.AccuracyRate);
    }

    public async Task<bool> CheckAccuracyAlertThresholdAsync(double thresholdAccuracy = 80.0, int consecutiveDays = 3, CancellationToken cancellationToken = default)
    {
        var endDate = DateTime.UtcNow.Date;
        var consecutiveCount = 0;

        // Check last 7 days for consecutive days below threshold
        for (int i = 0; i < 7; i++)
        {
            var dayStart = endDate.AddDays(-i);
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);

            var metrics = await GetAccuracyMetricsAsync(dayStart, dayEnd, null, cancellationToken);

            // Only count days with sufficient feedback
            if (metrics.TotalFeedback >= 5)
            {
                if (metrics.AccuracyRate < thresholdAccuracy)
                {
                    consecutiveCount++;
                    if (consecutiveCount >= consecutiveDays)
                        return true;
                }
                else
                {
                    consecutiveCount = 0; // Reset counter
                }
            }
        }

        return false;
    }

    private async Task<int> CalculateDaysBelowThresholdAsync(int venueId, double thresholdAccuracy, CancellationToken cancellationToken)
    {
        var endDate = DateTime.UtcNow.Date;
        var daysBelowThreshold = 0;

        // Check last 14 days
        for (int i = 0; i < 14; i++)
        {
            var dayStart = endDate.AddDays(-i);
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);

            var metrics = await GetAccuracyMetricsAsync(dayStart, dayEnd, venueId, cancellationToken);

            // Only count days with sufficient feedback
            if (metrics.TotalFeedback >= 3 && metrics.AccuracyRate < thresholdAccuracy)
            {
                daysBelowThreshold++;
            }
        }

        return daysBelowThreshold;
    }

    private static DateTime RoundToFiveMinutes(DateTime timestamp)
    {
        var minutes = timestamp.Minute;
        var roundedMinutes = (minutes / 5) * 5;
        return new DateTime(timestamp.Year, timestamp.Month, timestamp.Day, timestamp.Hour, roundedMinutes, 0, DateTimeKind.Utc);
    }
}
