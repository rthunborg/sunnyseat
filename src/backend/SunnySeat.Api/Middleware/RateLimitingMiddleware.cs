using Microsoft.Extensions.Caching.Memory;
using System.Net;

namespace SunnySeat.Api.Middleware;

/// <summary>
/// Simple rate limiting middleware to prevent abuse of authentication endpoints
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    
    // Rate limit configuration
    private const int GeneralRequestsPerMinute = 100;
    private const int AuthRequestsPerMinute = 10;
    private const int WindowSizeMinutes = 1;

    public RateLimitingMiddleware(
        RequestDelegate next, 
        IMemoryCache memoryCache, 
        ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = GetClientId(context);
        var isAuthEndpoint = IsAuthenticationEndpoint(context.Request.Path);
        
        var requestLimit = isAuthEndpoint ? AuthRequestsPerMinute : GeneralRequestsPerMinute;
        
        if (!IsRequestAllowed(clientId, requestLimit, isAuthEndpoint))
        {
            _logger.LogWarning("Rate limit exceeded for client {ClientId} on {Path}", 
                clientId, context.Request.Path);
                
            await HandleRateLimitExceeded(context, isAuthEndpoint);
            return;
        }

        await _next(context);
    }

    private string GetClientId(HttpContext context)
    {
        // Use IP address as client identifier
        var ipAddress = context.Connection.RemoteIpAddress?.ToString();
        
        // Check for forwarded IP (behind proxy/load balancer)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            ipAddress = forwardedFor.Split(',').FirstOrDefault()?.Trim();
        }

        return ipAddress ?? "unknown";
    }

    private bool IsAuthenticationEndpoint(PathString path)
    {
        return path.StartsWithSegments("/api/auth");
    }

    private bool IsRequestAllowed(string clientId, int requestLimit, bool isAuthEndpoint)
    {
        var cacheKey = $"rate_limit_{(isAuthEndpoint ? "auth" : "general")}_{clientId}";
        var windowStart = DateTime.UtcNow.Truncate(TimeSpan.FromMinutes(WindowSizeMinutes));
        var fullCacheKey = $"{cacheKey}_{windowStart:yyyyMMddHHmm}";

        var requestCount = _memoryCache.GetOrCreate(fullCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(WindowSizeMinutes + 1);
            return 0;
        });

        requestCount++;
        _memoryCache.Set(fullCacheKey, requestCount);

        return requestCount <= requestLimit;
    }

    private async Task HandleRateLimitExceeded(HttpContext context, bool isAuthEndpoint)
    {
        context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
        context.Response.Headers.Append("Retry-After", "60"); // Retry after 60 seconds

        var response = new
        {
            error = "Rate limit exceeded",
            code = "RATE_LIMIT_EXCEEDED",
            message = isAuthEndpoint 
                ? $"Too many authentication attempts. Maximum {AuthRequestsPerMinute} requests per minute allowed."
                : $"Too many requests. Maximum {GeneralRequestsPerMinute} requests per minute allowed.",
            retryAfter = 60
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}

/// <summary>
/// Extension method to truncate DateTime to specified precision
/// </summary>
public static class DateTimeExtensions
{
    public static DateTime Truncate(this DateTime dateTime, TimeSpan timeSpan)
    {
        if (timeSpan == TimeSpan.Zero) return dateTime;
        return dateTime.AddTicks(-(dateTime.Ticks % timeSpan.Ticks));
    }
}