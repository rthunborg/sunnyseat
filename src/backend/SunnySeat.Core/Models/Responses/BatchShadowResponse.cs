using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Models.Responses;

/// <summary>
/// Response model for batch shadow calculation
/// </summary>
public class BatchShadowResponse
{
    /// <summary>
    /// Timestamp used for shadow calculations (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Shadow information results for each patio
    /// </summary>
    public IEnumerable<PatioShadowInfo> Results { get; set; } = [];

    /// <summary>
    /// Total calculation time in milliseconds
    /// </summary>
    public double CalculationTimeMs { get; set; }
}
