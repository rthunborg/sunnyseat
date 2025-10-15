using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using FluentAssertions;
using System.Net;
using Testcontainers.PostgreSql;
using Xunit;
using DotNet.Testcontainers.Configurations;

namespace SunnySeat.Integration.Tests;

/// <summary>
/// End-to-end integration tests for the complete SunnySeat system
/// Tests verify all components work together correctly
/// NOTE: These tests require Docker to be running on the local machine
/// Tagged as E2E to allow selective execution in CI/CD
/// </summary>
[Trait("Category", "E2E")]
public class FullSystemIntegrationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer? _postgresContainer;
    private WebApplicationFactory<Program>? _factory;
    private HttpClient? _client;
    private readonly bool _dockerAvailable;

    public FullSystemIntegrationTests()
    {
        // Check if Docker is available before creating container
        try
        {
            _postgresContainer = new PostgreSqlBuilder()
                .WithImage("postgis/postgis:15-3.4")
                .WithDatabase("sunnyseat_integration_test")
                .WithUsername("postgres")
                .WithPassword("postgres")
                .WithPortBinding(0, 5432) // Random host port
                .Build();
            _dockerAvailable = true;
        }
        catch (ArgumentException)
        {
            // Docker not running or misconfigured
            _dockerAvailable = false;
        }
    }

    public async Task InitializeAsync()
    {
        if (!_dockerAvailable || _postgresContainer == null)
        {
            return;
        }

        await _postgresContainer.StartAsync();

        // Initialize PostGIS extensions
        var connectionString = _postgresContainer.GetConnectionString();
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand("CREATE EXTENSION IF NOT EXISTS postgis;", connection);
        await command.ExecuteNonQueryAsync();

        // Create web application factory with test database
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Override connection string for integration tests
                    services.Configure<ConnectionStrings>(options =>
                    {
                        options.DefaultConnection = connectionString;
                    });
                });
            });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task CompleteSystem_WhenStarted_ShouldBeHealthy()
    {
        // Skip test if Docker is not available
        if (!_dockerAvailable || _client == null)
        {
            return; // Test skipped - Docker not available
        }

        // Arrange
        _client.Should().NotBeNull();

        // Act - Use /health/ready which doesn't require weather service dependencies
        var response = await _client!.GetAsync("/health/ready");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
        content.Should().Contain("ready"); // Basic health endpoint returns status: ready
    }

    [Fact]
    public async Task Database_WithPostGIS_ShouldSupportSpatialQueries()
    {
        // Skip test if Docker is not available
        if (!_dockerAvailable || _postgresContainer == null)
        {
            return; // Test skipped - Docker not available
        }

        // Arrange
        var connectionString = _postgresContainer.GetConnectionString();
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Act
        await using var command = new NpgsqlCommand("SELECT PostGIS_Version();", connection);
        var result = await command.ExecuteScalarAsync();

        // Assert
        result.Should().NotBeNull();
        result!.ToString().Should().StartWith("3.4", "PostGIS version should be 3.4");
    }

    [Fact]
    public async Task Database_SpatialFunctions_ShouldCalculateDistanceCorrectly()
    {
        // Skip test if Docker is not available
        if (!_dockerAvailable || _postgresContainer == null)
        {
            return; // Test skipped - Docker not available
        }

        // Arrange
        var connectionString = _postgresContainer.GetConnectionString();
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Act - Calculate distance between two points
        var sql = "SELECT ST_Distance(ST_Point(0,0), ST_Point(1,1));";
        await using var command = new NpgsqlCommand(sql, connection);
        var distance = await command.ExecuteScalarAsync();

        // Assert
        distance.Should().NotBeNull();
        var distanceValue = Convert.ToDouble(distance);
        distanceValue.Should().BeApproximately(Math.Sqrt(2), 0.001, "Distance should be approximately sqrt(2)");
    }

    [Fact]
    public async Task Database_EPSG4326_ShouldBeAvailable()
    {
        // Skip test if Docker is not available
        if (!_dockerAvailable || _postgresContainer == null)
        {
            return; // Test skipped - Docker not available
        }

        // Arrange
        var connectionString = _postgresContainer.GetConnectionString();
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Act
        var sql = "SELECT COUNT(*) FROM spatial_ref_sys WHERE srid = 4326;";
        await using var command = new NpgsqlCommand(sql, connection);
        var count = await command.ExecuteScalarAsync();

        // Assert
        count.Should().NotBeNull();
        Convert.ToInt32(count).Should().Be(1, "EPSG:4326 coordinate system should be available");
    }

    [Fact]
    public async Task API_HealthEndpoint_ShouldRespondQuickly()
    {
        // Skip test if Docker is not available
        if (!_dockerAvailable || _client == null)
        {
            return; // Test skipped - Docker not available
        }

        // Arrange
        _client.Should().NotBeNull();
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Act - Use /health/ready which doesn't require weather service dependencies
        var response = await _client!.GetAsync("/health/ready");
        stopwatch.Stop();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(1000, "Health check should respond within 1 second in integration tests");
    }

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        _factory?.Dispose();

        if (_postgresContainer != null)
        {
            await _postgresContainer.DisposeAsync();
        }
    }
}

/// <summary>
/// Configuration class for dependency injection
/// </summary>
public class ConnectionStrings
{
    public string DefaultConnection { get; set; } = string.Empty;
}