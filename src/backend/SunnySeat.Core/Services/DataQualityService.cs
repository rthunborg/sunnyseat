using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Validation;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service implementation for venue and patio data quality validation
/// </summary>
public class DataQualityService : IDataQualityService
{
    private readonly IVenueRepository _venueRepository;
    private readonly IPatioRepository _patioRepository;

    public DataQualityService(IVenueRepository venueRepository, IPatioRepository patioRepository)
    {
        _venueRepository = venueRepository;
        _patioRepository = patioRepository;
    }

    public async Task<bool> ValidateVenueAsync(Venue venue)
    {
        var issues = await GetVenueValidationIssuesAsync(venue);
        return !issues.Any();
    }

    public async Task<List<string>> GetVenueValidationIssuesAsync(Venue venue)
    {
        var issues = VenueValidator.GetValidationIssues(venue);
        
        // Add async validations if needed
        // For example, check for duplicate venues at same location
        if (venue.Location != null)
        {
            var nearbyVenues = await _venueRepository.GetVenuesNearPointAsync(venue.Location, 0.1); // 100m radius
            var duplicates = nearbyVenues.Where(v => v.Id != venue.Id && 
                                                   string.Equals(v.Name, venue.Name, StringComparison.OrdinalIgnoreCase));
            if (duplicates.Any())
            {
                issues.Add("Potential duplicate venue found at similar location");
            }
        }
        
        return issues;
    }

    public async Task<double> CalculateVenueQualityScoreAsync(Venue venue)
    {
        // Load patios if not already loaded
        if (venue.Patios == null || !venue.Patios.Any())
        {
            var patios = await _patioRepository.GetByVenueIdAsync(venue.Id);
            venue.Patios = patios.ToList();
        }
        
        return VenueValidator.CalculateQualityScore(venue);
    }

    public async Task<bool> ValidatePatioAsync(Patio patio)
    {
        var issues = await GetPatioValidationIssuesAsync(patio);
        return !issues.Any();
    }

    public async Task<List<string>> GetPatioValidationIssuesAsync(Patio patio)
    {
        var issues = PatioValidator.GetValidationIssues(patio);
        
        // Add async validations if needed
        // For example, check for overlapping patios
        if (patio.Geometry != null)
        {
            var nearbyPatios = await _patioRepository.GetPatiosNearPointAsync(patio.Geometry.Centroid, 0.1);
            var overlapping = nearbyPatios.Where(p => p.Id != patio.Id && 
                                                     p.VenueId != patio.VenueId &&
                                                     p.Geometry.Overlaps(patio.Geometry));
            if (overlapping.Any())
            {
                issues.Add("Patio geometry overlaps with patios from other venues");
            }
        }
        
        return issues;
    }

    public async Task<double> CalculatePatioQualityScoreAsync(Patio patio)
    {
        return PatioValidator.CalculateQualityScore(patio);
    }

    public async Task<IEnumerable<VenueQualityMetrics>> ValidateAllVenuesAsync(CancellationToken cancellationToken = default)
    {
        var venues = await _venueRepository.GetAllWithPatiosAsync(cancellationToken);
        var metrics = new List<VenueQualityMetrics>();
        
        foreach (var venue in venues)
        {
            var venueMetrics = await ValidateVenueDetailedAsync(venue.Id, cancellationToken);
            metrics.Add(venueMetrics);
        }
        
        return metrics;
    }

    public async Task<VenueQualityMetrics> ValidateVenueDetailedAsync(int venueId, CancellationToken cancellationToken = default)
    {
        var venue = await _venueRepository.GetByIdWithPatiosAsync(venueId, cancellationToken);
        if (venue == null)
            throw new ArgumentException($"Venue with ID {venueId} not found");

        var issues = await GetVenueValidationIssuesAsync(venue);
        var qualityScore = await CalculateVenueQualityScoreAsync(venue);
        
        var metrics = new VenueQualityMetrics
        {
            VenueId = venue.Id,
            Venue = venue,
            OverallQuality = qualityScore,
            HasCompleteMetadata = VenueValidator.HasValidName(venue) && 
                                  VenueValidator.HasValidAddress(venue) && 
                                  VenueValidator.HasValidLocation(venue),
            HasAccurateLocation = VenueValidator.HasValidLocation(venue),
            HasQualityPatios = VenueValidator.HasQualityPatios(venue),
            PatioCount = venue.Patios?.Count ?? 0,
            AveragePatioQuality = venue.Patios?.Any() == true ? venue.Patios.Average(p => p.PolygonQuality) : 0.0,
            ValidationIssues = issues,
            AssessedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        return metrics;
    }

    public async Task<Dictionary<string, object>> GetQualityMetricsAsync(CancellationToken cancellationToken = default)
    {
        var totalVenues = await _venueRepository.CountAsync(cancellationToken);
        var totalPatios = await _patioRepository.CountAsync(cancellationToken);
        var unmappedVenues = await _venueRepository.GetUnmappedVenuesAsync(cancellationToken);
        var patiosNeedingReview = await _patioRepository.CountPatiosRequiringReviewAsync(cancellationToken);
        var averagePatioQuality = totalPatios > 0 ? await _patioRepository.GetAverageQualityScoreAsync(cancellationToken) : 0.0;
        
        // Get type distribution
        var typeDistribution = new Dictionary<string, int>();
        foreach (VenueType type in Enum.GetValues<VenueType>())
        {
            var count = await _venueRepository.CountByTypeAsync(type, cancellationToken);
            typeDistribution[type.ToString()] = count;
        }
        
        return new Dictionary<string, object>
        {
            ["totalVenues"] = totalVenues,
            ["totalPatios"] = totalPatios,
            ["mappedVenues"] = totalVenues - unmappedVenues.Count(),
            ["unmappedVenues"] = unmappedVenues.Count(),
            ["patiosNeedingReview"] = patiosNeedingReview,
            ["averagePatioQuality"] = Math.Round(averagePatioQuality, 2),
            ["venueTypeDistribution"] = typeDistribution,
            ["mappingProgress"] = totalVenues > 0 ? Math.Round((double)(totalVenues - unmappedVenues.Count()) / totalVenues * 100, 1) : 0.0
        };
    }

    public async Task<IEnumerable<Venue>> GetVenuesRequiringReviewAsync(CancellationToken cancellationToken = default)
    {
        var venues = await _venueRepository.GetAllWithPatiosAsync(cancellationToken);
        var venuesNeedingReview = new List<Venue>();
        
        foreach (var venue in venues)
        {
            var issues = await GetVenueValidationIssuesAsync(venue);
            var qualityScore = await CalculateVenueQualityScoreAsync(venue);
            
            if (issues.Any() || qualityScore < 0.5 || !venue.IsMapped)
            {
                venuesNeedingReview.Add(venue);
            }
        }
        
        return venuesNeedingReview.OrderBy(v => v.Name);
    }
}