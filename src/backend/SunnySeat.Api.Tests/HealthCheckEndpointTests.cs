using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using System.Net;
using Xunit;
using SunnySeat.Data;

namespace SunnySeat.Api.Tests;

/// <summary>
/// Integration tests for health check endpoints
/// Tests verify API responds correctly and database connectivity works
/// </summary>
public class HealthCheckEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public HealthCheckEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove the real database registration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<SunnySeatDbContext>));
                if (descriptor != null)
                    services.Remove(descriptor);

                // Add in-memory database for testing
                services.AddDbContext<SunnySeatDbContext>(options =>
                {
                    options.UseInMemoryDatabase("HealthCheckTestDb_" + Guid.NewGuid());
                });
            });
        });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task HealthCheck_WhenApiIsRunning_Returns200OK()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task HealthCheck_ResponseTime_ShouldBeLessThan250Milliseconds()
    {
        // Arrange
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Act
        var response = await _client.GetAsync("/health");
        stopwatch.Stop();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(250, "Health check should respond quickly");
    }

    [Fact]
    public async Task HealthCheck_WhenCalledMultipleTimes_ShouldBeConsistent()
    {
        // Arrange
        const int callCount = 5;
        var tasks = new List<Task<HttpResponseMessage>>();

        // Act
        for (int i = 0; i < callCount; i++)
        {
            tasks.Add(_client.GetAsync("/health"));
        }

        var responses = await Task.WhenAll(tasks);

        // Assert
        foreach (var response in responses)
        {
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task HealthCheck_Headers_ShouldIncludeContentType()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().NotBeNullOrEmpty();
    }
}