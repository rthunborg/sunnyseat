using SunnySeat.Core.Entities;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Validation;

/// <summary>
/// Validation rules and methods for venue data quality
/// </summary>
public static class VenueValidator
{
    // Gothenburg approximate bounds (very rough estimate)
    private static readonly double GothenburgMinLat = 57.6;
    private static readonly double GothenburgMaxLat = 57.8;
    private static readonly double GothenburgMinLon = 11.8;
    private static readonly double GothenburgMaxLon = 12.1;

    /// <summary>
    /// Validates that a venue has a valid name
    /// </summary>
    public static bool HasValidName(Venue venue)
    {
        return !string.IsNullOrWhiteSpace(venue.Name) &&
               venue.Name.Length >= 2 &&
               venue.Name.Length <= 200;
    }

    /// <summary>
    /// Validates that a venue has a valid address
    /// </summary>
    public static bool HasValidAddress(Venue venue)
    {
        return !string.IsNullOrWhiteSpace(venue.Address) &&
               venue.Address.Length >= 5 &&
               venue.Address.Length <= 500;
    }

    /// <summary>
    /// Validates that a venue location is within Gothenburg bounds
    /// </summary>
    public static bool HasValidLocation(Venue venue)
    {
        if (venue.Location == null) return false;

        var lat = venue.Location.Y;
        var lon = venue.Location.X;

        return lat >= GothenburgMinLat && lat <= GothenburgMaxLat &&
               lon >= GothenburgMinLon && lon <= GothenburgMaxLon;
    }

    /// <summary>
    /// Validates that a venue has complete basic metadata
    /// </summary>
    public static bool HasCompleteMetadata(Venue venue)
    {
        return HasValidName(venue) &&
               HasValidAddress(venue) &&
               HasValidLocation(venue);
    }

    /// <summary>
    /// Validates that a venue has quality patios
    /// </summary>
    public static bool HasQualityPatios(Venue venue)
    {
        return venue.Patios != null &&
               venue.Patios.Any() &&
               venue.Patios.All(p => p.PolygonQuality >= 0.3);
    }

    /// <summary>
    /// Gets all validation issues for a venue
    /// </summary>
    public static List<string> GetValidationIssues(Venue venue)
    {
        var issues = new List<string>();

        if (!HasValidName(venue))
            issues.Add("Invalid or missing venue name");

        if (!HasValidAddress(venue))
            issues.Add("Invalid or missing venue address");

        if (!HasValidLocation(venue))
            issues.Add("Invalid location or location outside Gothenburg");

        if (venue.Patios == null || !venue.Patios.Any())
            issues.Add("No patios defined for venue");
        else if (!HasQualityPatios(venue))
            issues.Add("One or more patios have low quality scores");

        return issues;
    }

    /// <summary>
    /// Gets validation issues for a venue during bulk import (excludes patio requirements)
    /// </summary>
    public static List<string> GetImportValidationIssues(Venue venue)
    {
        var issues = new List<string>();

        if (!HasValidName(venue))
            issues.Add("Invalid or missing venue name");

        if (!HasValidAddress(venue))
            issues.Add("Invalid or missing venue address");

        if (!HasValidLocation(venue))
            issues.Add("Invalid location or location outside Gothenburg");

        return issues;
    }

    /// <summary>
    /// Calculates overall quality score for a venue
    /// </summary>
    public static double CalculateQualityScore(Venue venue)
    {
        // Check if venue has patios - adjusts scoring weights
        var hasPatios = venue.Patios?.Any() == true;

        var scores = new List<double>();

        if (hasPatios)
        {
            // With patios: Metadata (40%) + Additional (10%) + Patios (50%)

            // Metadata completeness (40%)
            var metadataScore = 0.0;
            if (HasValidName(venue)) metadataScore += 0.33;
            if (HasValidAddress(venue)) metadataScore += 0.33;
            if (HasValidLocation(venue)) metadataScore += 0.34;
            scores.Add(metadataScore * 0.4);

            // Additional metadata (10%)
            var additionalScore = 0.0;
            if (!string.IsNullOrWhiteSpace(venue.Phone)) additionalScore += 0.5;
            if (!string.IsNullOrWhiteSpace(venue.Website)) additionalScore += 0.5;
            scores.Add(additionalScore * 0.1);

            // Patio quality (50%)
            var patioScore = venue.Patios!.Average(p => p.PolygonQuality);
            scores.Add(patioScore * 0.5);
        }
        else
        {
            // Without patios: Metadata (70%) + Additional (30%)
            // This allows venues to be evaluated before patio mapping

            // Metadata completeness (70%)
            var metadataScore = 0.0;
            if (HasValidName(venue)) metadataScore += 0.33;
            if (HasValidAddress(venue)) metadataScore += 0.33;
            if (HasValidLocation(venue)) metadataScore += 0.34;
            scores.Add(metadataScore * 0.7);

            // Additional metadata (30%)
            var additionalScore = 0.0;
            if (!string.IsNullOrWhiteSpace(venue.Phone)) additionalScore += 0.5;
            if (!string.IsNullOrWhiteSpace(venue.Website)) additionalScore += 0.5;
            scores.Add(additionalScore * 0.3);
        }

        return Math.Round(scores.Sum(), 2);
    }
}