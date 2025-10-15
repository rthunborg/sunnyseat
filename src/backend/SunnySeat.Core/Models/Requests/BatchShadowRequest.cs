using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Core.Models.Requests;

/// <summary>
/// Request model for batch shadow calculation
/// </summary>
public class BatchShadowRequest
{
    /// <summary>
    /// List of patio IDs to calculate shadows for (max 100)
    /// </summary>
    [Required]
    [MinLength(1, ErrorMessage = "At least one patio ID must be provided")]
    [MaxLength(100, ErrorMessage = "Maximum 100 patios allowed per batch request")]
    public IEnumerable<int> PatioIds { get; set; } = [];

    /// <summary>
    /// Timestamp for shadow calculation (UTC, optional - defaults to current time)
    /// </summary>
    public DateTime? Timestamp { get; set; }
}
