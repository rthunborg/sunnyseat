using NetTopologySuite.Geometries;
using NetTopologySuite.Algorithm;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Utils;

/// <summary>
/// Utilities for 2.5D shadow geometry calculations
/// </summary>
public static class ShadowGeometry
{
    /// <summary>
    /// Maximum reliable shadow distance in meters (beyond this, shadows become unreliable)
    /// </summary>
    public const double MaxShadowDistance = 200.0;

    /// <summary>
    /// Minimum building height for meaningful shadow calculation (meters)
    /// </summary>
    public const double MinMeaningfulHeight = 3.0;

    /// <summary>
    /// Minimum sun elevation angle for reliable shadow calculations (degrees)
    /// </summary>
    public const double MinReliableElevation = 5.0;

    /// <summary>
    /// Project a building footprint to create shadow polygon using solar position
    /// </summary>
    /// <param name="buildingFootprint">Building footprint polygon</param>
    /// <param name="buildingHeight">Height of building in meters</param>
    /// <param name="solarPosition">Current solar position</param>
    /// <param name="geometryFactory">Geometry factory for creating polygons</param>
    /// <returns>Shadow polygon or null if no shadow cast</returns>
    public static Polygon? ProjectBuildingShadow(
        Polygon buildingFootprint, 
        double buildingHeight,
        SolarPosition solarPosition,
        GeometryFactory geometryFactory)
    {
        // Don't calculate shadow if sun is below horizon or too low
        if (solarPosition.Elevation <= 0 || solarPosition.Elevation < MinReliableElevation)
            return null;

        // Calculate shadow length based on building height and sun elevation
        var shadowLength = CalculateShadowLength(buildingHeight, solarPosition.Elevation);
        
        // Limit shadow length to reasonable maximum
        shadowLength = Math.Min(shadowLength, MaxShadowDistance);

        // Calculate shadow direction (opposite of sun azimuth)
        var shadowDirection = (solarPosition.Azimuth + 180) % 360;

        // Project building footprint in shadow direction
        return ProjectPolygonInDirection(buildingFootprint, shadowLength, shadowDirection, geometryFactory);
    }

    /// <summary>
    /// Calculate shadow length given building height and sun elevation angle
    /// </summary>
    /// <param name="buildingHeight">Height of building in meters</param>
    /// <param name="sunElevationDegrees">Sun elevation angle in degrees</param>
    /// <returns>Shadow length in meters</returns>
    public static double CalculateShadowLength(double buildingHeight, double sunElevationDegrees)
    {
        if (sunElevationDegrees <= 0)
            return 0;

        var sunElevationRadians = sunElevationDegrees * Math.PI / 180.0;
        return buildingHeight / Math.Tan(sunElevationRadians);
    }

    /// <summary>
    /// Project a polygon in a specific direction by a given distance
    /// </summary>
    /// <param name="polygon">Original polygon to project</param>
    /// <param name="distance">Distance to project in meters</param>
    /// <param name="directionDegrees">Direction in degrees (0 = North, clockwise)</param>
    /// <param name="geometryFactory">Geometry factory</param>
    /// <returns>Shadow polygon combining original and projected footprint</returns>
    public static Polygon ProjectPolygonInDirection(
        Polygon polygon, 
        double distance, 
        double directionDegrees,
        GeometryFactory geometryFactory)
    {
        // Convert direction to radians and adjust for coordinate system
        // (Geographic: 0° = North, Cartesian: 0° = East, so subtract 90° and negate)
        var directionRadians = -(directionDegrees - 90) * Math.PI / 180.0;
        
        var dx = distance * Math.Cos(directionRadians);
        var dy = distance * Math.Sin(directionRadians);

        // Convert meters to approximate degrees (rough approximation for shadow calculations)
        // At Gothenburg latitude (~58°), 1° longitude ? 55.8 km, 1° latitude ? 111.3 km
        var dxDegrees = dx / 55800.0; // meters to degrees longitude
        var dyDegrees = dy / 111300.0; // meters to degrees latitude

        // Get original coordinates
        var originalCoords = polygon.ExteriorRing.Coordinates;
        
        // Project coordinates
        var projectedCoords = originalCoords.Select(coord => 
            new Coordinate(coord.X + dxDegrees, coord.Y + dyDegrees)).ToArray();

        // Create shadow polygon by combining original and projected coordinates
        var shadowCoords = new List<Coordinate>();
        
        // Add original polygon coordinates
        shadowCoords.AddRange(originalCoords.Take(originalCoords.Length - 1)); // Exclude duplicate last coordinate
        
        // Add projected coordinates in reverse order to create proper polygon
        shadowCoords.AddRange(projectedCoords.Reverse().Take(projectedCoords.Length - 1));
        
        // Close the polygon
        shadowCoords.Add(shadowCoords[0]);

        // Create convex hull to ensure valid geometry
        var points = shadowCoords.Select(coord => geometryFactory.CreatePoint(coord)).ToArray();
        var convexHull = geometryFactory.CreateMultiPoint(points).ConvexHull();

        return convexHull as Polygon ?? geometryFactory.CreatePolygon();
    }

    /// <summary>
    /// Calculate intersection of shadow with patio and return shadow coverage percentage
    /// </summary>
    /// <param name="patioGeometry">Patio polygon geometry</param>
    /// <param name="shadowGeometry">Shadow polygon geometry</param>
    /// <returns>Percentage of patio covered by shadow (0-100)</returns>
    public static double CalculateShadowCoveragePercent(Polygon patioGeometry, Polygon shadowGeometry)
    {
        try
        {
            var intersection = patioGeometry.Intersection(shadowGeometry);
            if (intersection.IsEmpty)
                return 0.0;

            var intersectionArea = intersection.Area;
            var patioArea = patioGeometry.Area;

            return patioArea > 0 ? (intersectionArea / patioArea) * 100.0 : 0.0;
        }
        catch (Exception)
        {
            // Handle geometry calculation errors gracefully
            return 0.0;
        }
    }

    /// <summary>
    /// Calculate shadowed and sunlit geometries within patio
    /// </summary>
    /// <param name="patioGeometry">Patio polygon</param>
    /// <param name="shadowGeometries">Collection of shadow polygons</param>
    /// <param name="geometryFactory">Geometry factory</param>
    /// <returns>Tuple of (shadowed geometry, sunlit geometry)</returns>
    public static (Polygon? Shadowed, Polygon? Sunlit) CalculateShadowedAndSunlitAreas(
        Polygon patioGeometry,
        IEnumerable<Polygon> shadowGeometries,
        GeometryFactory geometryFactory)
    {
        try
        {
            // Union all shadow geometries
            Geometry? combinedShadows = null;
            foreach (var shadow in shadowGeometries)
            {
                combinedShadows = combinedShadows?.Union(shadow) ?? shadow;
            }

            if (combinedShadows == null)
            {
                // No shadows - entire patio is sunlit
                return (null, patioGeometry);
            }

            // Calculate shadowed area within patio
            var shadowedArea = patioGeometry.Intersection(combinedShadows);
            var shadowedPolygon = shadowedArea.IsEmpty ? null : 
                (shadowedArea as Polygon ?? GetLargestPolygon(shadowedArea, geometryFactory));

            // Calculate sunlit area (patio minus shadows)
            var sunlitArea = patioGeometry.Difference(combinedShadows);
            var sunlitPolygon = sunlitArea.IsEmpty ? null :
                (sunlitArea as Polygon ?? GetLargestPolygon(sunlitArea, geometryFactory));

            return (shadowedPolygon, sunlitPolygon);
        }
        catch (Exception)
        {
            // Handle geometry calculation errors - assume no shadows
            return (null, patioGeometry);
        }
    }

    /// <summary>
    /// Get the largest polygon from a potentially multi-polygon geometry
    /// </summary>
    private static Polygon? GetLargestPolygon(Geometry geometry, GeometryFactory geometryFactory)
    {
        if (geometry is Polygon polygon)
            return polygon;

        if (geometry is MultiPolygon multiPolygon)
        {
            return multiPolygon.Geometries
                .OfType<Polygon>()
                .OrderByDescending(p => p.Area)
                .FirstOrDefault();
        }

        return null;
    }

    /// <summary>
    /// Calculate confidence score for shadow calculation based on various factors
    /// </summary>
    /// <param name="building">Building casting shadow</param>
    /// <param name="solarPosition">Solar position</param>
    /// <param name="shadowLength">Calculated shadow length</param>
    /// <returns>Confidence score (0.0 to 1.0)</returns>
    public static double CalculateShadowConfidence(
        Building building, 
        SolarPosition solarPosition, 
        double shadowLength)
    {
        var confidence = 1.0;

        // Reduce confidence for low sun angles
        if (solarPosition.Elevation < 10.0)
            confidence *= 0.7;
        else if (solarPosition.Elevation < 20.0)
            confidence *= 0.9;

        // Reduce confidence for very long shadows (may be inaccurate)
        if (shadowLength > 100.0)
            confidence *= 0.8;
        else if (shadowLength > 50.0)
            confidence *= 0.9;

        // Adjust confidence based on building height data quality
        confidence *= building.HeightSource switch
        {
            HeightSource.Surveyed => 1.0,
            HeightSource.Osm => 0.85,
            HeightSource.Heuristic => 0.7,
            _ => 0.6
        };

        // Ensure confidence is within valid range
        return Math.Max(0.0, Math.Min(1.0, confidence));
    }
}