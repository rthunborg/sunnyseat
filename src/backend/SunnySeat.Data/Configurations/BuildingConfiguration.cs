using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SunnySeat.Core.Entities;

namespace SunnySeat.Data.Configurations;

/// <summary>
/// Entity Framework configuration for Building entity with PostGIS spatial support
/// </summary>
public class BuildingConfiguration : IEntityTypeConfiguration<Building>
{
    public void Configure(EntityTypeBuilder<Building> builder)
    {
        builder.ToTable("buildings");

        // Primary key
        builder.HasKey(e => e.Id);

        // Spatial geometry configuration
        builder.Property(e => e.Geometry)
            .HasColumnType("geometry")
            .IsRequired();

        // Height with precision for meters (up to 999.99m)
        builder.Property(e => e.Height)
            .HasPrecision(6, 2)
            .IsRequired();

        // Source tracking
        builder.Property(e => e.Source)
            .HasMaxLength(50)
            .IsRequired();

        // Quality score (0.000 to 1.000)
        builder.Property(e => e.QualityScore)
            .HasPrecision(4, 3)
            .IsRequired();

        // External identifier for deduplication
        builder.Property(e => e.ExternalId)
            .HasMaxLength(100);

        // Audit timestamps
        builder.Property(e => e.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();

        // Indexes for performance

        // Spatial index for shadow calculation queries (most critical)
        builder.HasIndex(e => e.Geometry)
            .HasMethod("gist")
            .HasDatabaseName("IX_Buildings_Geometry_Spatial");

        // Index for source-based queries and statistics
        builder.HasIndex(e => e.Source)
            .HasDatabaseName("IX_Buildings_Source");

        // Composite index for deduplication checks
        builder.HasIndex(e => new { e.ExternalId, e.Source })
            .HasDatabaseName("IX_Buildings_ExternalId_Source")
            .HasFilter("\"ExternalId\" IS NOT NULL");

        // Index for audit and import tracking
        builder.HasIndex(e => e.CreatedAt)
            .HasDatabaseName("IX_Buildings_CreatedAt");
    }
}