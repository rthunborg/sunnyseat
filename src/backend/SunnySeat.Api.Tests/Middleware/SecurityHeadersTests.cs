using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using Xunit;

namespace SunnySeat.Api.Tests.Middleware;

/// <summary>
/// Tests for security headers middleware (Story 4.6)
/// Validates that all required security headers are present in responses
/// </summary>
public class SecurityHeadersTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SecurityHeadersTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Response_IncludesXContentTypeOptions()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        Assert.True(response.Headers.Contains("X-Content-Type-Options"));
        var headerValue = response.Headers.GetValues("X-Content-Type-Options").FirstOrDefault();
        Assert.Equal("nosniff", headerValue);
    }

    [Fact]
    public async Task Response_IncludesXFrameOptions()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        Assert.True(response.Headers.Contains("X-Frame-Options"));
        var headerValue = response.Headers.GetValues("X-Frame-Options").FirstOrDefault();
        Assert.Equal("DENY", headerValue);
    }

    [Fact]
    public async Task Response_IncludesXXSSProtection()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        Assert.True(response.Headers.Contains("X-XSS-Protection"));
        var headerValue = response.Headers.GetValues("X-XSS-Protection").FirstOrDefault();
        Assert.Equal("1; mode=block", headerValue);
    }

    [Fact]
    public async Task Response_IncludesReferrerPolicy()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        Assert.True(response.Headers.Contains("Referrer-Policy"));
        var headerValue = response.Headers.GetValues("Referrer-Policy").FirstOrDefault();
        Assert.Equal("strict-origin-when-cross-origin", headerValue);
    }

    [Fact]
    public async Task Response_IncludesContentSecurityPolicy()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
        var headerValue = response.Headers.GetValues("Content-Security-Policy").FirstOrDefault();
        Assert.NotNull(headerValue);
        Assert.Contains("default-src 'self'", headerValue);
    }

    [Fact]
    public async Task CSP_AllowsMapTilerDomain()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
        var headerValue = response.Headers.GetValues("Content-Security-Policy").FirstOrDefault();
        Assert.NotNull(headerValue);
        Assert.Contains("maptiler.com", headerValue);
    }

    [Fact]
    public async Task AllEndpoints_HaveSecurityHeaders()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act - Test multiple endpoints
        var endpoints = new[]
        {
            "/health/ready",
            "/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1",
            "/health/database"
        };

        foreach (var endpoint in endpoints)
        {
            var response = await client.GetAsync(endpoint);

            // Assert - Each endpoint should have security headers
            Assert.True(response.Headers.Contains("X-Content-Type-Options"),
                $"Endpoint {endpoint} missing X-Content-Type-Options header");
            Assert.True(response.Headers.Contains("X-Frame-Options"),
                $"Endpoint {endpoint} missing X-Frame-Options header");
        }
    }
}
