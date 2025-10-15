namespace SunnySeat.Api.Middleware;

/// <summary>
/// Middleware to add security headers to all HTTP responses
/// Story 4.6: API Hardening - Security headers implementation
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;

    public SecurityHeadersMiddleware(RequestDelegate next, ILogger<SecurityHeadersMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers to all responses
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // Content Security Policy - Allow MapTiler for map tiles
        context.Response.Headers.Append("Content-Security-Policy",
            "default-src 'self'; " +
            "img-src 'self' https://api.maptiler.com https://*.maptiler.com; " +
            "style-src 'self' 'unsafe-inline'; " +
            "script-src 'self'; " +
            "connect-src 'self' https://api.maptiler.com https://*.maptiler.com");

        // HSTS (HTTP Strict Transport Security) - only for HTTPS
        if (context.Request.IsHttps)
        {
            context.Response.Headers.Append("Strict-Transport-Security",
                "max-age=31536000; includeSubDomains");
        }

        await _next(context);
    }
}
