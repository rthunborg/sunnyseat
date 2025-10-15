using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service for calculating building shadows and patio shadow coverage
/// </summary>
public interface IShadowCalculationService
{
    /// <summary>
    /// Calculate shadow cast by a specific building at given solar position
    /// </summary>
    /// <param name="buildingId">ID of the building</param>
    /// <param name="solarPosition">Solar position for shadow calculation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Shadow projection or null if no shadow (sun below horizon)</returns>
    Task<ShadowProjection?> CalculateBuildingShadowAsync(int buildingId, 
        SolarPosition solarPosition, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate all shadows within a bounding area at given solar position
    /// </summary>
    /// <param name="solarPosition">Solar position for shadow calculation</param>
    /// <param name="boundingArea">Area to search for shadow-casting buildings</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of shadow projections</returns>
    Task<IEnumerable<ShadowProjection>> CalculateAllShadowsAsync(
        SolarPosition solarPosition, Polygon boundingArea, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate shadow coverage for a specific patio at given timestamp
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="timestamp">Timestamp for shadow calculation (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Patio shadow information</returns>
    Task<PatioShadowInfo> CalculatePatioShadowAsync(int patioId, 
        DateTime timestamp, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate shadow coverage for multiple patios at given timestamp (optimized batch operation)
    /// </summary>
    /// <param name="patioIds">IDs of patios to calculate</param>
    /// <param name="timestamp">Timestamp for shadow calculation (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary mapping patio IDs to shadow information</returns>
    Task<Dictionary<int, PatioShadowInfo>> CalculatePatioBatchShadowAsync(
        IEnumerable<int> patioIds, DateTime timestamp, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate shadow timeline for a patio over a time period
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="startTime">Start of timeline (UTC)</param>
    /// <param name="endTime">End of timeline (UTC)</param>
    /// <param name="interval">Time interval between calculations</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Shadow timeline data</returns>
    Task<ShadowTimeline> CalculatePatioShadowTimelineAsync(int patioId, 
        DateTime startTime, DateTime endTime, TimeSpan interval,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Determine if shadow calculation is reliable at given solar position
    /// </summary>
    /// <param name="solarPosition">Solar position to evaluate</param>
    /// <returns>True if shadow calculation will be reliable</returns>
    bool IsShadowCalculationReliable(SolarPosition solarPosition);

    /// <summary>
    /// Update building height with admin override
    /// </summary>
    /// <param name="buildingId">ID of building to update</param>
    /// <param name="heightOverride">New height override value</param>
    /// <param name="updatedBy">Admin user making the update</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated building entity</returns>
    Task<Building> UpdateBuildingHeightAsync(int buildingId, double heightOverride, 
        string updatedBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove building height override, reverting to original data
    /// </summary>
    /// <param name="buildingId">ID of building to update</param>
    /// <param name="updatedBy">Admin user making the update</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated building entity</returns>
    Task<Building> RemoveBuildingHeightOverrideAsync(int buildingId, string updatedBy, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get building height information summary
    /// </summary>
    /// <param name="buildingId">ID of building</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Building height information</returns>
    Task<BuildingHeightInfo> GetBuildingHeightInfoAsync(int buildingId, 
        CancellationToken cancellationToken = default);
}