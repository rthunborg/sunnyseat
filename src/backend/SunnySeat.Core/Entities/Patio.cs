using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents a specific patio area within a venue
/// </summary>
public class Patio
{
    public int Id { get; set; }

    /// <summary>
    /// Reference to the parent venue
    /// </summary>
    public int VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    /// <summary>
    /// Name or identifier for this patio (e.g., "Main Terrace", "Side Garden")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Polygon geometry representing the patio area (EPSG:4326)
    /// </summary>
    public Polygon Geometry { get; set; } = null!;

    /// <summary>
    /// Height of the patio in meters (optional)
    /// </summary>
    public double? HeightM { get; set; }

    /// <summary>
    /// Source of height information: surveyed, osm, heuristic
    /// </summary>
    public HeightSource HeightSource { get; set; } = HeightSource.Heuristic;

    /// <summary>
    /// Data quality score for the polygon geometry (0.0 to 1.0)
    /// </summary>
    public double PolygonQuality { get; set; } = 0.5;

    /// <summary>
    /// Whether this patio needs review by an admin
    /// </summary>
    public bool ReviewNeeded { get; set; } = true;

    /// <summary>
    /// Optional patio orientation (north, south, east, west, etc.)
    /// </summary>
    public string? Orientation { get; set; }

    /// <summary>
    /// Optional notes about the patio features, quality, etc.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Timestamp when this patio was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when this patio was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Collection of sun windows for this patio
    /// </summary>
    public ICollection<SunWindow> SunWindows { get; set; } = new List<SunWindow>();

    /// <summary>
    /// Collection of feedback entries for this patio
    /// </summary>
    public ICollection<Feedback> FeedbackEntries { get; set; } = new List<Feedback>();
}

/// <summary>
/// Enumeration of height data sources for quality tracking
/// </summary>
public enum HeightSource
{
    Surveyed = 0,        // Professionally surveyed measurements
    Osm = 1,             // OpenStreetMap building height data
    Heuristic = 2,       // Estimated/calculated values
    AdminOverride = 3    // Admin-provided override values
}