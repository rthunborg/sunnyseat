using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite;
using NetTopologySuite.IO.Converters;
using Npgsql;
using SunnySeat.Data;
using SunnySeat.Shared.Configuration;
using System.Text.Json;
using System.Text.Json.Serialization;
using Testcontainers.PostgreSql;
using Xunit;

namespace SunnySeat.Integration.Tests.Shared;

/// <summary>
/// Shared test fixture for PostgreSQL/PostGIS database using TestContainers
/// Manages the lifecycle of a PostGIS container for integration tests
/// </summary>
public class PostgresTestFixture : IAsyncLifetime
{
    private PostgreSqlContainer? _postgresContainer;
    private NpgsqlDataSource? _dataSource;
    public WebApplicationFactory<Program>? Factory { get; private set; }
    public HttpClient? Client { get; private set; }
    public string? ConnectionString { get; private set; }

    /// <summary>
    /// JSON serializer options configured to handle NaN/Infinity values, GeoJSON, and match API settings
    /// </summary>
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals,
        PropertyNamingPolicy = null,
        Converters =
        {
            new JsonStringEnumConverter(),
            new GeoJsonConverterFactory(NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326))
        },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        MaxDepth = 128
    };

    public async Task InitializeAsync()
    {
        try
        {
            // Create PostgreSQL container with PostGIS extension
            _postgresContainer = new PostgreSqlBuilder()
                .WithImage("postgis/postgis:15-3.4")
                .WithDatabase("sunnyseat_test")
                .WithUsername("postgres")
                .WithPassword("postgres")
                .WithPortBinding(0, 5432) // Random host port
                .Build();

            await _postgresContainer.StartAsync();

            ConnectionString = _postgresContainer.GetConnectionString();

            // Initialize PostGIS extensions
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();

            await using var command = new NpgsqlCommand("CREATE EXTENSION IF NOT EXISTS postgis;", connection);
            await command.ExecuteNonQueryAsync();

            // Create reusable NpgsqlDataSource for all DbContext instances
            var dataSourceBuilder = new NpgsqlDataSourceBuilder(ConnectionString);
            dataSourceBuilder.UseNetTopologySuite();
            _dataSource = dataSourceBuilder.Build();

            // Create web application factory with test database
            Factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    // Override JWT settings using UseSetting (highest precedence)
                    var (secretKey, issuer, audience) = TestJwtTokenGenerator.GetTestJwtConfig();
                    builder.UseSetting("Jwt:SecretKey", secretKey);
                    builder.UseSetting("Jwt:Issuer", issuer);
                    builder.UseSetting("Jwt:Audience", audience);
                    builder.UseSetting("Jwt:ExpirationMinutes", "60");
                    builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);

                    builder.ConfigureServices(services =>
                    {
                        // Remove the app DbContext registration
                        var descriptor = services.SingleOrDefault(
                            d => d.ServiceType == typeof(Microsoft.EntityFrameworkCore.DbContextOptions<SunnySeatDbContext>));
                        if (descriptor != null)
                        {
                            services.Remove(descriptor);
                        }

                        // Add test database context with NetTopologySuite support using shared data source
                        services.AddDbContext<SunnySeatDbContext>(options =>
                        {
                            options.UseNpgsql(_dataSource, o => o.UseNetTopologySuite());
                        });
                    });
                });

            Client = Factory.CreateClient();

            // Apply migrations to create database schema
            using var scope = Factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
            await dbContext.Database.EnsureCreatedAsync();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                "Failed to initialize PostgreSQL test container. Ensure Docker is running.", ex);
        }
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();

        if (Factory != null)
        {
            await Factory.DisposeAsync();
        }

        if (_dataSource != null)
        {
            await _dataSource.DisposeAsync();
        }

        if (_postgresContainer != null)
        {
            await _postgresContainer.DisposeAsync();
        }
    }

    /// <summary>
    /// Cleans up all data in the database between tests
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        if (Factory == null) return;

        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        // Delete all data
        dbContext.VenueQualityMetrics.RemoveRange(dbContext.VenueQualityMetrics);
        dbContext.Patios.RemoveRange(dbContext.Patios);
        dbContext.Venues.RemoveRange(dbContext.Venues);
        dbContext.Buildings.RemoveRange(dbContext.Buildings);
        dbContext.AdminUsers.RemoveRange(dbContext.AdminUsers);
        dbContext.PrecomputationSchedules.RemoveRange(dbContext.PrecomputationSchedules);

        await dbContext.SaveChangesAsync();
    }
}
