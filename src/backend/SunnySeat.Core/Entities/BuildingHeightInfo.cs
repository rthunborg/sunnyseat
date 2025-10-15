namespace SunnySeat.Core.Entities;

/// <summary>
/// Summary of building height information for shadow calculations
/// </summary>
public class BuildingHeightInfo
{
    /// <summary>
    /// Effective height used for calculations
    /// </summary>
    public double EffectiveHeight { get; set; }

    /// <summary>
    /// Original height from data source (may be null)
    /// </summary>
    public double? OriginalHeight { get; set; }

    /// <summary>
    /// Admin height override (may be null)
    /// </summary>
    public double? AdminOverride { get; set; }

    /// <summary>
    /// Source of height data
    /// </summary>
    public HeightSource HeightSource { get; set; }

    /// <summary>
    /// Confidence in height data (0.0 to 1.0)
    /// </summary>
    public double Confidence { get; set; }

    /// <summary>
    /// Whether building is tall enough to cast meaningful shadows
    /// </summary>
    public bool CanCastShadow { get; set; }

    /// <summary>
    /// Whether height is calculated using heuristics
    /// </summary>
    public bool IsHeuristic { get; set; }
}