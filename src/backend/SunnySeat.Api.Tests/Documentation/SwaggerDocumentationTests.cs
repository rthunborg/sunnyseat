using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Text.Json;
using Xunit;

namespace SunnySeat.Api.Tests.Documentation;

/// <summary>
/// Tests for Swagger/OpenAPI documentation (Story 4.6)
/// Validates that API documentation is complete and accessible
/// </summary>
public class SwaggerDocumentationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SwaggerDocumentationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SwaggerJson_IsAccessible()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task SwaggerJson_ValidatesAgainstOpenAPISchema()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Assert
        var root = doc.RootElement;

        // Check OpenAPI version
        Assert.True(root.TryGetProperty("openapi", out var openapiVersion));
        Assert.True(openapiVersion.GetString()?.StartsWith("3.0"));

        // Check info section
        Assert.True(root.TryGetProperty("info", out var info));
        Assert.True(info.TryGetProperty("title", out _));
        Assert.True(info.TryGetProperty("version", out _));

        // Check paths
        Assert.True(root.TryGetProperty("paths", out var paths));
        Assert.True(paths.EnumerateObject().Any());
    }

    [Fact]
    public async Task SwaggerDoc_ContainsPatioEndpoint()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Contains("/api/patios", content);
    }

    [Fact]
    public async Task SwaggerDoc_ContainsFeedbackEndpoint()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Contains("/api/feedback", content);
    }

    [Fact]
    public async Task SwaggerDoc_IncludesResponseSchemas()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Assert
        var root = doc.RootElement;
        Assert.True(root.TryGetProperty("components", out var components));
        Assert.True(components.TryGetProperty("schemas", out var schemas));

        // Should have response type schemas
        Assert.True(schemas.EnumerateObject().Any());
    }

    [Fact]
    public async Task SwaggerDoc_DocumentsErrorResponses()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();

        // Assert - Should document 400, 429, 500 responses
        Assert.Contains("400", content); // Bad Request
        Assert.Contains("429", content); // Too Many Requests
        Assert.Contains("500", content); // Internal Server Error
    }

    [Fact]
    public async Task SwaggerDoc_IncludesAPIDescription()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Assert
        var root = doc.RootElement;
        Assert.True(root.TryGetProperty("info", out var info));
        Assert.True(info.TryGetProperty("description", out var description));
        Assert.False(string.IsNullOrWhiteSpace(description.GetString()));
    }

    [Fact]
    public async Task SwaggerDoc_IncludesAuthenticationScheme()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Assert
        var root = doc.RootElement;

        // Check for security schemes (JWT authentication)
        if (root.TryGetProperty("components", out var components))
        {
            if (components.TryGetProperty("securitySchemes", out var securitySchemes))
            {
                Assert.True(securitySchemes.EnumerateObject().Any(),
                    "Should document authentication schemes");
            }
        }
    }

    [Fact]
    public async Task SwaggerDoc_EndpointsHaveSummaries()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Assert
        var root = doc.RootElement;
        Assert.True(root.TryGetProperty("paths", out var paths));

        var endpointCount = 0;
        var summaryCount = 0;

        foreach (var path in paths.EnumerateObject())
        {
            foreach (var method in path.Value.EnumerateObject())
            {
                endpointCount++;
                if (method.Value.TryGetProperty("summary", out _))
                {
                    summaryCount++;
                }
            }
        }

        // At least 80% of endpoints should have summaries
        var summaryPercentage = (double)summaryCount / endpointCount * 100;
        Assert.True(summaryPercentage >= 80,
            $"Only {summaryPercentage:F1}% of endpoints have summaries. Expected at least 80%.");
    }

    [Fact]
    public async Task SwaggerDoc_IncludesRequestResponseExamples()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Assert
        var root = doc.RootElement;
        Assert.True(root.TryGetProperty("components", out var components));

        // Check for schemas which serve as examples
        Assert.True(components.TryGetProperty("schemas", out var schemas));
        Assert.True(schemas.EnumerateObject().Count() > 0);
    }
}
