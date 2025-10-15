namespace SunnySeat.Core.Entities;

/// <summary>
/// Data quality metrics for venue and patio validation
/// </summary>
public class VenueQualityMetrics
{
    public int Id { get; set; }
    
    /// <summary>
    /// Reference to the venue being assessed
    /// </summary>
    public int VenueId { get; set; }
    public Venue Venue { get; set; } = null!;
    
    /// <summary>
    /// Overall quality score for the venue (0.0-1.0)
    /// </summary>
    public double OverallQuality { get; set; } = 0.0;
    
    /// <summary>
    /// Whether the venue has complete metadata (name, address, location)
    /// </summary>
    public bool HasCompleteMetadata { get; set; } = false;
    
    /// <summary>
    /// Whether the venue location appears accurate
    /// </summary>
    public bool HasAccurateLocation { get; set; } = false;
    
    /// <summary>
    /// Whether the venue has high-quality patio polygons
    /// </summary>
    public bool HasQualityPatios { get; set; } = false;
    
    /// <summary>
    /// Number of patios associated with this venue
    /// </summary>
    public int PatioCount { get; set; } = 0;
    
    /// <summary>
    /// Average quality score of all patios for this venue
    /// </summary>
    public double AveragePatioQuality { get; set; } = 0.0;
    
    /// <summary>
    /// List of validation issues found (JSON array of strings)
    /// </summary>
    public List<string> ValidationIssues { get; set; } = new();
    
    /// <summary>
    /// When this quality assessment was performed
    /// </summary>
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this quality metrics record was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}