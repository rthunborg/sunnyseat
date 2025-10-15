using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents a venue (restaurant, caf�, etc.) that may have outdoor seating
/// </summary>
public class Venue
{
    public int Id { get; set; }

    /// <summary>
    /// Name of the venue (e.g., "Caf� Norrlands", "Restaurant Sj�baren")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Street address of the venue
    /// </summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// Geographic location of the venue (EPSG:4326)
    /// </summary>
    public Point Location { get; set; } = null!;

    /// <summary>
    /// Optional phone number for the venue
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Optional website URL for the venue
    /// </summary>
    public string? Website { get; set; }

    /// <summary>
    /// Type of venue (Restaurant, Cafe, Bar, Hotel, Other)
    /// </summary>
    public VenueType Type { get; set; } = VenueType.Restaurant;

    /// <summary>
    /// Whether this venue has been mapped with patio polygons
    /// </summary>
    public bool IsMapped { get; set; } = false;

    /// <summary>
    /// Optional description or notes about the venue
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this venue is currently active/open
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Timestamp when this venue was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when this venue was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Collection of patios belonging to this venue
    /// </summary>
    public ICollection<Patio> Patios { get; set; } = new List<Patio>();
}

/// <summary>
/// Enumeration of venue types for categorization
/// </summary>
public enum VenueType
{
    Restaurant = 0,
    Cafe = 1,
    Bar = 2,
    Hotel = 3,
    Other = 4
}