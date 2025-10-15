using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using SunnySeat.Core.Entities;
using SunnySeat.Data.Configurations;

namespace SunnySeat.Data;

/// <summary>
/// Entity Framework DbContext for SunnySeat application with PostGIS spatial support
/// </summary>
public class SunnySeatDbContext : DbContext
{
    public SunnySeatDbContext(DbContextOptions<SunnySeatDbContext> options) : base(options)
    {
    }

    // DbSets for all entities
    public DbSet<Venue> Venues { get; set; } = null!;
    public DbSet<Patio> Patios { get; set; } = null!;
    public DbSet<VenueQualityMetrics> VenueQualityMetrics { get; set; } = null!;
    public DbSet<Building> Buildings { get; set; } = null!;
    public DbSet<SunWindow> SunWindows { get; set; } = null!;
    public DbSet<WeatherSlice> WeatherSlices { get; set; } = null!;
    public DbSet<ProcessedWeather> ProcessedWeathers { get; set; } = null!;
    public DbSet<Feedback> Feedback { get; set; } = null!;
    public DbSet<AdminUser> AdminUsers { get; set; } = null!;
    public DbSet<PrecomputedSunExposure> PrecomputedSunExposures { get; set; } = null!;
    public DbSet<PrecomputationSchedule> PrecomputationSchedules { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Venue entity
        modelBuilder.Entity<Venue>(entity =>
        {
            entity.ToTable("venues");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Address).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Website).HasMaxLength(500);
            entity.Property(e => e.Type).HasConversion<int>().IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Location).HasColumnType("geometry").IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            entity.HasIndex(e => e.Location).HasMethod("gist");
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsMapped);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Name);
        });

        // Configure Patio entity
        modelBuilder.Entity<Patio>(entity =>
        {
            entity.ToTable("patios");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Geometry).HasColumnType("geometry").IsRequired();
            entity.Property(e => e.HeightM).HasPrecision(5, 2);
            entity.Property(e => e.HeightSource).HasConversion<int>().IsRequired();
            entity.Property(e => e.PolygonQuality).HasPrecision(3, 2);
            entity.Property(e => e.Orientation).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Spatial index on geometry
            entity.HasIndex(e => e.Geometry).HasMethod("gist");
            entity.HasIndex(e => e.VenueId);
            entity.HasIndex(e => e.ReviewNeeded);
            entity.HasIndex(e => e.PolygonQuality);
            entity.HasIndex(e => e.HeightSource);

            // Foreign key to Venue
            entity.HasOne(e => e.Venue)
                  .WithMany(v => v.Patios)
                  .HasForeignKey(e => e.VenueId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure VenueQualityMetrics entity
        modelBuilder.Entity<VenueQualityMetrics>(entity =>
        {
            entity.ToTable("venue_quality_metrics");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OverallQuality).HasPrecision(3, 2);
            entity.Property(e => e.AveragePatioQuality).HasPrecision(3, 2);
            entity.Property(e => e.ValidationIssues)
                  .HasConversion(
                      issues => string.Join('|', issues),
                      str => str.Split('|', StringSplitOptions.RemoveEmptyEntries).ToList())
                  .HasColumnType("text");
            entity.Property(e => e.AssessedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            entity.HasIndex(e => e.VenueId);
            entity.HasIndex(e => e.OverallQuality);
            entity.HasIndex(e => e.AssessedAt);

            // Foreign key to Venue
            entity.HasOne(e => e.Venue)
                  .WithMany()
                  .HasForeignKey(e => e.VenueId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Building entity using dedicated configuration
        modelBuilder.ApplyConfiguration(new BuildingConfiguration());

        // Configure AdminUser entity using dedicated configuration
        modelBuilder.ApplyConfiguration(new AdminUserConfiguration());

        // Configure SunWindow entity
        modelBuilder.Entity<SunWindow>(entity =>
        {
            entity.ToTable("sun_windows");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PeakExposure).HasPrecision(3, 2);
            entity.Property(e => e.Confidence).HasPrecision(3, 2);
            entity.Property(e => e.CalculatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes for date-based queries
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => new { e.PatioId, e.Date });
            entity.HasIndex(e => e.StartTime);

            // Foreign key to Patio
            entity.HasOne(e => e.Patio)
                  .WithMany(p => p.SunWindows)
                  .HasForeignKey(e => e.PatioId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure WeatherSlice entity
        modelBuilder.Entity<WeatherSlice>(entity =>
        {
            entity.ToTable("weather_slices");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CloudCover).HasPrecision(5, 2);
            entity.Property(e => e.PrecipitationProbability).HasPrecision(3, 2);
            entity.Property(e => e.Temperature).HasPrecision(4, 1);
            entity.Property(e => e.Visibility).HasPrecision(5, 2);
            entity.Property(e => e.Source).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes for temporal queries
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => new { e.Source, e.Timestamp });
            entity.HasIndex(e => e.IsForecast);
        });

        // Configure ProcessedWeather entity
        modelBuilder.Entity<ProcessedWeather>(entity =>
        {
            entity.ToTable("processed_weather");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NormalizedCloudCover).HasPrecision(5, 2).IsRequired();
            entity.Property(e => e.PrecipitationIntensity).HasPrecision(5, 2).IsRequired();
            entity.Property(e => e.Condition).HasConversion<int>().IsRequired();
            entity.Property(e => e.IsSunBlocking).IsRequired();
            entity.Property(e => e.ConfidenceLevel).HasPrecision(3, 2).IsRequired();
            entity.Property(e => e.Location).HasColumnType("geometry");
            entity.Property(e => e.ProcessedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes for temporal and spatial queries
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.WeatherSliceId);
            entity.HasIndex(e => e.Location).HasMethod("gist");
            entity.HasIndex(e => new { e.Timestamp, e.IsSunBlocking });
            entity.HasIndex(e => e.ProcessedAt);

            // Foreign key to WeatherSlice
            entity.HasOne(e => e.WeatherSlice)
                  .WithMany()
                  .HasForeignKey(e => e.WeatherSliceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Feedback entity
        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.ToTable("feedback");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PredictedState).HasMaxLength(20).IsRequired();
            entity.Property(e => e.ConfidenceAtPrediction).HasPrecision(3, 2);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes for analytics queries
            entity.HasIndex(e => e.BinnedTimestamp);
            entity.HasIndex(e => new { e.PatioId, e.BinnedTimestamp });
            entity.HasIndex(e => new { e.VenueId, e.UserTimestamp });

            // Foreign keys
            entity.HasOne(e => e.Patio)
                  .WithMany(p => p.FeedbackEntries)
                  .HasForeignKey(e => e.PatioId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Venue)
                  .WithMany()
                  .HasForeignKey(e => e.VenueId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure PrecomputedSunExposure entity
        modelBuilder.Entity<PrecomputedSunExposure>(entity =>
        {
            entity.ToTable("precomputed_sun_exposure");
            entity.HasKey(e => e.Id);

            // Indexes for efficient time-based queries
            entity.HasIndex(e => new { e.PatioId, e.Date, e.Time });
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => new { e.Date, e.PatioId });
            entity.HasIndex(e => e.IsStale);
            entity.HasIndex(e => e.ExpiresAt);

            // Foreign key
            entity.HasOne(e => e.Patio)
                  .WithMany()
                  .HasForeignKey(e => e.PatioId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure PrecomputationSchedule entity
        modelBuilder.Entity<PrecomputationSchedule>(entity =>
        {
            entity.ToTable("precomputation_schedules");
            entity.HasKey(e => e.Id);

            // Indexes
            entity.HasIndex(e => e.TargetDate).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.Status, e.TargetDate });

            // Configure Metrics dictionary as JSON (with value converter for compatibility)
            entity.Property(e => e.Metrics)
                  .HasConversion(
                      dict => System.Text.Json.JsonSerializer.Serialize(dict, (System.Text.Json.JsonSerializerOptions?)null),
                      json => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>()
                  )
                  .HasColumnType("text"); // Use text for InMemory compatibility, jsonb in PostgreSQL
        });
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // This will be overridden by DI configuration in production
            optionsBuilder.UseNpgsql("Host=localhost;Database=sunnyseat_dev;Username=postgres;Password=postgres",
                options => options.UseNetTopologySuite());
        }
    }
}