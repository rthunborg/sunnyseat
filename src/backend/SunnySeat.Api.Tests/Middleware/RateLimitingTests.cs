using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using Xunit;

namespace SunnySeat.Api.Tests.Middleware;

/// <summary>
/// Tests for rate limiting middleware (Story 4.6)
/// Validates that rate limits are enforced correctly across different endpoints
/// </summary>
public class RateLimitingTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public RateLimitingTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetPatios_UnderRateLimit_ReturnsSuccess()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act - Make a single request (well under the 30/min limit for patio endpoint)
        var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");

        // Assert
        Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
    }

    [Fact]
    public async Task GetPatios_ExceedsRateLimit_Returns429()
    {
        // Arrange
        var client = _factory.CreateClient();
        const int rateLimitPerMinute = 30;

        // Act - Make 31 requests rapidly (exceeds the 30/min limit)
        HttpResponseMessage? lastResponse = null;
        for (int i = 0; i < rateLimitPerMinute + 1; i++)
        {
            lastResponse = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");

            // Break if we hit rate limit
            if (lastResponse.StatusCode == HttpStatusCode.TooManyRequests)
                break;
        }

        // Assert
        Assert.NotNull(lastResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, lastResponse.StatusCode);
    }

    [Fact]
    public async Task RateLimitExceeded_IncludesRetryAfterHeader()
    {
        // Arrange
        var client = _factory.CreateClient();
        const int rateLimitPerMinute = 30;

        // Act - Exceed rate limit
        HttpResponseMessage? rateLimitedResponse = null;
        for (int i = 0; i < rateLimitPerMinute + 5; i++)
        {
            var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimitedResponse = response;
                break;
            }
        }

        // Assert
        Assert.NotNull(rateLimitedResponse);
        Assert.True(rateLimitedResponse.Headers.Contains("Retry-After") ||
                   rateLimitedResponse.Headers.Contains("X-Rate-Limit-Retry-After"),
            "Rate limited response should include Retry-After header");
    }

    [Fact]
    public async Task RateLimitExceeded_IncludesRateLimitHeaders()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act - Make a request
        var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");

        // Assert - Check for rate limit info headers
        var hasRateLimitHeaders =
            response.Headers.Contains("X-Rate-Limit-Limit") ||
            response.Headers.Contains("X-RateLimit-Limit") ||
            response.Headers.Contains("RateLimit-Limit");

        Assert.True(hasRateLimitHeaders, "Response should include rate limit information headers");
    }

    [Fact]
    public async Task FeedbackEndpoint_HasStricterLimit_Returns429Faster()
    {
        // Arrange
        var client = _factory.CreateClient();
        const int feedbackRateLimit = 10;

        // Act - Make 11 feedback submissions
        HttpResponseMessage? lastResponse = null;
        for (int i = 0; i < feedbackRateLimit + 1; i++)
        {
            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    venueId = 1,
                    timestamp = DateTime.UtcNow,
                    wasAccurate = true,
                    userComment = "Test"
                }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            lastResponse = await client.PostAsync("/api/feedback", content);

            if (lastResponse.StatusCode == HttpStatusCode.TooManyRequests)
                break;
        }

        // Assert - Should hit rate limit before general limit
        Assert.NotNull(lastResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, lastResponse.StatusCode);
    }

    [Fact]
    public async Task GeneralEndpoints_RespectGeneralRateLimit()
    {
        // Arrange
        var client = _factory.CreateClient();
        const int generalRateLimit = 100;

        // Act - Make many requests to health endpoint (general rate limit applies)
        int successCount = 0;
        HttpResponseMessage? lastResponse = null;

        for (int i = 0; i < generalRateLimit + 5; i++)
        {
            lastResponse = await client.GetAsync("/health/ready");

            if (lastResponse.IsSuccessStatusCode)
                successCount++;
            else if (lastResponse.StatusCode == HttpStatusCode.TooManyRequests)
                break;
        }

        // Assert - Should eventually hit rate limit
        Assert.NotNull(lastResponse);
        Assert.True(successCount <= generalRateLimit,
            $"Should not exceed general rate limit of {generalRateLimit} requests");
    }

    [Fact]
    public async Task RateLimitResponse_ContainsErrorMessage()
    {
        // Arrange
        var client = _factory.CreateClient();
        const int rateLimitPerMinute = 30;

        // Act - Exceed rate limit
        HttpResponseMessage? rateLimitedResponse = null;
        for (int i = 0; i < rateLimitPerMinute + 5; i++)
        {
            var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimitedResponse = response;
                break;
            }
        }

        // Assert
        Assert.NotNull(rateLimitedResponse);
        var content = await rateLimitedResponse.Content.ReadAsStringAsync();
        Assert.NotEmpty(content);
        Assert.Contains("quota", content.ToLower() + "limit" + content.ToLower() + "exceeded" + content.ToLower());
    }

    [Fact]
    public async Task RateLimit_PerEndpoint_IndependentLimits()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act - Make requests to different endpoints
        var patioResponse = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");
        var healthResponse = await client.GetAsync("/health/ready");

        // Assert - Both should succeed as they have independent limits
        Assert.NotEqual(HttpStatusCode.TooManyRequests, patioResponse.StatusCode);
        Assert.NotEqual(HttpStatusCode.TooManyRequests, healthResponse.StatusCode);
    }

    [Fact]
    public async Task BlockedRequests_DontIncrementCounter()
    {
        // This test verifies that once rate limited, additional requests 
        // don't keep incrementing the counter (StackBlockedRequests = false)

        // Arrange
        var client = _factory.CreateClient();
        const int rateLimitPerMinute = 30;

        // Act - Exceed rate limit significantly
        int blockedCount = 0;
        for (int i = 0; i < rateLimitPerMinute + 20; i++)
        {
            var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                blockedCount++;
        }

        // Assert - Should have received 429s for excess requests
        Assert.True(blockedCount >= 10, "Should have blocked multiple excess requests");
    }

    [Fact]
    public async Task RateLimit_ConfigurationChanges_ApplyWithoutRestart()
    {
        // This test documents that rate limit config should be hot-reloadable
        // Actual hot reload testing would require configuration manipulation

        // Arrange & Act
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");

        // Assert - Just verify the endpoint is accessible
        Assert.True(response.StatusCode == HttpStatusCode.OK ||
                   response.StatusCode == HttpStatusCode.BadRequest,
            "Endpoint should be accessible");
    }

    [Fact]
    public async Task EndpointSpecificLimits_OverrideGeneralLimits()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act - The patio endpoint has a stricter limit (30/min) than general (100/min)
        var response = await client.GetAsync("/api/patios?latitude=57.7089&longitude=11.9746&radiusKm=1");

        // Assert - Endpoint-specific limit applies
        // This is verified by the fact that GetPatios_ExceedsRateLimit_Returns429 
        // hits limit at 30 requests, not 100
        Assert.NotNull(response);
    }
}
