using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

public class MetNoWeatherServiceTests
{
    private readonly Mock<ILogger<MetNoWeatherService>> _mockLogger;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<HttpMessageHandler> _mockHttpMessageHandler;

    public MetNoWeatherServiceTests()
    {
        _mockLogger = new Mock<ILogger<MetNoWeatherService>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockHttpMessageHandler = new Mock<HttpMessageHandler>();
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_ReturnsWeatherSlice_WhenApiReturnsData()
    {
        // Arrange
        var mockResponse = new
        {
            properties = new
            {
                timeseries = new[]
                {
                    new
                    {
                        time = DateTime.UtcNow,
                        data = new
                        {
                            instant = new
                            {
                                details = new
                                {
                                    air_temperature = 15.5,
                                    cloud_area_fraction = 45.0,
                                    fog_area_fraction = (double?)null
                                }
                            },
                            next_1_hours = new
                            {
                                details = new
                                {
                                    precipitation_amount = 0.0
                                }
                            }
                        }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(mockResponse);
        var httpResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(httpResponse);

        var httpClient = new HttpClient(_mockHttpMessageHandler.Object)
        {
            BaseAddress = new Uri("https://api.met.no/")
        };

        _mockHttpClientFactory.Setup(f => f.CreateClient("MetNo")).Returns(httpClient);

        var service = new MetNoWeatherService(_mockHttpClientFactory.Object, _mockLogger.Object);

        // Act
        var result = await service.GetCurrentWeatherAsync(57.7089, 11.9746);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("met.no", result.Source);
        Assert.Equal(15.5, result.Temperature);
        Assert.Equal(45.0, result.CloudCover);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_ReturnsNull_WhenApiReturnsError()
    {
        // Arrange
        var httpResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.InternalServerError
        };

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(httpResponse);

        var httpClient = new HttpClient(_mockHttpMessageHandler.Object);

        _mockHttpClientFactory.Setup(f => f.CreateClient("MetNo")).Returns(httpClient);

        var service = new MetNoWeatherService(_mockHttpClientFactory.Object, _mockLogger.Object);

        // Act
        var result = await service.GetCurrentWeatherAsync(57.7089, 11.9746);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetForecastAsync_ReturnsForecastList_WhenApiReturnsData()
    {
        // Arrange
        var mockResponse = new
        {
            properties = new
            {
                timeseries = new[]
                {
                    new
                    {
                        time = DateTime.UtcNow.AddHours(1),
                        data = new
                        {
                            instant = new
                            {
                                details = new
                                {
                                    air_temperature = 14.0,
                                    cloud_area_fraction = 30.0,
                                    fog_area_fraction = (double?)null
                                }
                            },
                            next_1_hours = new
                            {
                                details = new
                                {
                                    precipitation_amount = 0.2
                                }
                            }
                        }
                    },
                    new
                    {
                        time = DateTime.UtcNow.AddHours(2),
                        data = new
                        {
                            instant = new
                            {
                                details = new
                                {
                                    air_temperature = 13.5,
                                    cloud_area_fraction = 50.0,
                                    fog_area_fraction = (double?)null
                                }
                            },
                            next_1_hours = new
                            {
                                details = new
                                {
                                    precipitation_amount = 0.5
                                }
                            }
                        }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(mockResponse);
        var httpResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(httpResponse);

        var httpClient = new HttpClient(_mockHttpMessageHandler.Object);

        _mockHttpClientFactory.Setup(f => f.CreateClient("MetNo")).Returns(httpClient);

        var service = new MetNoWeatherService(_mockHttpClientFactory.Object, _mockLogger.Object);

        // Act
        var result = await service.GetForecastAsync(57.7089, 11.9746);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.All(result, item => Assert.Equal("met.no", item.Source));
        Assert.True(result[0].IsForecast);
    }

    [Fact]
    public async Task IsAvailableAsync_ReturnsTrue_WhenApiIsAccessible()
    {
        // Arrange
        var mockResponse = new
        {
            properties = new
            {
                timeseries = Array.Empty<object>()
            }
        };

        var json = JsonSerializer.Serialize(mockResponse);
        var httpResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(httpResponse);

        var httpClient = new HttpClient(_mockHttpMessageHandler.Object);

        _mockHttpClientFactory.Setup(f => f.CreateClient("MetNo")).Returns(httpClient);

        var service = new MetNoWeatherService(_mockHttpClientFactory.Object, _mockLogger.Object);

        // Act
        var result = await service.IsAvailableAsync();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void SourceName_ReturnsMetNoSourceIdentifier()
    {
        // Arrange
        var httpClient = new HttpClient(_mockHttpMessageHandler.Object);
        _mockHttpClientFactory.Setup(f => f.CreateClient("MetNo")).Returns(httpClient);
        var service = new MetNoWeatherService(_mockHttpClientFactory.Object, _mockLogger.Object);

        // Act
        var sourceName = service.SourceName;

        // Assert
        Assert.Equal("met.no", sourceName);
    }
}
